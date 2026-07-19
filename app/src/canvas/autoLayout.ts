import * as dagre from 'dagre'
import { innermostBoundary } from './boundaryGeometry'
import type { Diagram, DiagramNode } from '../types/project'

const NODE_WIDTH_FALLBACK = 150
const NODE_HEIGHT_FALLBACK = 50
const BOUNDARY_PADDING = 50

interface Point {
  x: number
  y: number
}

interface MicroLayout {
  /** Each member's position relative to the micro layout's own bounding
   *  box, i.e. the minimum is (0, 0) — not yet placed in diagram space. */
  positions: Map<string, Point>
  width: number
  height: number
}

/** Reflows a diagram's non-boundary nodes into a top-to-bottom layered
 *  layout via dagre, based on the flow edges between them, while keeping
 *  every node inside the trust boundary it started in.
 *
 *  **This deliberately does not use dagre's compound/cluster feature**
 *  (`{ compound: true }` + `setParent()`) to model boundaries — a real bug
 *  found live: when a boundary's member has an edge to a node *outside*
 *  its cluster (a boundary-crossing flow — common in this app's diagrams),
 *  dagre can lay that member out away from its clusterhood entirely, not
 *  just report an inconsistent cluster box. `setParent()` is a ranking
 *  hint to dagre, not a hard containment guarantee, and a first attempt at
 *  fixing this by only trusting dagre's compound feature for ranking (and
 *  computing the boundary's box from members' actual final positions)
 *  still failed for the same reason: the members themselves had already
 *  been pulled out.
 *
 *  Instead this runs a **two-level layout** where containment is
 *  structural rather than something dagre has to honor:
 *
 *  1. For each boundary, lay out its members in isolation (their own
 *     dagre pass, using only edges *between* those members) — a
 *     cross-boundary edge can't pull a node anywhere, because the nodes on
 *     the other end of it aren't even in that graph.
 *  2. Lay out a "macro" graph where each boundary is a single opaque node
 *     sized to fit its micro layout, alongside any regular nodes with no
 *     boundary, connected by the original edges collapsed onto whichever
 *     boundary (or bare node) each endpoint belongs to.
 *  3. Place each boundary at its macro position, and each of its members
 *     at that boundary's top-left plus the member's micro-relative offset.
 *
 *  Returns a *new* nodes array with updated positions (and, for boundaries,
 *  size) — doesn't mutate the input, and doesn't touch edges at all
 *  (floating edges recompute their own geometry from node positions on
 *  every render, see FloatingEdge.tsx). */
