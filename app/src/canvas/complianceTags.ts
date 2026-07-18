import type { ComplianceTag, Diagram, DiagramEdgeData, DiagramNodeData, PciScope } from '../types/project'
import { innermostBoundary } from './boundaryGeometry'

/** Same-zone lookup shared by both propagation functions below — two
 *  elements are in the same zone if they resolve to the same innermost
 *  trust boundary, or both resolve to none. */
function makeZoneResolver(diagram: Diagram) {
  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')
  const nodesById = new Map(diagram.nodes.map((n) => [n.id, n]))
  return function zoneOf(id: string): string | undefined {
    const node = nodesById.get(id)
    if (!node) return undefined
    return innermostBoundary(node, boundaries)?.id ?? '__unzoned__'
  }
}

export const COMPLIANCE_TAGS: ComplianceTag[] = ['PII', 'PHI', 'PCI', 'GDPR', 'SOX', 'SOC2', 'CMMC']

/** PCI is handled via `pciScope` (a select, not a checkbox) since it has a
 *  meaningful sub-classification — see `PciScope` in types/project.ts. */
export const CHECKBOX_COMPLIANCE_TAGS = COMPLIANCE_TAGS.filter((t) => t !== 'PCI')

export const COMPLIANCE_TAG_LABELS: Record<ComplianceTag, string> = {
  PII: 'PII — Personally Identifiable Information',
  PHI: 'PHI — Protected Health Information (HIPAA)',
  PCI: 'PCI — Cardholder Data (PCI DSS)',
  GDPR: 'GDPR — EU Personal Data',
  SOX: 'SOX — Financial Reporting (Sarbanes-Oxley)',
  SOC2: 'SOC 2 — Trust Services Scope',
  CMMC: 'CMMC — Controlled Unclassified Information (DoD)',
}

export const COMPLIANCE_TAG_COLOR: Record<ComplianceTag, string> = {
  PII: '#38bdf8',
  PHI: '#22d3ee',
  PCI: '#f87171',
  GDPR: '#a78bfa',
  SOX: '#facc15',
  SOC2: '#4ade80',
  CMMC: '#fb923c',
}

function directTags(data: DiagramNodeData | DiagramEdgeData): ComplianceTag[] {
  const tags = new Set(data.complianceTags ?? [])
  if (data.pciScope) tags.add('PCI')
  return [...tags]
}

/** Computes, for every non-boundary node, the full set of compliance tags
 *  it carries — either directly assigned (Data Store nodes, Data Flow
 *  edges) or inherited from a tagged element it's connected to. Propagation
 *  is a same-zone flood-fill: a tag spreads along a flow only when both
 *  ends sit in the same trust boundary (or both are outside any boundary)
 *  — crossing into a different zone stops it, matching how PCI/compliance
 *  scope is reasoned about in practice (a properly segmented boundary ends
 *  the in-scope designation). Recomputed on every diagram change rather
 *  than persisted — same pattern as the DREAD risk-coloring overlay's
 *  `riskColorByTarget`. */
export function computeEffectiveComplianceTags(diagram: Diagram): Map<string, Set<ComplianceTag>> {
  const tagsByNode = new Map<string, Set<ComplianceTag>>()

  for (const node of diagram.nodes) {
    if (node.data.elementType === 'trust-boundary') continue
    tagsByNode.set(node.id, new Set(directTags(node.data)))
  }

  // A tagged flow touches both of its endpoints directly, regardless of zone.
  for (const edge of diagram.edges) {
    const edgeTags = directTags(edge.data ?? {})
    if (edgeTags.length === 0) continue
    for (const id of [edge.source, edge.target]) {
      const set = tagsByNode.get(id)
      if (set) for (const t of edgeTags) set.add(t)
    }
  }

  const zoneOf = makeZoneResolver(diagram)

  // Flood-fill to a fixed point across same-zone connected edges. Diagrams
  // here are small (dozens of nodes, not thousands), so a bounded number of
  // full passes is simpler and plenty fast — no need for a proper worklist.
  let changed = true
  let guard = 0
  while (changed && guard < 50) {
    changed = false
    guard++
    for (const edge of diagram.edges) {
      const sourceSet = tagsByNode.get(edge.source)
      const targetSet = tagsByNode.get(edge.target)
      if (!sourceSet || !targetSet) continue
      if (zoneOf(edge.source) !== zoneOf(edge.target)) continue
      for (const t of sourceSet) {
        if (!targetSet.has(t)) {
          targetSet.add(t)
          changed = true
        }
      }
      for (const t of targetSet) {
        if (!sourceSet.has(t)) {
          sourceSet.add(t)
          changed = true
        }
      }
    }
  }

  return tagsByNode
}

/** PCI's sub-classification (Connected vs. CDE) needs its own propagation
 *  rule, separate from the generic tag flood-fill above: only an element
 *  directly marked CDE (actually stores/processes/transmits cardholder
 *  data) stays CDE. Anything merely reachable from it within the same zone
 *  becomes "Connected" — a real, lesser scope tier — never upgraded back to
 *  CDE by proximity. This mirrors how PCI segmentation/CDE scoping actually
 *  works in practice, and keeps the distinction meaningful instead of every
 *  touching element silently reading as full CDE scope. */
export function computeEffectivePciScope(diagram: Diagram): Map<string, PciScope> {
  const scopeByNode = new Map<string, PciScope>()

  for (const node of diagram.nodes) {
    if (node.data.elementType === 'trust-boundary') continue
    if (node.data.pciScope) scopeByNode.set(node.id, node.data.pciScope)
  }
  for (const edge of diagram.edges) {
    if (!edge.data?.pciScope) continue
    for (const id of [edge.source, edge.target]) {
      if (scopeByNode.get(id) !== 'CDE') scopeByNode.set(id, edge.data.pciScope)
    }
  }

  const zoneOf = makeZoneResolver(diagram)

  let changed = true
  let guard = 0
  while (changed && guard < 50) {
    changed = false
    guard++
    for (const edge of diagram.edges) {
      if (zoneOf(edge.source) !== zoneOf(edge.target)) continue
      const sourceScope = scopeByNode.get(edge.source)
      const targetScope = scopeByNode.get(edge.target)
      if (sourceScope && !targetScope) {
        scopeByNode.set(edge.target, 'Connected')
        changed = true
      }
      if (targetScope && !sourceScope) {
        scopeByNode.set(edge.source, 'Connected')
        changed = true
      }
    }
  }

  return scopeByNode
}
