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
  onViewThreat: (id: string) => void
}

const EMPTY: ThreatOverlayValue = {
  threatsByTarget: new Map(),
  riskColorByTarget: new Map(),
  complianceTagsByTarget: new Map(),
  pciScopeByTarget: new Map(),
  onViewThreat: () => {},
}

export const ThreatOverlayContext = createContext<ThreatOverlayValue>(EMPTY)

export function useThreatOverlay(targetId: string) {
  const { threatsByTarget, riskColorByTarget, complianceTagsByTarget, pciScopeByTarget, onViewThreat } =
    useContext(ThreatOverlayContext)
  return {
    threats: threatsByTarget.get(targetId) ?? [],
    riskColor: riskColorByTarget.get(targetId),
    complianceTags: complianceTagsByTarget.get(targetId),
    pciScope: pciScopeByTarget.get(targetId),
    onViewThreat,
  }
}