export function autoLayoutDiagram(diagram: Diagram): DiagramNode[] {
  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')
  const regular = diagram.nodes.filter((n) => n.data.elementType !== 'trust-boundary')
  if (regular.length === 0) return diagram.nodes

  const parentOf = new Map<string, string>()
  for (const n of regular) {
    const parent = innermostBoundary(n, boundaries)
    if (parent) parentOf.set(n.id, parent.id)
  }

  const membersByBoundary = new Map<string, DiagramNode[]>()
  for (const n of regular) {
    const parentId = parentOf.get(n.id)
    if (!parentId) continue
    const members = membersByBoundary.get(parentId) ?? []
    members.push(n)
    membersByBoundary.set(parentId, members)
  }

  // Step 1: lay out each boundary's members in isolation.
  const microByBoundary = new Map<string, MicroLayout>()
  for (const [boundaryId, members] of membersByBoundary) {
    const memberIds = new Set(members.map((m) => m.id))

    const mg = new dagre.graphlib.Graph()
    mg.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90, marginx: 0, marginy: 0 })
    mg.setDefaultEdgeLabel(() => ({}))
    for (const m of members) {
      mg.setNode(m.id, { width: m.measured?.width ?? NODE_WIDTH_FALLBACK, height: m.measured?.height ?? NODE_HEIGHT_FALLBACK })
    }
    for (const e of diagram.edges) {
      if (memberIds.has(e.source) && memberIds.has(e.target)) mg.setEdge(e.source, e.target)
    }
    dagre.layout(mg)

    const rawRects = members.map((m) => {
      const laidOut = mg.node(m.id)
      return { id: m.id, x: laidOut.x - laidOut.width / 2, y: laidOut.y - laidOut.height / 2, width: laidOut.width, height: laidOut.height }
    })
    const minX = Math.min(...rawRects.map((r) => r.x))
    const minY = Math.min(...rawRects.map((r) => r.y))
    const maxX = Math.max(...rawRects.map((r) => r.x + r.width))
    const maxY = Math.max(...rawRects.map((r) => r.y + r.height))

    const positions = new Map<string, Point>()
    for (const r of rawRects) positions.set(r.id, { x: r.x - minX, y: r.y - minY })
    microByBoundary.set(boundaryId, { positions, width: maxX - minX, height: maxY - minY })
  }

  // Step 2: lay out the macro graph — boundaries (as opaque sized nodes)
  // and unboundaried regular nodes, connected by edges collapsed onto
  // whichever boundary (or bare node) each endpoint belongs to.
  const macroIdOf = (nodeId: string): string => parentOf.get(nodeId) ?? nodeId

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 110, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const [boundaryId, micro] of microByBoundary) {
    g.setNode(boundaryId, { width: micro.width + BOUNDARY_PADDING * 2, height: micro.height + BOUNDARY_PADDING * 2 })
  }
  for (const n of regular) {
    if (!parentOf.has(n.id)) {
      g.setNode(n.id, { width: n.measured?.width ?? NODE_WIDTH_FALLBACK, height: n.measured?.height ?? NODE_HEIGHT_FALLBACK })
    }
  }

  const macroEdgeSeen = new Set<string>()
  for (const e of diagram.edges) {
    const a = macroIdOf(e.source)
    const b = macroIdOf(e.target)
    if (a === b) continue // internal to a single boundary — already reflected in its micro layout
    if (!g.hasNode(a) || !g.hasNode(b)) continue
    const key = `${a}->${b}`
    if (macroEdgeSeen.has(key)) continue
    macroEdgeSeen.add(key)
    g.setEdge(a, b)
  }

  dagre.layout(g)

  // Step 3: place boundaries at their macro position, and each member at
  // that boundary's top-left plus its micro-relative offset.
  const regularPositions = new Map<string, Point>()
  const boundaryRects = new Map<string, { x: number; y: number; width: number; height: number }>()

  for (const [boundaryId, micro] of microByBoundary) {
    const laidOut = g.node(boundaryId)
    const x = laidOut.x - laidOut.width / 2
    const y = laidOut.y - laidOut.height / 2
    boundaryRects.set(boundaryId, { x, y, width: laidOut.width, height: laidOut.height })
    for (const [memberId, rel] of micro.positions) {
      regularPositions.set(memberId, { x: x + BOUNDARY_PADDING + rel.x, y: y + BOUNDARY_PADDING + rel.y })
    }
  }
  for (const n of regular) {
    if (parentOf.has(n.id)) continue
    const laidOut = g.node(n.id)
    if (!laidOut) continue
    regularPositions.set(n.id, { x: laidOut.x - laidOut.width / 2, y: laidOut.y - laidOut.height / 2 })
  }

  return diagram.nodes.map((n) => {
    if (n.data.elementType === 'trust-boundary') {
      const rect = boundaryRects.get(n.id)
      // A boundary with no direct regular-node members (empty, or only
      // containing other boundaries — nested boundaries aren't resized
      // transitively here) is left exactly as it was.
      if (!rect) return n
      // Once a boundary has been resized (by hand via NodeResizer, or by a
      // prior Tidy Up), XYFlow renders it from the node's top-level
      // `width`/`height` — `style.width/height` alone is ignored. Setting
      // only `style` here left the box rendering at its old size while
      // members were positioned for the new one, i.e. exactly the
      // orphaning bug this function exists to fix. `measured` is set too
      // so any containment check run before the next paint (this function
      // included, on repeated clicks) sees the true new size instead of a
      // stale one — `nodeRect()` in boundaryGeometry.ts prefers `measured`
      // over `style`.
      return {
        ...n,
        position: { x: rect.x, y: rect.y },
        width: rect.width,
        height: rect.height,
        measured: { width: rect.width, height: rect.height },
        style: { ...n.style, width: rect.width, height: rect.height },
      }
    }
    const pos = regularPositions.get(n.id)
    return pos ? { ...n, position: pos } : n
  })
}
