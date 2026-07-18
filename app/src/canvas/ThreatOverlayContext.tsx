import { createContext, useContext } from 'react'
import type { Threat } from '../types/project'

interface ThreatOverlayValue {
  threatsByTarget: Map<string, Threat[]>
  /** target id -> DREAD risk-level color, only populated when the "DREAD risk
   *  coloring" overlay layer is on and the project has DREAD enabled. */
  riskColorByTarget: Map<string, string>
  onViewThreat: (id: string) => void
}

const EMPTY: ThreatOverlayValue = { threatsByTarget: new Map(), riskColorByTarget: new Map(), onViewThreat: () => {} }

export const ThreatOverlayContext = createContext<ThreatOverlayValue>(EMPTY)

export function useThreatOverlay(targetId: string) {
  const { threatsByTarget, riskColorByTarget, onViewThreat } = useContext(ThreatOverlayContext)
  return { threats: threatsByTarget.get(targetId) ?? [], riskColor: riskColorByTarget.get(targetId), onViewThreat }
}
