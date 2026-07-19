import type { ComplianceTag, PciScope, StrideCategory, Threat } from '../types/project'
import { dreadAverage, dreadRiskLevel, dreadTotal } from './dreadEngine'

export interface Citation {
  id: string
  system: 'CAPEC' | 'CWE'
  name: string
  url: string
}

export interface ControlRef {
  framework: string
  id: string
  name: string
}

/** Curated, not exhaustive — a hand-picked subset per STRIDE category rather
 *  than an imported reference export, not an attempt at full CAPEC/CWE
 *  coverage. Every id/title below (and every NIST 800-53/CIS/ASVS id in
 *  `MITIGATION_CONTROLS`) was checked live against cwe.mitre.org/
 *  capec.mitre.org/csrc.nist.gov/cisecurity.org/asvs.dev while building this
 *  — one real catch: OWASP ASVS reorganized between versions, "V5:
 *  Validation, Sanitization and Encoding" in 4.0 is "V1: Encoding and
 *  Sanitization" in the current 5.0, so the WAF entry cites the version
 *  explicitly. Still only a starting point for a human reviewer, not a
 *  substitute for one (frameworks keep evolving after this was written) —
 *  same posture as every other "suggest, don't auto-finalize" piece of this
 *  app. */
const BASE_CITATIONS: Record<StrideCategory, Citation[]> = {
  S: [
    { id: 'CWE-287', system: 'CWE', name: 'Improper Authentication', url: 'https://cwe.mitre.org/data/definitions/287.html' },
    { id: 'CAPEC-151', system: 'CAPEC', name: 'Identity Spoofing', url: 'https://capec.mitre.org/data/definitions/151.html' },
  ],
  T: [
    {
      id: 'CWE-345',
      system: 'CWE',
      name: 'Insufficient Verification of Data Authenticity',
      url: 'https://cwe.mitre.org/data/definitions/345.html',
    },
    { id: 'CAPEC-153', system: 'CAPEC', name: 'Input Data Manipulation', url: 'https://capec.mitre.org/data/definitions/153.html' },
  ],
  R: [
    { id: 'CWE-778', system: 'CWE', name: 'Insufficient Logging', url: 'https://cwe.mitre.org/data/definitions/778.html' },
    { id: 'CAPEC-268', system: 'CAPEC', name: 'Audit Log Manipulation', url: 'https://capec.mitre.org/data/definitions/268.html' },
  ],
  I: [
    {
      id: 'CWE-200',
      system: 'CWE',
      name: 'Exposure of Sensitive Information to an Unauthorized Actor',
      url: 'https://cwe.mitre.org/data/definitions/200.html',
    },
    { id: 'CAPEC-116', system: 'CAPEC', name: 'Excavation', url: 'https://capec.mitre.org/data/definitions/116.html' },
  ],
  D: [
    { id: 'CWE-400', system: 'CWE', name: 'Uncontrolled Resource Consumption', url: 'https://cwe.mitre.org/data/definitions/400.html' },
    { id: 'CAPEC-125', system: 'CAPEC', name: 'Flooding', url: 'https://capec.mitre.org/data/definitions/125.html' },
  ],
  E: [
    { id: 'CWE-269', system: 'CWE', name: 'Improper Privilege Management', url: 'https://cwe.mitre.org/data/definitions/269.html' },
    { id: 'CAPEC-233', system: 'CAPEC', name: 'Privilege Escalation', url: 'https://capec.mitre.org/data/definitions/233.html' },
  ],
}

/** Extra, more specific citations layered on when the threat's own text/rule
 *  already signals a particular pattern — reuses the same description/ruleId
 *  signals `dreadEngine.ts`'s `contextContributions()` already checks,
 *  rather than inventing a parallel classification scheme. */
function extraCitations(threat: Threat): Citation[] {
  const extra: Citation[] = []
  if (threat.ruleId.includes('boundary')) {
    extra.push({
      id: 'CWE-319',
      system: 'CWE',
      name: 'Cleartext Transmission of Sensitive Information',
      url: 'https://cwe.mitre.org/data/definitions/319.html',
    })
    extra.push({ id: 'CAPEC-94', system: 'CAPEC', name: 'Adversary in the Middle (AiTM)', url: 'https://capec.mitre.org/data/definitions/94.html' })
  }
  if (threat.description.includes('high priority')) {
    extra.push({
      id: 'CWE-311',
      system: 'CWE',
      name: 'Missing Encryption of Sensitive Data',
      url: 'https://cwe.mitre.org/data/definitions/311.html',
    })
  }
  if (threat.description.toLowerCase().includes('credential')) {
    extra.push({
      id: 'CWE-522',
      system: 'CWE',
      name: 'Insufficiently Protected Credentials',
      url: 'https://cwe.mitre.org/data/definitions/522.html',
    })
  }
  if (threat.ruleId.startsWith('mitigation-')) {
    extra.push({ id: 'CWE-693', system: 'CWE', name: 'Protection Mechanism Failure', url: 'https://cwe.mitre.org/data/definitions/693.html' })
  }
  return extra
}

