import { useMemo, useState } from 'react'
import type { Diagram, Threat } from '../types/project'
import { computeAttackPaths, type AttackPathHop, type AttackPathResult } from './attackPath'
import { SHAPE_ICONS, SHAPE_LABELS } from '../canvas/shapeMeta'
import { DREAD_RISK_COLOR } from '../threats/dreadEngine'
import './AttackPathPanel.css'

interface AttackPathPanelProps {
  diagram: Diagram
  threats: Threat[]
  /** Selects the node on the Diagram tab and switches to it — same "jump
   *  from an analysis view back to the canvas" pattern the Threats tab's
   *  badge popovers already use (onViewThreat/onOpenSubDiagram). */
  onViewInDiagram: (nodeId: string) => void
}

type Status = 'exposed' | 'protected' | 'unreachable'

function statusOf(result: AttackPathResult): Status {
  if (result.unmitigatedPath) return 'exposed'
  if (result.bestPath) return 'protected'
  return 'unreachable'
}

const STATUS_LABEL: Record<Status, string> = {
  exposed: 'Exposed',
  protected: 'Protected',
  unreachable: 'Unreachable',
}

const STATUS_COLOR: Record<Status, string> = {
  exposed: DREAD_RISK_COLOR.Critical,
  protected: DREAD_RISK_COLOR.Low,
  unreachable: '#6b7280',
}

const STATUS_ORDER: Record<Status, number> = { exposed: 0, protected: 1, unreachable: 2 }

/** Release 12 stage C — for every crown-jewel/compliance-scoped asset in the
 *  current diagram level, shows whether an attacker starting from an
 *  External Entity can reach it, and if so, whether every route crosses a
 *  mitigation or whether at least one route skips them entirely. Scoped to
 *  whichever diagram level is currently loaded, same as every other
 *  diagram-graph analysis in this app (DREAD, threats) — sub-diagrams
 *  (Release 8) are deliberately not rolled up. */
