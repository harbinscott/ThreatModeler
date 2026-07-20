import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComplianceTag, CustomStencil, DreadContribution, DreadScore, PciScope, ReviewerComment, StrideCategory, Threat, ThreatStatus } from '../types/project'
import { findStencil } from '../canvas/stencils'
import { COMPLIANCE_TAG_COLOR, COMPLIANCE_TAG_LABELS } from '../canvas/complianceTags'
import { useResizablePanel } from '../canvas/useResizablePanel'
import { dreadAverage, dreadRiskLevel, dreadTotal, hasMitigationCredit, inherentDreadScore, DREAD_RISK_COLOR, type DreadRiskLevel } from './dreadEngine'
import { citationsForThreat, controlsForMitigationType, threatToMarkdown } from './threatIntel'
import './ThreatsPanel.css'

interface ThreatsPanelProps {
  threats: Threat[]
  dreadEnabled: boolean
  customStencils?: CustomStencil[]
  /** Effective (direct + propagated) compliance tags per target id — always
   *  computed regardless of whether the canvas "Compliance tags" overlay is
   *  toggled on, since that toggle only controls the diagram badge, not
   *  whether this panel should know about them. */
  complianceTagsByTarget?: Map<string, Set<ComplianceTag>>
  /** Effective PCI scope per target id, same gating as complianceTagsByTarget. */
  pciScopeByTarget?: Map<string, PciScope>
  /** Set by the canvas threat overlay ("view details" on a badge) to jump
   *  straight to that threat's detail panel, bypassing whatever filters are
   *  active. */
  focusThreatId?: string | null
  /** Target id -> mitigation stencil type ('Firewall'/'WAF'/'IDS/IPS'/...),
   *  for a mitigation node itself and for any edge whose *source* is one —
   *  drives the "Compensating controls" block via controlsForMitigationType.
   *  A thin derived map like complianceTagsByTarget, not a full diagram
   *  prop, matching this panel's established pattern. */
  mitigationTypeByTarget?: Map<string, string>
  onChangeStatus: (id: string, status: ThreatStatus) => void
  onChangeNotes: (id: string, notes: string) => void
  onChangeDread: (id: string, dread: DreadScore) => void
  /** Risk-acceptance sign-off fields — only rendered while status is
   *  'accepted'. `acceptedAt` isn't settable here; it auto-stamps on the
   *  status-change side (Canvas.tsx) the first time status becomes
   *  'accepted'. */
  onChangeAcceptance: (id: string, patch: Partial<Pick<Threat, 'acceptedBy' | 'reviewByDate'>>) => void
  /** Async reviewer comment thread (Release 12) — distinct from
   *  onChangeNotes' single resolution field. `author` is freeform, same
   *  posture as acceptedBy. */
  onAddReviewerComment: (id: string, text: string, author?: string) => void
  onDeleteReviewerComment: (id: string, commentId: string) => void
  onDelete: (id: string) => void
  /** Release 11 — exports whatever the current filters/sort produced (not
   *  necessarily every threat in the project), so "export all Critical PCI
   *  threats" is just "filter, then click export." File save itself goes
   *  through Canvas.tsx/the main process, same as every other export. */
  onExportCsv?: (threats: Threat[]) => void
}

const EMPTY_COMPLIANCE_TAGS = new Map<string, Set<ComplianceTag>>()
const EMPTY_PCI_SCOPE = new Map<string, PciScope>()
const EMPTY_MITIGATION_TYPES = new Map<string, string>()

function complianceChipLabel(tag: ComplianceTag, pciScope: PciScope | undefined): string {
  return tag === 'PCI' && pciScope ? `PCI · ${pciScope}` : tag
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
const RISK_OPTIONS: DreadRiskLevel[] = ['Low', 'Medium', 'High', 'Critical']

type SortKey = 'category' | 'title' | 'target' | 'status' | 'risk'
const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'category', label: 'Cat' },
  { key: 'title', label: 'Threat' },
  { key: 'target', label: 'Target' },
  { key: 'status', label: 'Status' },
  { key: 'risk', label: 'Risk' },
]

