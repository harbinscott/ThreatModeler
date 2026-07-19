import { createContext, useContext } from 'react'
import type { ComplianceTag, PciScope, Threat } from '../types/project'

interface ThreatOverlayValue {
  threatsByTarget: Map<string, Threat[]>
  /** target id -> DREAD risk-level color, only populated when the "DREAD risk
   *  coloring" overlay layer is on and the project has DREAD enabled. */
  riskColorByTarget: Map<string, string>
  /** target id -> effective compliance tags (direct + propagated), only
   *  populated when the "Compliance tags" overlay layer is on. */
  complianceTagsByTarget: Map<string, Set<ComplianceTag>>
  /** target id -> effective PCI scope (Connected/CDE), same gating as
   *  complianceTagsByTarget. Only meaningful for targets whose tags include
   *  'PCI'. */
  pciScopeByTarget: Map<string, PciScope>
  /** Process-node id -> open threat count *inside its sub-diagram* (Release
   *  8) — only populated for Process nodes that own one. Deliberately kept
   *  separate from threatsByTarget, which stays scoped to the current
   *  level only; this is the one cross-level signal the "summary badge
   *  only, no rollup" scope decision allows. Presence of a key (not just a
   *  nonzero value) is what `useThreatOverlay`'s `hasSubDiagram` reads, so
   *  a sub-diagram with zero open threats still shows the badge. */
  subDiagramOpenThreatCountByTarget: Map<string, number>
  onViewThreat: (id: string) => void
  /** Drills into the given node's sub-diagram (creating one first if it
   *  doesn't have one yet) — same action as the Inspector's "Open
   *  sub-diagram" button, reachable from the canvas badge too. */
  onOpenSubDiagram: (id: string) => void
}

const EMPTY: ThreatOverlayValue = {
  threatsByTarget: new Map(),
  riskColorByTarget: new Map(),
  complianceTagsByTarget: new Map(),
  pciScopeByTarget: new Map(),
  subDiagramOpenThreatCountByTarget: new Map(),
  onViewThreat: () => {},
  onOpenSubDiagram: () => {},
}

export const ThreatOverlayContext = createContext<ThreatOverlayValue>(EMPTY)

export function useThreatOverlay(targetId: string) {
  const {
    threatsByTarget,
    riskColorByTarget,
    complianceTagsByTarget,
    pciScopeByTarget,
    subDiagramOpenThreatCountByTarget,
    onViewThreat,
    onOpenSubDiagram,
  } = useContext(ThreatOverlayContext)
  return {
    threats: threatsByTarget.get(targetId) ?? [],
    riskColor: riskColorByTarget.get(targetId),
    complianceTags: complianceTagsByTarget.get(targetId),
    pciScope: pciScopeByTarget.get(targetId),
    hasSubDiagram: subDiagramOpenThreatCountByTarget.has(targetId),
    subDiagramOpenThreatCount: subDiagramOpenThreatCountByTarget.get(targetId) ?? 0,
    onViewThreat,
    onOpenSubDiagram,
  }
}
