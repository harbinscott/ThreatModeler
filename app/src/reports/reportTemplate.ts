import type { Project, StrideCategory, Threat, ThreatStatus } from '../types/project'
import { dreadAverage, dreadRiskLevel, dreadTotal, hasMitigationCredit, inherentDreadScore, DREAD_RISK_COLOR } from '../threats/dreadEngine'

export type ReportVariant = 'summary' | 'detailed'

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

const STATUS_LABELS: Record<ThreatStatus, string> = {
  open: 'Open',
  mitigated: 'Mitigated',
  accepted: 'Accepted',
  'false-positive': 'False Positive',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function countBy<T extends string>(threats: Threat[], key: (t: Threat) => T): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const t of threats) {
    const k = key(t)
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

function baseStyles(): string {
  return `
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; margin: 0; padding: 32px 40px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 28px 0 10px; padding-top: 16px; border-top: 1px solid #e2e2ea; }
    .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
    .badges { display: flex; gap: 6px; margin: 8px 0 20px; }
    .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.03em; color: #0f766e; background: #ccfbf1; border-radius: 999px; padding: 3px 10px; }
    .summary-grid { display: flex; gap: 24px; margin: 16px 0; flex-wrap: wrap; }
    .stat { background: #f8fafc; border: 1px solid #e2e2ea; border-radius: 8px; padding: 10px 16px; min-width: 90px; }
    .stat .n { font-size: 22px; font-weight: 700; }
    .stat .l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #6b7280; padding: 6px 8px; border-bottom: 2px solid #e2e2ea; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    .cat { display: inline-block; width: 18px; height: 18px; text-align: center; line-height: 18px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid currentColor; }
    .desc { color: #4b5563; }
    .diagram-img { max-width: 100%; border: 1px solid #e2e2ea; border-radius: 8px; margin: 10px 0; }
    .status-open { color: #0f766e; font-weight: 700; }
    .status-mitigated, .status-accepted, .status-false-positive { color: #9ca3af; }
    .footer { margin-top: 40px; font-size: 10px; color: #9ca3af; }
  `
}

function frameworkBadges(project: Project): string {
  const list: string[] = []
  if (project.frameworks.stride) list.push('STRIDE')
  if (project.frameworks.dread) list.push('DREAD')
  if (project.frameworks.pasta) list.push('PASTA')
  return list.map((f) => `<span class="badge">${f}</span>`).join('')
}

/** Residual score (and, when a mitigation is actually giving credit,
 *  inherent-without-it too — see dreadEngine.ts's inherentDreadScore) for
 *  one threat's report row. Empty cell when the threat has no score yet
 *  (DREAD is opt-in per project and not every threat gets reviewed
 *  immediately). */
function dreadCell(t: Threat): string {
  const total = dreadTotal(t.dread)
  const avg = dreadAverage(t.dread)
  if (total === null || avg === null) return '<td>—</td>'
  const level = dreadRiskLevel(avg)
  let html = `<div>${total}/50 <span style="color:${DREAD_RISK_COLOR[level]};font-weight:700">${level}</span></div>`
  if (hasMitigationCredit(t)) {
    const inherentTotal = dreadTotal(inherentDreadScore(t) ?? undefined)
    if (inherentTotal !== null) html += `<div class="desc" style="font-size:10px">Inherent: ${inherentTotal}/50</div>`
  }
  return `<td>${html}</td>`
}

function threatRows(threats: Threat[], includeDescription: boolean, showDread: boolean): string {
  return threats
    .map(
      (t) => `
      <tr>
        <td><span class="cat">${t.category}</span></td>
        <td>
          <strong>${escapeHtml(t.title)}</strong>
          ${includeDescription ? `<div class="desc">${escapeHtml(t.description)}</div>` : ''}
          ${t.notes ? `<div class="desc"><em>Notes: ${escapeHtml(t.notes)}</em></div>` : ''}
        </td>
        <td>${escapeHtml(t.targetLabel)}</td>
        <td class="status-${t.status}">${STATUS_LABELS[t.status]}</td>
        ${showDread ? dreadCell(t) : ''}
      </tr>`
    )
    .join('')
}

export function buildReportHtml(project: Project, variant: ReportVariant, diagramImage: string | null): string {
  const threats = project.threats
  const openThreats = threats.filter((t) => t.status === 'open')
  const byStatus = countBy(threats, (t) => t.status)
  const byCategory = countBy(threats, (t) => t.category)
  const generatedAt = new Date().toLocaleString()

  const statsHtml = `
    <div class="summary-grid">
      <div class="stat"><div class="n">${threats.length}</div><div class="l">Total threats</div></div>
      <div class="stat"><div class="n">${byStatus.open ?? 0}</div><div class="l">Open</div></div>
      <div class="stat"><div class="n">${byStatus.mitigated ?? 0}</div><div class="l">Mitigated</div></div>
      <div class="stat"><div class="n">${byStatus.accepted ?? 0}</div><div class="l">Accepted</div></div>
      <div class="stat"><div class="n">${byStatus['false-positive'] ?? 0}</div><div class="l">False positive</div></div>
    </div>
    <table>
      <thead><tr><th>Category</th><th>Count</th></tr></thead>
      <tbody>
        ${(Object.keys(CATEGORY_NAMES) as StrideCategory[])
          .map(
            (c) =>
              `<tr><td><span class="cat">${c}</span> ${CATEGORY_NAMES[c]}</td><td>${byCategory[c] ?? 0}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  `

  const diagramHtml = diagramImage
    ? `<h2>System Diagram</h2><img class="diagram-img" src="${diagramImage}" alt="Diagram" />`
    : ''

  if (variant === 'summary') {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head><body>
      <h1>${escapeHtml(project.name)} — Executive Summary</h1>
      <div class="meta">Generated ${generatedAt}</div>
      ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
      <div class="badges">${frameworkBadges(project)}</div>
      <h2>Risk Overview</h2>
      <p>This system was modeled with ${project.diagram.nodes.length} elements and ${project.diagram.edges.length} data flows. Of ${threats.length} threats identified, <strong>${openThreats.length} remain open</strong> as of this report.</p>
      ${statsHtml}
      ${diagramHtml}
      <h2>Open Risks</h2>
      <table>
        <thead><tr><th>Category</th><th>Threat</th><th>Target</th><th>Status</th>${project.frameworks.dread ? '<th>Risk</th>' : ''}</tr></thead>
        <tbody>${threatRows(openThreats, false, project.frameworks.dread)}</tbody>
      </table>
      <div class="footer">ThreatModeler — Executive Summary Report</div>
    </body></html>`
  }

  const elementRows = project.diagram.nodes
    .filter((n) => n.data.elementType !== 'trust-boundary')
    .map((n) => {
      const attrs = n.data.attributes
        ? Object.entries(n.data.attributes)
            .filter(([, v]) => v !== '' && v !== undefined)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : ''
      return `<tr>
        <td>${escapeHtml(n.data.label)}</td>
        <td>${n.data.elementType}</td>
        <td>${n.data.componentType ?? '—'}</td>
        <td class="desc">${escapeHtml(attrs)}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles()}</style></head><body>
    <h1>${escapeHtml(project.name)} — Detailed Threat Model Report</h1>
    <div class="meta">Generated ${generatedAt}</div>
    ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
    <div class="badges">${frameworkBadges(project)}</div>
    ${diagramHtml}
    <h2>Element Inventory</h2>
    <table>
      <thead><tr><th>Name</th><th>Type</th><th>Component</th><th>Attributes</th></tr></thead>
      <tbody>${elementRows || '<tr><td colspan="4">No elements.</td></tr>'}</tbody>
    </table>
    <h2>Threat Summary</h2>
    ${statsHtml}
    <h2>All Threats</h2>
    <table>
      <thead><tr><th>Category</th><th>Threat</th><th>Target</th><th>Status</th>${project.frameworks.dread ? '<th>Risk</th>' : ''}</tr></thead>
      <tbody>${threatRows(threats, true, project.frameworks.dread)}</tbody>
    </table>
    <div class="footer">ThreatModeler — Detailed Report</div>
  </body></html>`
}
