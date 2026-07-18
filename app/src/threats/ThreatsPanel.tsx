import { useEffect, useMemo, useState } from 'react'
import type { DreadScore, StrideCategory, Threat, ThreatStatus } from '../types/project'
import { findCatalogEntry } from '../canvas/componentCatalog'
import { useResizablePanel } from '../canvas/useResizablePanel'
import { dreadAverage, dreadRiskLevel, dreadTotal, DREAD_RISK_COLOR } from './dreadEngine'
import './ThreatsPanel.css'

interface ThreatsPanelProps {
  threats: Threat[]
  dreadEnabled: boolean
  /** Set by the canvas threat overlay ("view details" on a badge) to jump
   *  straight to that threat's detail panel, bypassing whatever filters are
   *  active. */
  focusThreatId?: string | null
  onChangeStatus: (id: string, status: ThreatStatus) => void
  onChangeNotes: (id: string, notes: string) => void
  onChangeDread: (id: string, dread: DreadScore) => void
  onDelete: (id: string) => void
}

const DREAD_FIELDS: { key: keyof DreadScore; label: string; hint: string }[] = [
  { key: 'damage', label: 'Damage', hint: 'How bad would a successful exploit be?' },
  { key: 'reproducibility', label: 'Reproducibility', hint: 'How reliably can it be triggered?' },
  { key: 'exploitability', label: 'Exploitability', hint: 'How much skill/effort does it take?' },
  { key: 'affectedUsers', label: 'Affected users', hint: 'How many users/systems are impacted?' },
  { key: 'discoverability', label: 'Discoverability', hint: 'How easy is it to find?' },
]

const STATUS_OPTIONS: ThreatStatus[] = ['open', 'mitigated', 'accepted', 'false-positive']
const CATEGORY_OPTIONS: StrideCategory[] = ['S', 'T', 'R', 'I', 'D', 'E']

const CATEGORY_COLOR: Record<string, string> = {
  S: '#f472b6',
  T: '#f59e0b',
  R: '#a78bfa',
  I: '#38bdf8',
  D: '#fb7185',
  E: '#4ade80',
}

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

const NOTES_HINT: Record<ThreatStatus, string> = {
  open: 'Notes (optional)',
  mitigated: 'What mitigates this threat?',
  accepted: 'Why was this risk accepted?',
  'false-positive': 'Why is this a false positive?',
}

