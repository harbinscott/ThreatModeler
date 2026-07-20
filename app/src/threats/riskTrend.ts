import type { ProjectRevision, Threat } from '../types/project'
import { dreadAverage, dreadRiskLevel, type DreadRiskLevel } from './dreadEngine'

export interface RiskTrendPoint {
  /** null for the live "Current" point (the in-progress editor state, not
   *  yet saved as a revision) — every other point is a real save timestamp. */
  savedAt: string | null
  label: string
  openCount: number
  byRisk: Record<DreadRiskLevel, number>
}

function pointFrom(savedAt: string | null, threats: Threat[]): RiskTrendPoint {
  const open = threats.filter((t) => t.status === 'open')
  const byRisk: Record<DreadRiskLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
  for (const t of open) {
    const avg = dreadAverage(t.dread)
    if (avg === null) continue
    byRisk[dreadRiskLevel(avg)]++
  }
  return {
    savedAt,
    label: savedAt ? new Date(savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Current',
    openCount: open.length,
    byRisk,
  }
}

/** Release 13 stage H — turns `Project.revisionHistory` (capped to the last
 *  `MAX_REVISIONS` saves, see Canvas.tsx) into a chronological open-threats
 *  trend, oldest first, with the live in-progress editor state appended as
 *  a final "Current" point so the chart reflects unsaved changes too, not
 *  just what's already been saved. Each historical point reads only its
 *  revision's *top-level* `snapshot.threats` — sub-diagram threats are
 *  deliberately not rolled in, same "no rollup" rule every other
 *  diagram-graph analysis in this app already follows (Attack Paths,
 *  Compliance view, PDF export) — a trend that silently mixed levels
 *  together would be misleading, not just incomplete. */
export function computeRiskTrend(revisionHistory: ProjectRevision[], currentThreats: Threat[]): RiskTrendPoint[] {
  const historical = [...revisionHistory].reverse().map((r) => pointFrom(r.savedAt, r.snapshot.threats))
  return [...historical, pointFrom(null, currentThreats)]
}