export function citationsForThreat(threat: Threat): Citation[] {
  const seen = new Set<string>()
  return [...BASE_CITATIONS[threat.category], ...extraCitations(threat)].filter((c) =>
    seen.has(c.id) ? false : (seen.add(c.id), true)
  )
}

/** Mitigation-type -> the control-framework requirements that type of
 *  control typically helps satisfy. Deliberately coarse (per stencil type,
 *  not per-configuration) and deliberately not forced onto every framework
 *  for every type — OWASP ASVS is an *application*-layer standard with no
 *  clean mapping for a network firewall or IDS/IPS, so those only cite
 *  NIST 800-53 / CIS Controls. Same "no clean statable reason, don't force
 *  it" rule this app has applied to DREAD/compliance bumps since Release 5. */
const MITIGATION_CONTROLS: Record<string, ControlRef[]> = {
  Firewall: [
    { framework: 'NIST 800-53', id: 'SC-7', name: 'Boundary Protection' },
    { framework: 'CIS Controls v8', id: '12', name: 'Network Infrastructure Management' },
  ],
  WAF: [
    { framework: 'NIST 800-53', id: 'SC-7', name: 'Boundary Protection' },
    { framework: 'NIST 800-53', id: 'SI-10', name: 'Information Input Validation' },
    { framework: 'OWASP ASVS v5.0', id: 'V1', name: 'Encoding and Sanitization (compensating control)' },
  ],
  'IDS/IPS': [
    { framework: 'NIST 800-53', id: 'SI-4', name: 'System Monitoring' },
    { framework: 'CIS Controls v8', id: '13', name: 'Network Monitoring and Defense' },
  ],
}

export function controlsForMitigationType(mitigationType: string | undefined): ControlRef[] {
  if (!mitigationType) return []
  return MITIGATION_CONTROLS[mitigationType] ?? []
}

function complianceLabel(tags: Set<ComplianceTag>, pciScope: PciScope | undefined): string {
  return [...tags]
    .sort()
    .map((t) => (t === 'PCI' && pciScope ? `PCI (${pciScope === 'CDE' ? 'Cardholder Data Environment' : 'Connected to CDE'})` : t))
    .join(', ')
}

/** Formats a single threat as self-contained Markdown — title, target,
 *  status, DREAD, compliance scope, description, citations, compensating
 *  controls, resolution notes, and risk-acceptance sign-off, each section
 *  only included when there's actually something to say. No API/credential
 *  integration with any specific tracker (Jira, GitHub Issues, ...) — this
 *  is meant to be pasted into whichever one the user actually uses, which
 *  covers the same underlying need without needing to store a token for
 *  one specific service (see PROJECT_STATUS.md for the scope discussion). */
export function threatToMarkdown(
  threat: Threat,
  ctx: { componentName?: string; complianceTags?: Set<ComplianceTag>; pciScope?: PciScope; mitigationType?: string }
): string {
  const lines: string[] = []
  lines.push(`## [${threat.category}] ${threat.title}`)
  lines.push('')
  lines.push(`- **Target:** ${threat.targetLabel}${ctx.componentName ? ` (${ctx.componentName})` : ''}`)
  lines.push(`- **Status:** ${threat.status}`)

  const total = dreadTotal(threat.dread)
  const avg = dreadAverage(threat.dread)
  if (total !== null && avg !== null) {
    const d = threat.dread!
    lines.push(
      `- **DREAD:** Damage ${d.damage}, Reproducibility ${d.reproducibility}, Exploitability ${d.exploitability}, Affected Users ${d.affectedUsers}, Discoverability ${d.discoverability} — Total ${total}/50 (avg ${avg.toFixed(1)}, ${dreadRiskLevel(avg)})`
    )
  }

  if (ctx.complianceTags && ctx.complianceTags.size > 0) {
    lines.push(`- **Compliance scope:** ${complianceLabel(ctx.complianceTags, ctx.pciScope)}`)
  }

  lines.push('')
  lines.push('### Description')
  lines.push(threat.description)

  const citations = citationsForThreat(threat)
  if (citations.length > 0) {
    lines.push('')
    lines.push('### References')
    for (const c of citations) lines.push(`- ${c.id} — ${c.name} (${c.url})`)
  }

  const controls = controlsForMitigationType(ctx.mitigationType)
  if (controls.length > 0) {
    lines.push('')
    lines.push('### Compensating controls')
    for (const c of controls) lines.push(`- ${c.framework} ${c.id} — ${c.name}`)
  }

  if (threat.notes) {
    lines.push('')
    lines.push('### Notes')
    lines.push(threat.notes)
  }

  if (threat.status === 'accepted') {
    lines.push('')
    lines.push('### Risk acceptance')
    if (threat.acceptedBy) lines.push(`- Accepted by: ${threat.acceptedBy}`)
    if (threat.acceptedAt) lines.push(`- Accepted: ${new Date(threat.acceptedAt).toLocaleDateString()}`)
    if (threat.reviewByDate) lines.push(`- Review by: ${threat.reviewByDate}`)
  }

  return lines.join('\n')
}
