import { useMemo, useState } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import type { ComplianceTag, Diagram, ElementType, PciScope, Threat } from '../types/project'
import { COMPLIANCE_TAG_LABELS, COMPLIANCE_TAG_COLOR } from '../canvas/complianceTags'
import { innermostBoundary } from '../canvas/boundaryGeometry'
import { SHAPE_ICONS } from '../canvas/shapeMeta'
import { dreadAverage, dreadRiskLevel, DREAD_RISK_COLOR, type DreadRiskLevel } from '../threats/dreadEngine'
import './ComplianceView.css'

interface ComplianceViewProps {
  diagram: Diagram
  threats: Threat[]
  /** Effective (direct + propagated) compliance tags per target id — same
   *  maps Canvas.tsx already threads into the Threats tab and canvas
   *  badges, reused here rather than recomputed. */
  complianceTagsByTarget: Map<string, Set<ComplianceTag>>
  pciScopeByTarget: Map<string, PciScope>
  onViewInDiagram: (id: string) => void
}

interface ScopedRow {
  id: string
  label: string
  kind: 'node' | 'edge'
  elementType?: ElementType
  zone: string
  pciScope?: PciScope
  complianceNotes?: string
  openThreatCount: number
  worstRisk: DreadRiskLevel | null
}

const RISK_ORDER: Record<'Critical' | 'High' | 'Medium' | 'Low' | 'none', number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  none: 4,
}

function worstRiskLevel(openThreats: Threat[]): DreadRiskLevel | null {
  let worst: DreadRiskLevel | null = null
  for (const t of openThreats) {
    const avg = dreadAverage(t.dread)
    if (avg === null) continue
    const level = dreadRiskLevel(avg)
    if (worst === null || RISK_ORDER[level] < RISK_ORDER[worst]) worst = level
  }
  return worst
}

/** Release 13 stage F — the "reverse" half of compliance tagging: instead of
 *  starting from an element and asking "what's it in scope for" (the
 *  Inspector's Compliance section, and the per-element chips already shown
 *  elsewhere), this starts from a framework and asks "what's in scope for
 *  it, and what shape is that scope in right now" — the question an
 *  auditor actually asks. Deliberately a flat, scannable table rather than
 *  a list+detail split like the Attack Paths tab: an auditor wants to scan
 *  every in-scope element's coverage at a glance, not drill into one at a
 *  time. Scoped to whichever diagram level is currently loaded, same as
 *  every other diagram-graph analysis in this app — sub-diagrams are not
 *  rolled up. */
