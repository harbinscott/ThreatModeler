import * as dagre from 'dagre'
import { innermostBoundary } from './boundaryGeometry'
import type { Diagram, DiagramNode } from '../types/project'

const NODE_WIDTH_FALLBACK = 150
const NODE_HEIGHT_FALLBACK = 50
const BOUNDARY_PADDING = 50

/** Reflows a diagram's non-boundary nodes into a top-to-bottom layered
 *  layout via dagre, based on the flow edges between them.
 *
 *  Trust boundaries are containers, not flow participants — dagre lays out
 *  by edge connectivity, and boundaries have none — so they're handled as
 *  dagre *compound* (cluster) parents instead of ordinary laid-out nodes: a
 *  node's innermost containing boundary (same helper `ruleEngine.ts` uses
 *  for crossing detection) becomes its dagre parent, and dagre grows the
 *  boundary's own bounding box to enclose whatever ends up inside it. That
 *  keeps zone membership intact after a reflow — a node never drifts
 *  outside the boundary it started in — rather than boundaries staying at
 *  their old position/size while their contents move out from under them.
 *  A node with no containing boundary is laid out as an ordinary top-level
 *  node alongside the (also top-level) boundary clusters.
 *
 *  Returns a *new* nodes array with updated positions (and, for boundaries,
 *  size) — doesn't mutate the input, and doesn't touch edges at all
 *  (floating edges recompute their own geometry from node positions on
 *  every render, see FloatingEdge.tsx). */
export function autoLayoutDiagram(diagram: Diagram): DiagramNode[] {
  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')
  const regular = diagram.nodes.filter((n) => n.data.elementType !== 'trust-boundary')
  if (regular.length === 0) return diagram.nodes

  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  // Cluster placeholders — no width/height set, so dagre computes each
  // boundary's size from its children rather than treating it as a
  // fixed-size node to be laid out itself.
  for (const b of boundaries) g.setNode(b.id, {})

  for (const n of regular) {
    g.setNode(n.id, { width: n.measured?.width ?? NODE_WIDTH_FALLBACK, height: n.measured?.height ?? NODE_HEIGHT_FALLBACK })
    const parent = innermostBoundary(n, boundaries)
    if (parent) g.setParent(n.id, parent.id)
  }

  for (const e of diagram.edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  return diagram.nodes.map((n) => {
    const laidOut = g.node(n.id)
    if (!laidOut) return n
    if (n.data.elementType === 'trust-boundary') {
      return {
        ...n,
        position: { x: laidOut.x - laidOut.width / 2 - BOUNDARY_PADDING / 2, y: laidOut.y - laidOut.height / 2 - BOUNDARY_PADDING / 2 },
        style: { ...n.style, width: laidOut.width + BOUNDARY_PADDING, height: laidOut.height + BOUNDARY_PADDING },
      }
    }
    return { ...n, position: { x: laidOut.x - laidOut.width / 2, y: laidOut.y - laidOut.height / 2 } }
  })
}