export function AttackPathPanel({ diagram, threats, onViewInDiagram }: AttackPathPanelProps) {
  const results = useMemo(() => computeAttackPaths(diagram), [diagram])
  const entryPointCount = useMemo(
    () => diagram.nodes.filter((n) => n.data.elementType === 'external-entity').length,
    [diagram.nodes]
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...results].sort(
        (a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)] || a.targetLabel.localeCompare(b.targetLabel)
      ),
    [results]
  )

  const selected = sorted.find((r) => r.targetId === selectedId) ?? sorted[0] ?? null

  const openThreatCountByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of threats) {
      if (t.status !== 'open') continue
      map.set(t.targetId, (map.get(t.targetId) ?? 0) + 1)
    }
    return map
  }, [threats])

  if (results.length === 0) {
    return (
      <div className="attack-path attack-path--empty">
        <p>
          No crown-jewel assets or compliance-tagged Data Stores in this diagram yet. Mark a Process or Data Store as
          a crown jewel, or tag a Data Store with compliance scope (Inspector), to see whether an attacker can reach
          it.
        </p>
      </div>
    )
  }

  return (
    <div className="attack-path">
      <div className="attack-path__list">
        <p className="attack-path__summary">
          {results.length} sensitive asset{results.length === 1 ? '' : 's'} · {entryPointCount} External
          Entit{entryPointCount === 1 ? 'y' : 'ies'} in this diagram
        </p>
        <ul className="attack-path__items">
          {sorted.map((r) => {
            const status = statusOf(r)
            return (
              <li key={r.targetId}>
                <button
                  type="button"
                  className={`attack-path__item${selected?.targetId === r.targetId ? ' attack-path__item--active' : ''}`}
                  onClick={() => setSelectedId(r.targetId)}
                >
                  <span className="attack-path__item-label">{r.targetLabel}</span>
                  <span className="attack-path__status-pill" style={{ background: STATUS_COLOR[status] }}>
                    {STATUS_LABEL[status]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="attack-path__detail">
        {selected ? (
          <AttackPathDetail result={selected} openThreatCountByTarget={openThreatCountByTarget} onViewInDiagram={onViewInDiagram} />
        ) : (
          <p>Select an asset to see its attack paths.</p>
        )}
      </div>
    </div>
  )
}

function AttackPathDetail({
  result,
  openThreatCountByTarget,
  onViewInDiagram,
}: {
  result: AttackPathResult
  openThreatCountByTarget: Map<string, number>
  onViewInDiagram: (nodeId: string) => void
}) {
  const status = statusOf(result)
  // Only worth showing the mitigated alternative when it's an actual detour
  // (strictly longer) — if it's the same length, the unrestricted shortest
  // path *is* the unmitigated one, so there's nothing distinct to compare.
  const showMitigatedAlternative =
    status !== 'exposed'
      ? result.bestPath !== null
      : result.bestPath !== null && result.unmitigatedPath !== null && result.bestPath.length !== result.unmitigatedPath.length

  return (
    <div className="attack-path-detail">
      <h3>{result.targetLabel}</h3>
      <div className="attack-path-detail__reasons">
        {result.reasons.map((r) => (
          <span key={r} className="attack-path-detail__reason-chip">
            {r}
          </span>
        ))}
      </div>

      {status === 'exposed' && (
        <div className="attack-path-detail__banner attack-path-detail__banner--danger">
          Unmitigated attack path found from <strong>{result.unmitigatedPathSourceLabel}</strong> — an attacker can
          reach this asset without crossing a single mitigation.
        </div>
      )}
      {status === 'protected' && (
        <div className="attack-path-detail__banner attack-path-detail__banner--safe">
          Every path found from an External Entity crosses at least one mitigation control.
        </div>
      )}
      {status === 'unreachable' && (
        <div className="attack-path-detail__banner attack-path-detail__banner--neutral">
          Not reachable from any External Entity in this diagram — either genuinely isolated, or there are no
          External Entity nodes to trace from.
        </div>
      )}

      {status === 'exposed' && result.unmitigatedPath && (
        <PathChain hops={result.unmitigatedPath} openThreatCountByTarget={openThreatCountByTarget} onViewInDiagram={onViewInDiagram} />
      )}

      {showMitigatedAlternative && result.bestPath && (
        <>
          <p className="attack-path-detail__subheading">
            {status === 'exposed' ? 'Shortest mitigated route' : `Shortest path — from ${result.bestPathSourceLabel}`}
          </p>
          <PathChain hops={result.bestPath} openThreatCountByTarget={openThreatCountByTarget} onViewInDiagram={onViewInDiagram} />
        </>
      )}
    </div>
  )
}

function PathChain({
  hops,
  openThreatCountByTarget,
  onViewInDiagram,
}: {
  hops: AttackPathHop[]
  openThreatCountByTarget: Map<string, number>
  onViewInDiagram: (nodeId: string) => void
}) {
  return (
    <div className="attack-path-chain">
      {hops.map((hop, i) => (
        <div className="attack-path-chain__hop-wrap" key={hop.nodeId}>
          {i > 0 && (
            <div className="attack-path-chain__arrow">
              <span>→</span>
              {hop.edgeId && (openThreatCountByTarget.get(hop.edgeId) ?? 0) > 0 && (
                <span className="attack-path-chain__threat-count" title="Open threats on this flow">
                  {openThreatCountByTarget.get(hop.edgeId)}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            className={`attack-path-chain__hop${hop.elementType === 'mitigation' ? ' attack-path-chain__hop--mitigation' : ''}`}
            onClick={() => onViewInDiagram(hop.nodeId)}
            title={`${SHAPE_LABELS[hop.elementType]} — click to view on the diagram`}
          >
            {SHAPE_ICONS[hop.elementType]}
            <span>{hop.label}</span>
            {(openThreatCountByTarget.get(hop.nodeId) ?? 0) > 0 && (
              <span className="attack-path-chain__threat-count" title="Open threats on this element">
                {openThreatCountByTarget.get(hop.nodeId)}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
