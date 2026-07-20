import type { Diagram, DiagramNode, ElementType } from '../types/project'
import { computeEffectiveComplianceTags } from '../canvas/complianceTags'

/** One stop along a computed path — the node itself, plus the edge used to
 *  reach it from the previous hop (undefined on the first hop, the entry
 *  point itself has nothing "before" it). */
export interface AttackPathHop {
  nodeId: string
  label: string
  elementType: ElementType
  edgeId?: string
}

export interface SensitiveTarget {
  nodeId: string
  label: string
  /** Human-readable reasons this node was flagged, e.g. "Crown jewel asset"
   *  or "Compliance scope: PCI, PHI" — a node can have both. */
  reasons: string[]
}

export interface EntryPoint {
  nodeId: string
  label: string
  /** True when the entity's MS-TMT `authenticated` attribute is explicitly
   *  false — not a filter, just a signal surfaced in the UI for "which
   *  entry points are the obvious ones to worry about first." */
  unauthenticated: boolean
}

export interface AttackPathResult {
  targetId: string
  targetLabel: string
  reasons: string[]
  /** Shortest path from *any* External Entity, mitigation nodes allowed as
   *  pass-through stops — null when the target isn't reachable from any
   *  entry point at all. */
  bestPath: AttackPathHop[] | null
  bestPathSourceLabel: string | null
  /** Shortest path that never passes through a mitigation node — the
   *  headline "can an attacker get here without crossing a single control"
   *  signal. Null either because none exists (every route is mitigated,
   *  the good outcome) or because the target isn't reachable at all — check
   *  `bestPath` to tell those two cases apart. */
  unmitigatedPath: AttackPathHop[] | null
  unmitigatedPathSourceLabel: string | null
}

/** Assets worth asking "can an attacker reach this" about — crown-jewel
 *  Process/Data Store nodes (Release 12 stage A), and Data Store nodes with
 *  directly-assigned compliance scope. Deliberately not extended to
 *  *propagated* compliance scope on Process nodes — the roadmap scoped this
 *  as "sensitive Data Store," and a node that merely talks to a tagged store
 *  is a step on the path, not the destination itself. */
export function sensitiveTargets(diagram: Diagram): SensitiveTarget[] {
  const complianceByNode = computeEffectiveComplianceTags(diagram)
  const results: SensitiveTarget[] = []
  for (const n of diagram.nodes) {
    if (n.data.elementType !== 'process' && n.data.elementType !== 'data-store') continue
    const reasons: string[] = []
    if (n.data.crownJewel) reasons.push('Crown jewel asset')
    if (n.data.elementType === 'data-store' && (n.data.complianceTags?.length ?? 0) > 0) {
      const tags = complianceByNode.get(n.id)
      if (tags && tags.size > 0) reasons.push(`Compliance scope: ${[...tags].sort().join(', ')}`)
    }
    if (reasons.length > 0) results.push({ nodeId: n.id, label: n.data.label, reasons })
  }
  return results
}

/** Every External Entity is a potential attacker foothold — this app has no
 *  concept of "trusted" vs "untrusted" external actors beyond the
 *  authenticated flag, so all of them are candidate starting points rather
 *  than a filtered subset. */
export function attackerEntryPoints(diagram: Diagram): EntryPoint[] {
  return diagram.nodes
    .filter((n) => n.data.elementType === 'external-entity')
    .map((n) => ({ nodeId: n.id, label: n.data.label, unauthenticated: n.data.attributes?.authenticated === false }))
}

function buildAdjacency(diagram: Diagram): Map<string, { edgeId: string; targetId: string }[]> {
  const adjacency = new Map<string, { edgeId: string; targetId: string }[]>()
  for (const e of diagram.edges) {
    const list = adjacency.get(e.source) ?? []
    list.push({ edgeId: e.id, targetId: e.target })
    adjacency.set(e.source, list)
  }
  return adjacency
}

/** Plain BFS for fewest-hops (not weighted — this app has no per-flow "cost"
 *  concept to weight by), optionally excluding mitigation nodes entirely
 *  from the search so the result, if any, is guaranteed to never cross one.
 *  Follows edges in their declared direction only — data flow direction is
 *  the closest proxy this app has for "which way an attacker can actually
 *  move," same directional assumption STRIDE's boundary-crossing check
 *  already makes. */
function bfsShortestPath(
  nodesById: Map<string, DiagramNode>,
  adjacency: Map<string, { edgeId: string; targetId: string }[]>,
  sourceId: string,
  targetId: string,
  avoidMitigations: boolean
): AttackPathHop[] | null {
  if (sourceId === targetId) return null
  const prev = new Map<string, { prevId: string; edgeId: string }>()
  const visited = new Set<string>([sourceId])
  const queue: string[] = [sourceId]
  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    if (current === targetId) break
    for (const { edgeId, targetId: nextId } of adjacency.get(current) ?? []) {
      if (visited.has(nextId)) continue
      const nextNode = nodesById.get(nextId)
      if (!nextNode) continue
      if (avoidMitigations && nextNode.data.elementType === 'mitigation') continue
      visited.add(nextId)
      prev.set(nextId, { prevId: current, edgeId })
      queue.push(nextId)
    }
  }
  if (!visited.has(targetId)) return null

  const hops: AttackPathHop[] = []
  let curId = targetId
  for (;;) {
    const node = nodesById.get(curId)
    if (!node) return null
    const link = prev.get(curId)
    hops.unshift({ nodeId: curId, label: node.data.label, elementType: node.data.elementType, edgeId: link?.edgeId })
    if (!link) break
    curId = link.prevId
  }
  return hops
}

/** For every sensitive target, the shortest reachable path from any
 *  External Entity (mitigations allowed as pass-through) and, separately,
 *  the shortest path that skips every mitigation entirely. Small diagrams
 *  (dozens of nodes, not thousands) — a full BFS per (entry point, target)
 *  pair is simpler than anything cleverer and plenty fast, same call
 *  `complianceTags.ts`'s flood-fill already makes. */
export function computeAttackPaths(diagram: Diagram): AttackPathResult[] {
  const targets = sensitiveTargets(diagram)
  const entryPoints = attackerEntryPoints(diagram)
  const nodesById = new Map(diagram.nodes.map((n) => [n.id, n]))
  const adjacency = buildAdjacency(diagram)

  return targets.map((target) => {
    let bestPath: AttackPathHop[] | null = null
    let bestPathSourceLabel: string | null = null
    let unmitigatedPath: AttackPathHop[] | null = null
    let unmitigatedPathSourceLabel: string | null = null

    for (const entry of entryPoints) {
      const path = bfsShortestPath(nodesById, adjacency, entry.nodeId, target.nodeId, false)
      if (path && (!bestPath || path.length < bestPath.length)) {
        bestPath = path
        bestPathSourceLabel = entry.label
      }
      const clean = bfsShortestPath(nodesById, adjacency, entry.nodeId, target.nodeId, true)
      if (clean && (!unmitigatedPath || clean.length < unmitigatedPath.length)) {
        unmitigatedPath = clean
        unmitigatedPathSourceLabel = entry.label
      }
    }

    return {
      targetId: target.nodeId,
      targetLabel: target.label,
      reasons: target.reasons,
      bestPath,
      bestPathSourceLabel,
      unmitigatedPath,
      unmitigatedPathSourceLabel,
    }
  })
}