export function ThreatsPanel({
  threats,
  dreadEnabled,
  focusThreatId,
  onChangeStatus,
  onChangeNotes,
  onChangeDread,
  onDelete,
}: ThreatsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ThreatStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<StrideCategory | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const { size: detailWidth, startDrag } = useResizablePanel({ axis: 'x', initial: 340, min: 280, maxMargin: 260 })

  useEffect(() => {
    if (focusThreatId) setSelectedId(focusThreatId)
  }, [focusThreatId])

  const componentTypes = useMemo(() => {
    const ids = new Set(threats.map((t) => t.componentType).filter((x): x is string => Boolean(x)))
    return [...ids]
  }, [threats])

  if (threats.length === 0) {
    return (
      <div className="threats-empty">
        <p>No threats yet. Click "Regenerate Threats" to analyze the diagram.</p>
      </div>
    )
  }

  const filtered = threats.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    if (typeFilter !== 'all' && t.componentType !== typeFilter) return false
    return true
  })
  const sorted = [...filtered].sort((a, b) => a.category.localeCompare(b.category))
  const selected = threats.find((t) => t.id === selectedId) ?? null

  return (
    <div className="threats-layout">
      <div className="threats-list-col">
        <div className="threats-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ThreatStatus | 'all')}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as StrideCategory | 'all')}
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c} — {CATEGORY_NAMES[c]}
              </option>
            ))}
          </select>
          {componentTypes.length > 0 && (
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {componentTypes.map((id) => (
                <option key={id} value={id}>
                  {findCatalogEntry(id)?.name ?? id}
                </option>
              ))}
            </select>
          )}
          <span className="threats-filters__count">
            {filtered.length} of {threats.length}
          </span>
        </div>
        <div className="threats-list">
          {sorted.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`threats-row${t.id === selectedId ? ' threats-row--selected' : ''}${
                t.status !== 'open' ? ' threats-row--resolved' : ''
              }`}
              onClick={() => setSelectedId(t.id)}
            >
              <span className="threats-category" style={{ color: CATEGORY_COLOR[t.category] }}>
                {t.category}
              </span>
              <span className="threats-row__body">
                <span className="threats-row__title">{t.title}</span>
                <span className="threats-row__target">{t.targetLabel}</span>
              </span>
              {dreadEnabled &&
                (() => {
                  const avg = dreadAverage(t.dread)
                  if (avg === null) return null
                  const level = dreadRiskLevel(avg)
                  return (
                    <span className="threats-risk-pill" style={{ color: DREAD_RISK_COLOR[level] }}>
                      {level}
                    </span>
                  )
                })()}
              <span className={`threats-status-pill threats-status-pill--${t.status}`}>{t.status}</span>
            </button>
          ))}
          {sorted.length === 0 && <p className="threats-list__empty">No threats match these filters.</p>}
        </div>
      </div>

      <div className="threats-splitter" onMouseDown={startDrag} />

      {selected ? (
        <div className="threats-detail" style={{ width: detailWidth }}>
          <div className="threats-detail__header">
            <span className="threats-category threats-category--lg" style={{ color: CATEGORY_COLOR[selected.category] }}>
              {selected.category}
            </span>
            <h2>{selected.title}</h2>
          </div>

          <div className="threats-detail__row">
            <span className="threats-detail__label">Target</span>
            <span>{selected.targetLabel}</span>
          </div>
          {selected.componentType && (
            <div className="threats-detail__row">
              <span className="threats-detail__label">Component</span>
              <span>{findCatalogEntry(selected.componentType)?.name ?? selected.componentType}</span>
            </div>
          )}
          <div className="threats-detail__row">
            <span className="threats-detail__label">Source</span>
            <span className={`threats-source threats-source--${selected.source}`}>{selected.source}</span>
          </div>

          <div className="threats-detail__field">
            <span className="threats-detail__label">Description</span>
            <p>{selected.description}</p>
          </div>

          {dreadEnabled && (
            <div className="threats-detail__field threats-dread">
              <div className="threats-dread__header">
                <span className="threats-detail__label">DREAD score</span>
                {selected.dreadNeedsReview && <span className="threats-dread__review-badge">Needs review</span>}
              </div>
              {DREAD_FIELDS.map((f) => (
                <label className="threats-dread__field" key={f.key} title={f.hint}>
                  <span className="threats-dread__field-label">{f.label}</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={selected.dread?.[f.key] ?? ''}
                    placeholder="—"
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : Number(e.target.value)
                      onChangeDread(selected.id, { ...selected.dread, [f.key]: value })
                    }}
                  />
                </label>
              ))}
              {(() => {
                const total = dreadTotal(selected.dread)
                const avg = dreadAverage(selected.dread)
                if (total === null || avg === null) {
                  return <p className="threats-dread__incomplete">Fill in all five fields to see a risk level.</p>
                }
                const level = dreadRiskLevel(avg)
                return (
                  <p className="threats-dread__total">
                    Total <strong>{total}</strong>/50 — avg {avg.toFixed(1)} —{' '}
                    <span style={{ color: DREAD_RISK_COLOR[level] }}>{level}</span>
                  </p>
                )
              })()}
            </div>
          )}

          <div className="threats-detail__field">
            <span className="threats-detail__label">Status</span>
            <select value={selected.status} onChange={(e) => onChangeStatus(selected.id, e.target.value as ThreatStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="threats-detail__field">
            <span className="threats-detail__label">{NOTES_HINT[selected.status]}</span>
            <textarea
              rows={4}
              value={selected.notes ?? ''}
              onChange={(e) => onChangeNotes(selected.id, e.target.value)}
              placeholder="Add detail here…"
            />
          </div>

          <button
            type="button"
            className="btn threats-detail__delete"
            onClick={() => {
              onDelete(selected.id)
              setSelectedId(null)
            }}
          >
            Delete threat
          </button>
        </div>
      ) : (
        <div className="threats-detail threats-detail--empty" style={{ width: detailWidth }}>
          <p>Select a threat to view details.</p>
        </div>
      )}
    </div>
  )
}
