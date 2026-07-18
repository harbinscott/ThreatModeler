import { createContext, useContext } from 'react'
import type { Threat } from '../types/project'

interface ThreatOverlayValue {
  threatsByTarget: Map<string, Threat[]>
  onViewThreat: (id: string) => void
}

const EMPTY: ThreatOverlayValue = { threatsByTarget: new Map(), onViewThreat: () => {} }

export const ThreatOverlayContext = createContext<ThreatOverlayValue>(EMPTY)

export function useThreatOverlay(targetId: string) {
  const { threatsByTarget, onViewThreat } = useContext(ThreatOverlayContext)
  return { threats: threatsByTarget.get(targetId) ?? [], onViewThreat }
}
