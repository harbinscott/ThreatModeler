import { Modal } from './Modal'
import type { ProjectRevision, Threat } from '../types/project'
import { computeRiskTrend } from '../threats/riskTrend'
import { DREAD_RISK_COLOR, type DreadRiskLevel } from '../threats/dreadEngine'
import './RiskTrendDialog.css'

interface RiskTrendDialogProps {
  revisionHistory: ProjectRevision[]
  currentThreats: Threat[]
  onClose: () => void
}

const RISK_STACK_ORDER: DreadRiskLevel[] = ['Low', 'Medium', 'High', 'Critical']
const CHART_HEIGHT = 200
const BAR_WIDTH = 32

/** Release 13 stage H — a hand-rolled SVG stacked bar chart (no charting
 *  dependency; every other custom visualization in this app — Attack
 *  Paths, Compliance view — is plain SVG/DOM too) showing open threat
 *  count by DREAD risk level across the project's save history, plus the
 *  live unsaved state as a final "Current" bar. Only meaningful once a
 *  project has a few saves under its belt — see the empty state below. */
export function RiskTrendDialog({ revisionHistory, currentThreats, onClose }: RiskTrendDialogProps) {
  const points = computeRiskTrend(revisionHistory, currentThreats)
  const maxOpen = Math.max(1, ...points.map((p) => p.openCount))
  const hasHistory = points.length > 1

  return (
    <Modal title="Risk Trend" onClose={onClose} width={Math.max(420, points.length * (BAR_WIDTH + 20) + 80)}>
      {!hasHistory ? (
        <p className="modal-message__empty">
          Not enough save history yet — this fills in as you make more saves. Each save's open-threat count (by DREAD
          risk level) becomes a point on the chart.
        </p>
      ) : (
        <>
          <div className="risk-trend__legend">
            {RISK_STACK_ORDER.map((level) => (
              <span key={level} className="risk-trend__legend-item">
                <span className="risk-trend__legend-swatch" style={{ background: DREAD_RISK_COLOR[level] }} />
                {level}
              </span>
            ))}
          </div>
          <svg
            className="risk-trend__chart"
            viewBox={`0 0 ${points.length * (BAR_WIDTH + 20)} ${CHART_HEIGHT + 40}`}
            width="100%"
          >
            {points.map((p, i) => {
              const x = i * (BAR_WIDTH + 20) + 10
              let yCursor = CHART_HEIGHT
              const segments = RISK_STACK_ORDER.map((level) => {
                const count = p.byRisk[level]
                const h = (count / maxOpen) * CHART_HEIGHT
                const y = yCursor - h
                yCursor = y
                return { level, count, y, h }
              })
              return (
                <g key={p.savedAt ?? 'current'}>
                  {segments.map(
                    (s) =>
                      s.h > 0 && (
                        <rect key={s.level} x={x} y={s.y} width={BAR_WIDTH} height={s.h} fill={DREAD_RISK_COLOR[s.level]} />
                      )
                  )}
                  {p.openCount === 0 && <rect x={x} y={CHART_HEIGHT - 2} width={BAR_WIDTH} height={2} fill="var(--border)" />}
                  <text x={x + BAR_WIDTH / 2} y={Math.max(12, yCursor - 6)} textAnchor="middle" className="risk-trend__bar-count">
                    {p.openCount > 0 ? p.openCount : ''}
                  </text>
                  <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT + 18} textAnchor="middle" className="risk-trend__bar-label">
                    {p.label}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="risk-trend__hint">Open threats by DREAD risk level, oldest save to now. Undreaded open threats aren't counted.</p>
        </>
      )}
    </Modal>
  )
}