function compareThreats(a: Threat, b: Threat, key: SortKey): number {
  switch (key) {
    case 'category':
      return a.category.localeCompare(b.category)
    case 'title':
      return a.title.localeCompare(b.title)
    case 'target':
      return a.targetLabel.localeCompare(b.targetLabel)
    case 'status':
      return a.status.localeCompare(b.status)
    case 'risk':
      return (dreadAverage(a.dread) ?? -1) - (dreadAverage(b.dread) ?? -1)
  }
}

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

/** Hover-triggered breakdown of why *every* DREAD field's suggested value is
 *  what it is, grouped by field in one card rather than five separate icons
 *  — base score plus each contributing adjustment, labeled. Portal-rendered
 *  into document.body for the same reason ThreatBadge's popover is: this
 *  panel isn't a React Flow node, but the detail column can still get
 *  clipped by its own overflow-y:auto, so an inline-positioned popover could
 *  get cut off at the panel edge. */
function DreadScoreExplain({
  breakdown,
  fields,
}: {
  breakdown: DreadContribution[]
  fields: { key: keyof DreadScore; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const iconRef = useRef<HTMLButtonElement>(null)

  if (breakdown.length === 0) return null

  function show() {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 300) })
    }
    setOpen(true)
  }

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        className="dread-explain-icon"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        aria-label="Why these scores?"
      >
        ⓘ Why these scores?
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="dread-explain-popover" style={{ position: 'fixed', top: pos.top, left: pos.left }}>
            {fields.map((f) => {
              const contributions = breakdown.filter((c) => c.key === f.key)
              if (contributions.length === 0) return null
              const total = Math.max(1, Math.min(10, contributions.reduce((sum, c) => sum + c.amount, 0)))
              return (
                <div className="dread-explain-popover__group" key={f.key}>
                  <div className="dread-explain-popover__group-header">
                    <span>{f.label}</span>
                    <span>{total}</span>
                  </div>
                  {contributions.map((c, i) => (
                    <div className="dread-explain-popover__row" key={i}>
                      <span>{c.label}</span>
                      <span>{c.amount > 0 ? `+${c.amount}` : c.amount}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}

/** Async review-cycle comment thread (Release 12) — distinct from the
 *  single "Resolution notes" field above it: a running back-and-forth
 *  ("shouldn't Exploitability be higher given no WAF?" / "good catch,
 *  bumped it") rather than one freeform summary. Comments are append-only
 *  (delete only, no edit-in-place) and always shown, not gated behind a
 *  collapsible toggle — a short review thread is exactly the kind of thing
 *  worth seeing without an extra click. */
function ReviewerCommentsSection({
  comments,
  onAdd,
  onDeleteComment,
}: {
  comments: ReviewerComment[]
  onAdd: (text: string, author?: string) => void
  onDeleteComment: (commentId: string) => void
}) {
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed, author.trim())
    setText('')
  }

  return (
    <div className="threats-detail__field threats-comments">
      <span className="threats-detail__label">Reviewer comments</span>
      {comments.length > 0 && (
        <ul className="threats-comments__list">
          {comments.map((c) => (
            <li key={c.id} className="threats-comments__item">
              <div className="threats-comments__meta">
                <span className="threats-comments__author">{c.author || 'Anonymous reviewer'}</span>
                <span className="threats-comments__date">{new Date(c.createdAt).toLocaleString()}</span>
                <button
                  type="button"
                  className="threats-comments__delete"
                  title="Delete this comment"
                  onClick={() => onDeleteComment(c.id)}
                >
                  ×
                </button>
              </div>
              <p className="threats-comments__text">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="threats-comments__form">
        <input
          type="text"
          className="threats-comments__author-input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name (optional)"
        />
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a review comment…"
        />
        <button type="button" className="btn" onClick={submit} disabled={!text.trim()}>
          Add comment
        </button>
      </div>
    </div>
  )
}

export function ThreatsPanel({
  threats,
  dreadEnabled,
  customStencils = [],
  complianceTagsByTarget = EMPTY_COMPLIANCE_TAGS,
  pciScopeByTarget = EMPTY_PCI_SCOPE,
  mitigationTypeByTarget = EMPTY_MITIGATION_TYPES,
  focusThreatId,
  onChangeStatus,
  onChangeNotes,
  onChangeDread,
  onChangeAcceptance,
  onAddReviewerComment,
  onDeleteReviewerComment,
  onDelete,
  onExportCsv,
}: ThreatsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ThreatStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<StrideCategory | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [complianceFilter, setComplianceFilter] = useState<ComplianceTag | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<DreadRiskLevel | 'all'>('all')
  // Release 11 — a sortable risk-register grid alongside the original
  // list+detail view, not a replacement for it: the detail panel (right)
  // stays visible and working the same way in both modes, only what's on
  // the left switches.
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [sortKey, setSortKey] = useState<SortKey>('category')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { size: detailWidth, startDrag } = useResizablePanel({ axis: 'x', initial: 340, min: 280, maxMargin: 260 })

  useEffect(() => {
    if (focusThreatId) setSelectedId(focusThreatId)
  }, [focusThreatId])

  const componentTypes = useMemo(() => {
    const ids = new Set(threats.map((t) => t.componentType).filter((x): x is string => Boolean(x)))
    return [...ids]
  }, [threats])

  const availableComplianceTags = useMemo(() => {
    const tags = new Set<ComplianceTag>()
    for (const t of threats) {
      const ts = complianceTagsByTarget.get(t.targetId)
      if (ts) for (const tag of ts) tags.add(tag)
    }
    return [...tags].sort()
  }, [threats, complianceTagsByTarget])

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
    if (complianceFilter !== 'all' && !complianceTagsByTarget.get(t.targetId)?.has(complianceFilter)) return false
    if (riskFilter !== 'all') {
      const avg = dreadAverage(t.dread)
      if (avg === null || dreadRiskLevel(avg) !== riskFilter) return false
    }
    return true
  })
  const sorted =
    viewMode === 'table'
      ? [...filtered].sort((a, b) => {
          const cmp = compareThreats(a, b, sortKey)
          return sortDir === 'asc' ? cmp : -cmp
        })
      : [...filtered].sort((a, b) => a.category.localeCompare(b.category))
  const selected = threats.find((t) => t.id === selectedId) ?? null
  const dreadBreakdown: DreadContribution[] = selected?.dreadBreakdown ?? []

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function copySelectedAsMarkdown() {
    if (!selected) return
    const markdown = threatToMarkdown(selected, {
      componentName: selected.componentType ? (findStencil(selected.componentType, customStencils)?.name ?? selected.componentType) : undefined,
      complianceTags: complianceTagsByTarget.get(selected.targetId),
      pciScope: pciScopeByTarget.get(selected.targetId),
      mitigationType: mitigationTypeByTarget.get(selected.targetId),
    })
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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
                  {findStencil(id, customStencils)?.name ?? id}
                </option>
              ))}
            </select>
          )}
          {availableComplianceTags.length > 0 && (
            <select value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value as ComplianceTag | 'all')}>
              <option value="all">All compliance</option>
              {availableComplianceTags.map((tag) => (
                <option key={tag} value={tag}>
                  {COMPLIANCE_TAG_LABELS[tag]}
                </option>
              ))}
            </select>
          )}
          {dreadEnabled && (
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as DreadRiskLevel | 'all')}>
              <option value="all">All risk levels</option>
              {RISK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          <span className="threats-filters__count">
            {filtered.length} of {threats.length}
          </span>
          <div className="threats-filters__view-toggle">
            <button
              type="button"
              className={`threats-view-btn${viewMode === 'list' ? ' threats-view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              type="button"
              className={`threats-view-btn${viewMode === 'table' ? ' threats-view-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          {onExportCsv && (
            <button type="button" className="btn threats-filters__export" onClick={() => onExportCsv(filtered)} title="Export the currently filtered threats as CSV">
              Export CSV
            </button>
          )}
        </div>
        {viewMode === 'table' ? (
          <div className="threats-table-wrap">
            <table className="threats-table">
              <thead>
                <tr>
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key}>
                      <button type="button" className="threats-table__sort" onClick={() => toggleSort(col.key)}>
                        {col.label}
                        {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    </th>
                  ))}
                  <th>Compliance</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const avg = dreadAverage(t.dread)
                  const level = dreadEnabled && avg !== null ? dreadRiskLevel(avg) : null
                  const tags = complianceTagsByTarget.get(t.targetId)
                  return (
                    <tr
                      key={t.id}
                      className={`threats-table__row${t.id === selectedId ? ' threats-table__row--selected' : ''}${t.status !== 'open' ? ' threats-table__row--resolved' : ''}`}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <td>
                        <span className="threats-category" style={{ color: CATEGORY_COLOR[t.category] }}>
                          {t.category}
                        </span>
                      </td>
                      <td>{t.title}</td>
                      <td>{t.targetLabel}</td>
                      <td>
                        <span className={`threats-status-pill threats-status-pill--${t.status}`}>{t.status}</span>
                      </td>
                      <td>{level && <span style={{ color: DREAD_RISK_COLOR[level], fontWeight: 700 }}>{level}</span>}</td>
                      <td>
                        {tags && tags.size > 0 && (
                          <span className="threats-row__compliance">
                            {[...tags]
                              .sort()
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="threats-row__compliance-dot"
                                  style={{ background: COMPLIANCE_TAG_COLOR[tag] }}
                                  title={COMPLIANCE_TAG_LABELS[tag]}
                                />
                              ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="threats-list__empty">
                      No threats match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
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
              {(() => {
                const tags = complianceTagsByTarget.get(t.targetId)
                if (!tags || tags.size === 0) return null
                const pciScope = pciScopeByTarget.get(t.targetId)
                return (
                  <span className="threats-row__compliance">
                    {[...tags]
                      .sort()
                      .map((tag) => (
                        <span
                          key={tag}
                          className="threats-row__compliance-dot"
                          style={{ background: COMPLIANCE_TAG_COLOR[tag] }}
                          title={tag === 'PCI' && pciScope ? `${COMPLIANCE_TAG_LABELS[tag]} — ${pciScope}` : COMPLIANCE_TAG_LABELS[tag]}
                        />
                      ))}
                  </span>
                )
              })()}
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
        )}
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
              <span>{findStencil(selected.componentType, customStencils)?.name ?? selected.componentType}</span>
            </div>
          )}
          {(() => {
            const tags = complianceTagsByTarget.get(selected.targetId)
            if (!tags || tags.size === 0) return null
            const pciScope = pciScopeByTarget.get(selected.targetId)
            return (
              <div className="threats-detail__row">
                <span className="threats-detail__label">Compliance</span>
                <span className="threats-detail__compliance">
                  {[...tags]
                    .sort()
                    .map((tag) => (
                      <span
                        key={tag}
                        className="threats-detail__compliance-chip"
                        style={{ background: COMPLIANCE_TAG_COLOR[tag] }}
                        title={tag === 'PCI' && pciScope ? `${COMPLIANCE_TAG_LABELS[tag]} — ${pciScope}` : COMPLIANCE_TAG_LABELS[tag]}
                      >
                        {complianceChipLabel(tag, pciScope)}
                      </span>
                    ))}
                </span>
              </div>
            )
          })()}
          <div className="threats-detail__row">
            <span className="threats-detail__label">Source</span>
            <span className={`threats-source threats-source--${selected.source}`}>{selected.source}</span>
          </div>

          <div className="threats-detail__field">
            <span className="threats-detail__label">Description</span>
            <p>{selected.description}</p>
          </div>

          <div className="threats-detail__field">
            <span className="threats-detail__label" title="Curated, not exhaustive — verify against the current MITRE CAPEC/CWE publications before citing in a formal deliverable.">
              References
            </span>
            <div className="threats-detail__citations">
              {citationsForThreat(selected).map((c) => (
                <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" className="threats-detail__citation" title={c.name}>
                  {c.id}
                </a>
              ))}
            </div>
          </div>

          {(() => {
            const mitigationType = mitigationTypeByTarget.get(selected.targetId)
            const controls = controlsForMitigationType(mitigationType)
            if (controls.length === 0) return null
            return (
              <div className="threats-detail__field">
                <span
                  className="threats-detail__label"
                  title="Coarse, per control-type mapping — verify against the current framework publications before citing in a formal deliverable."
                >
                  Compensating controls
                </span>
                <div className="threats-detail__citations">
                  {controls.map((c) => (
                    <span key={`${c.framework}-${c.id}`} className="threats-detail__citation threats-detail__citation--control" title={c.name}>
                      {c.framework} {c.id}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {dreadEnabled && (
            <div className="threats-detail__field threats-dread">
              <div className="threats-dread__header">
                <span className="threats-detail__label">DREAD score</span>
                {selected.dreadNeedsReview && <span className="threats-dread__review-badge">Needs review</span>}
              </div>
              <DreadScoreExplain breakdown={dreadBreakdown} fields={DREAD_FIELDS} />
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
              {hasMitigationCredit(selected) &&
                (() => {
                  const inherent = inherentDreadScore(selected)
                  const iTotal = dreadTotal(inherent ?? undefined)
                  const iAvg = dreadAverage(inherent ?? undefined)
                  if (iTotal === null || iAvg === null) return null
                  const iLevel = dreadRiskLevel(iAvg)
                  return (
                    <p className="threats-dread__total threats-dread__total--inherent" title="What this score would be with no mitigation credit applied">
                      Inherent (no mitigations) <strong>{iTotal}</strong>/50 — avg {iAvg.toFixed(1)} —{' '}
                      <span style={{ color: DREAD_RISK_COLOR[iLevel] }}>{iLevel}</span>
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

          {selected.status === 'accepted' && (
            <div className="threats-detail__field threats-acceptance">
              <span className="threats-detail__label">Risk acceptance sign-off</span>
              <label className="threats-acceptance__field">
                <span>Accepted by</span>
                <input
                  type="text"
                  value={selected.acceptedBy ?? ''}
                  onChange={(e) => onChangeAcceptance(selected.id, { acceptedBy: e.target.value })}
                  placeholder="Who accepted this risk?"
                />
              </label>
              {selected.acceptedAt && (
                <p className="threats-acceptance__accepted-at">Accepted {new Date(selected.acceptedAt).toLocaleDateString()}</p>
              )}
              <label className="threats-acceptance__field">
                <span>Review by</span>
                <input
                  type="date"
                  value={selected.reviewByDate ?? ''}
                  onChange={(e) => onChangeAcceptance(selected.id, { reviewByDate: e.target.value })}
                />
              </label>
            </div>
          )}

          <div className="threats-detail__field">
            <span className="threats-detail__label">{NOTES_HINT[selected.status]}</span>
            <textarea
              rows={4}
              value={selected.notes ?? ''}
              onChange={(e) => onChangeNotes(selected.id, e.target.value)}
              placeholder="Add detail here…"
            />
          </div>

          <ReviewerCommentsSection
            comments={selected.reviewerComments ?? []}
            onAdd={(text, author) => onAddReviewerComment(selected.id, text, author)}
            onDeleteComment={(commentId) => onDeleteReviewerComment(selected.id, commentId)}
          />

          <div className="threats-detail__button-row">
            <button type="button" className="btn" onClick={copySelectedAsMarkdown} title="Copy this threat as formatted Markdown — paste into Jira, GitHub, Linear, or anything else">
              {copied ? 'Copied ✓' : 'Copy as Markdown'}
            </button>
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
        </div>
      ) : (
        <div className="threats-detail threats-detail--empty" style={{ width: detailWidth }}>
          <p>Select a threat to view details.</p>
        </div>
      )}
    </div>
  )
}