export function ComplianceView({ diagram, threats, complianceTagsByTarget, pciScopeByTarget, onViewInDiagram }: ComplianceViewProps) {
  const frameworksInUse = useMemo(() => {
    const set = new Set<ComplianceTag>()
    for (const tags of complianceTagsByTarget.values()) for (const t of tags) set.add(t)
    return Array.from(set).sort()
  }, [complianceTagsByTarget])

  const [framework, setFramework] = useState<ComplianceTag | null>(null)
  const activeFramework = framework && frameworksInUse.includes(framework) ? framework : (frameworksInUse[0] ?? null)

  const threatsByTarget = useMemo(() => {
    const map = new Map<string, Threat[]>()
    for (const t of threats) {
      const list = map.get(t.targetId) ?? []
      list.push(t)
      map.set(t.targetId, list)
    }
    return map
  }, [threats])

  const boundaries = useMemo(() => diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary'), [diagram.nodes])

  const rows = useMemo<ScopedRow[]>(() => {
    if (!activeFramework) return []
    const out: ScopedRow[] = []
    for (const node of diagram.nodes) {
      if (node.data.elementType === 'trust-boundary') continue
      if (!complianceTagsByTarget.get(node.id)?.has(activeFramework)) continue
      const open = (threatsByTarget.get(node.id) ?? []).filter((t) => t.status === 'open')
      out.push({
        id: node.id,
        label: node.data.label,
        kind: 'node',
        elementType: node.data.elementType,
        zone: innermostBoundary(node, boundaries)?.data.label ?? 'No zone',
        pciScope: activeFramework === 'PCI' ? pciScopeByTarget.get(node.id) : undefined,
        complianceNotes: node.data.complianceNotes,
        openThreatCount: open.length,
        worstRisk: worstRiskLevel(open),
      })
    }
    for (const edge of diagram.edges) {
      if (!complianceTagsByTarget.get(edge.id)?.has(activeFramework)) continue
      const source = diagram.nodes.find((n) => n.id === edge.source)
      const target = diagram.nodes.find((n) => n.id === edge.target)
      const open = (threatsByTarget.get(edge.id) ?? []).filter((t) => t.status === 'open')
      out.push({
        id: edge.id,
        label: edge.data?.label || `${source?.data.label ?? '?'} → ${target?.data.label ?? '?'}`,
        kind: 'edge',
        zone: '—',
        pciScope: activeFramework === 'PCI' ? pciScopeByTarget.get(edge.id) : undefined,
        complianceNotes: edge.data?.complianceNotes,
        openThreatCount: open.length,
        worstRisk: worstRiskLevel(open),
      })
    }
    return out.sort((a, b) => RISK_ORDER[a.worstRisk ?? 'none'] - RISK_ORDER[b.worstRisk ?? 'none'] || a.label.localeCompare(b.label))
  }, [activeFramework, diagram.nodes, diagram.edges, complianceTagsByTarget, pciScopeByTarget, threatsByTarget, boundaries])

  const summary = useMemo(() => {
    const totalOpen = rows.reduce((sum, r) => sum + r.openThreatCount, 0)
    const clean = rows.filter((r) => r.openThreatCount === 0).length
    const byRisk: Record<DreadRiskLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    for (const r of rows) if (r.worstRisk) byRisk[r.worstRisk]++
    return { totalOpen, clean, byRisk }
  }, [rows])

  if (frameworksInUse.length === 0) {
    return (
      <div className="compliance-view compliance-view--empty">
        <p>
          No compliance-tagged elements in this diagram yet. Tag a Data Store or Data Flow with a regulatory framework
          (Inspector's Compliance section) to see an auditor-style rollup here.
        </p>
      </div>
    )
  }

  return (
    <div className="compliance-view">
      <div className="compliance-view__frameworks">
        {frameworksInUse.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`compliance-view__framework-pill${activeFramework === tag ? ' compliance-view__framework-pill--active' : ''}`}
            style={{ borderColor: COMPLIANCE_TAG_COLOR[tag], ...(activeFramework === tag ? { background: COMPLIANCE_TAG_COLOR[tag] } : {}) }}
            onClick={() => setFramework(tag)}
            title={COMPLIANCE_TAG_LABELS[tag]}
          >
            {tag}
          </button>
        ))}
      </div>

      {activeFramework && (
        <>
          <p className="compliance-view__title">{COMPLIANCE_TAG_LABELS[activeFramework]}</p>
          <div className="compliance-view__summary">
            <span>
              <strong>{rows.length}</strong> element{rows.length === 1 ? '' : 's'} in scope
            </span>
            <span>
              <strong>{summary.clean}</strong> clean (no open threats)
            </span>
            <span>
              <strong>{summary.totalOpen}</strong> open threat{summary.totalOpen === 1 ? '' : 's'} across scope
            </span>
            {(['Critical', 'High', 'Medium', 'Low'] as DreadRiskLevel[])
              .filter((level) => summary.byRisk[level] > 0)
              .map((level) => (
                <span key={level} className="compliance-view__risk-chip" style={{ color: DREAD_RISK_COLOR[level] }}>
                  {summary.byRisk[level]} {level}
                </span>
              ))}
          </div>

          <div className="compliance-view__table-wrap">
            <table className="compliance-view__table">
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Zone</th>
                  {activeFramework === 'PCI' && <th>PCI Scope</th>}
                  <th>Notes</th>
                  <th>Open Threats</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="compliance-view__row" onClick={() => onViewInDiagram(r.id)}>
                    <td className="compliance-view__cell-label">
                      {r.kind === 'node' && r.elementType ? SHAPE_ICONS[r.elementType] : <IconArrowRight size={15} color="#2563eb" aria-hidden="true" />}
                      <span>{r.label}</span>
                    </td>
                    <td>{r.zone}</td>
                    {activeFramework === 'PCI' && <td>{r.pciScope ?? '—'}</td>}
                    <td className="compliance-view__cell-notes">{r.complianceNotes || '—'}</td>
                    <td>{r.openThreatCount}</td>
                    <td>
                      {r.worstRisk ? (
                        <span className="compliance-view__risk-pill" style={{ background: DREAD_RISK_COLOR[r.worstRisk] }}>
                          {r.worstRisk}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
