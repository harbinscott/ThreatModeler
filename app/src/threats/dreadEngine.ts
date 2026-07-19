import type { AttributeValue, ComplianceTag, Diagram, DreadContribution, DreadScore, StrideCategory, Threat } from '../types/project'
import { computeEffectiveComplianceTags } from '../canvas/complianceTags'

const BASE_SCORES: Record<StrideCategory, Required<DreadScore>> = {
  S: { damage: 6, reproducibility: 6, exploitability: 5, affectedUsers: 5, discoverability: 5 },
  T: { damage: 7, reproducibility: 5, exploitability: 5, affectedUsers: 5, discoverability: 4 },
  R: { damage: 4, reproducibility: 7, exploitability: 6, affectedUsers: 3, discoverability: 3 },
  I: { damage: 7, reproducibility: 6, exploitability: 5, affectedUsers: 6, discoverability: 5 },
  D: { damage: 6, reproducibility: 7, exploitability: 6, affectedUsers: 8, discoverability: 6 },
  E: { damage: 9, reproducibility: 4, exploitability: 4, affectedUsers: 7, discoverability: 3 },
}

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, n))
}

const DREAD_KEYS: (keyof DreadScore)[] = ['damage', 'reproducibility', 'exploitability', 'affectedUsers', 'discoverability']

function baseContributions(category: StrideCategory): DreadContribution[] {
  const base = BASE_SCORES[category]
  return DREAD_KEYS.map((key) => ({ key, label: `Base score for ${CATEGORY_NAMES[category]} threats`, amount: base[key] }))
}

function contextContributions(threat: Threat): DreadContribution[] {
  const contributions: DreadContribution[] = []
  if (threat.ruleId.includes('boundary')) {
    contributions.push({ key: 'exploitability', label: 'Crosses a trust boundary', amount: 2 })
    contributions.push({ key: 'discoverability', label: 'Crosses a trust boundary', amount: 1 })
  }
  if (threat.description.includes('high priority')) {
    contributions.push({ key: 'damage', label: 'Flagged high priority (sensitive data, unconfirmed encryption)', amount: 2 })
    contributions.push({ key: 'affectedUsers', label: 'Flagged high priority (sensitive data, unconfirmed encryption)', amount: 2 })
  }
  return contributions
}

/** Adjustments derived from the target node/edge's MS-TMT security attributes —
 *  these are the same signals ruleEngine.ts folds into threat descriptions,
 *  reused here so a process with no authentication or a data flow with no
 *  confidentiality protection also scores higher, not just reads scarier. */
function attributeContributions(threat: Threat, attrs: Record<string, AttributeValue> | undefined): DreadContribution[] {
  if (!attrs) return []
  const contributions: DreadContribution[] = []
  const add = (key: keyof DreadScore, label: string, amount: number) => contributions.push({ key, label, amount })

  // Process
  if (attrs.implementsAuthentication === false && (threat.category === 'S' || threat.category === 'E')) {
    add('exploitability', 'No authentication mechanism declared', 2)
  }
  if (attrs.implementsAuthorization === false && threat.category === 'E') {
    add('damage', 'No authorization mechanism declared', 2)
  }
  if (attrs.sanitizesInput === false && threat.category === 'T') {
    add('exploitability', 'Input is not sanitized', 2)
  }
  if (attrs.sanitizesOutput === false && threat.category === 'I') {
    add('exploitability', 'Output is not sanitized', 1)
  }
  if (['Kernel', 'System', 'Administrator'].includes(attrs.runningAs as string) && threat.category === 'E') {
    add('damage', `Runs as ${attrs.runningAs} (elevated privileges)`, 2)
  }
  // AI/ML risk surface (Release 10) — same signal ruleEngine.ts folds into
  // these threats' descriptions.
  if (attrs.usesAI === true && threat.category === 'T') {
    add('exploitability', 'Uses AI/ML processing — prompt injection / adversarial input risk', 2)
  }
  if (attrs.usesAI === true && threat.category === 'I') {
    add('damage', 'AI/ML processing may leak training data or sensitive inference inputs/outputs', 2)
  }

  // Data store
  if (attrs.storesCredentials === true && attrs.encryptedAtRest !== true && threat.category === 'I') {
    add('damage', 'Stores credentials without confirmed encryption', 3)
    add('affectedUsers', 'Stores credentials without confirmed encryption', 2)
  }
  if (attrs.signed === false && threat.category === 'T') {
    add('damage', 'Data is not signed', 1)
  }

  // External interactor
  if (attrs.authenticated === false && threat.category === 'S') {
    add('exploitability', 'Interactor does not authenticate itself', 2)
  }

  // Mitigation control — weaknesses in the control itself, distinct from the
  // *protective* effect it has on flows through it (see mitigationContributions).
  if (attrs.rulesUpToDate === false && threat.category === 'T') {
    add('exploitability', 'Rules/signatures not confirmed current', 2)
  }
  if (attrs.logsTraffic === false && threat.category === 'R') {
    add('damage', 'No traffic logging declared — bypass attempts go unnoticed', 2)
  }

  // Data flow
  if ((attrs.sourceAuthenticated === false || attrs.destinationAuthenticated === false) && threat.category === 'T') {
    add('exploitability', 'Communicating parties not mutually authenticated', 2)
  }
  if (attrs.providesConfidentiality === false && threat.category === 'I') {
    add('damage', 'Flow does not provide confidentiality', 2)
  }
  if (attrs.providesIntegrity === false && threat.category === 'T') {
    add('damage', 'Flow does not provide integrity', 2)
  }
  if (['Wifi', 'Bluetooth', '2G-4G'].includes(attrs.physicalNetwork as string)) {
    add('discoverability', `Transmitted over ${attrs.physicalNetwork} (wireless)`, 1)
  }

  return contributions
}

/** Compliance-tagged elements (Release 5) get a modest bump on the
 *  categories where regulatory scope actually matters — confidentiality
 *  (Information Disclosure) and integrity (Tampering). Breach impact for
 *  regulated data tends to be broad (legal/financial/reputational), hence
 *  damage over exploitability/discoverability. */
function complianceContributions(threat: Threat, diagram: Diagram): DreadContribution[] {
  // Information Disclosure and Tampering are the obvious fits (confidentiality/
  // integrity of regulated data). Repudiation is included too — SOX and CMMC in
  // particular are fundamentally about audit-trail/accountability, so a
  // compliance-tagged asset with weak non-repudiation controls carries real
  // regulatory risk. Spoofing/DoS/Elevation-of-Privilege are deliberately left
  // out — there's no clean, statable reason compliance scope specifically
  // worsens those, and an unexplainable blanket bump is worse than no bump.
  if (threat.category !== 'I' && threat.category !== 'T' && threat.category !== 'R') return []
  const complianceByNode = computeEffectiveComplianceTags(diagram)
  const tags: Set<ComplianceTag> | undefined =
    threat.targetType === 'node'
      ? complianceByNode.get(threat.targetId)
      : (() => {
          const edge = diagram.edges.find((e) => e.id === threat.targetId)
          if (!edge) return undefined
          return new Set([...(complianceByNode.get(edge.source) ?? []), ...(complianceByNode.get(edge.target) ?? [])])
        })()
  if (!tags || tags.size === 0) return []
  const label = `Compliance scope: ${[...tags].sort().join(', ')}`
  return [
    { key: 'damage', label, amount: 2 },
    { key: 'affectedUsers', label, amount: 1 },
  ]
}

/** The first *negative* contributions in this codebase: a flow whose source
 *  is a declared mitigation control (Release 6) gets a reduced score on
 *  Tampering — the one category its declared properties (blocks unauthorized
 *  traffic / inspects payload) most directly speak to. Spoofing/Information
 *  Disclosure are deliberately left alone: there's no clean, statable
 *  mechanism by which those properties specifically reduce *those*, same bar
 *  Release 5's compliance bump used. Denial of Service joined in Release 10,
 *  gated on the mitigation's own `rateLimitingEnabled` — the first mitigation
 *  attribute with a clean, statable reason to reduce *that* category
 *  specifically (API Gateway's whole reason for existing here). Never
 *  suppresses the threat itself or auto-resolves it — a human still has to
 *  review and close it out; this only lowers the starting suggestion, gated
 *  on the control's ruleset being confirmed current (`rulesUpToDate !==
 *  false`) so a stale control doesn't get credit for protection it may no
 *  longer reliably provide. */
function mitigationContributions(threat: Threat, diagram: Diagram): DreadContribution[] {
  if (threat.targetType !== 'edge') return []
  if (threat.category !== 'T' && threat.category !== 'D') return []
  const edge = diagram.edges.find((e) => e.id === threat.targetId)
  const source = edge && diagram.nodes.find((n) => n.id === edge.source)
  if (!source || source.data.elementType !== 'mitigation') return []
  const attrs = source.data.attributes ?? {}
  const rulesCurrent = attrs.rulesUpToDate !== false
  const contributions: DreadContribution[] = []
  if (threat.category === 'T') {
    if (attrs.blocksUnauthorizedTraffic === true && rulesCurrent) {
      contributions.push({ key: 'exploitability', label: `${source.data.label} blocks unauthorized traffic`, amount: -2 })
    }
    if (attrs.inspectsPayload === true && rulesCurrent) {
      contributions.push({ key: 'exploitability', label: `${source.data.label} inspects payload content`, amount: -1 })
      contributions.push({ key: 'damage', label: `${source.data.label} inspects payload content`, amount: -1 })
    }
  }
  if (threat.category === 'D' && attrs.rateLimitingEnabled === true && rulesCurrent) {
    contributions.push({ key: 'exploitability', label: `${source.data.label} enforces rate limiting`, amount: -2 })
    contributions.push({ key: 'affectedUsers', label: `${source.data.label} enforces rate limiting`, amount: -1 })
  }
  return contributions
}

/** AI/ML risk surface (Release 10), the edge half — a flow terminating at
 *  an external entity declared as a third-party AI/LLM provider gets an
 *  Information Disclosure bump, since data leaving the trust boundary in a
 *  prompt to an external model is the sharpest real-world version of this
 *  risk. Deliberately only Information Disclosure, not every category —
 *  same "no clean statable reason, don't force it" rule the compliance and
 *  mitigation bumps already follow. The process half of this risk surface
 *  (usesAI) is handled in `attributeContributions` above since it's a plain
 *  node attribute; this one needs `diagram` to look past the edge's own
 *  attributes to its target node's. */
function aiContributions(threat: Threat, diagram: Diagram): DreadContribution[] {
  if (threat.targetType !== 'edge' || threat.category !== 'I') return []
  const edge = diagram.edges.find((e) => e.id === threat.targetId)
  const target = edge && diagram.nodes.find((n) => n.id === edge.target)
  if (!target || target.data.elementType !== 'external-entity') return []
  if (target.data.attributes?.usesThirdPartyAIProvider !== true) return []
  return [
    { key: 'damage', label: `Sends data to ${target.data.label}, a third-party AI/LLM provider`, amount: 2 },
    { key: 'affectedUsers', label: `Sends data to ${target.data.label}, a third-party AI/LLM provider`, amount: 1 },
  ]
}

/** Full breakdown of why a threat's suggested DREAD score is what it is —
 *  base score plus every contributing adjustment, each labeled. Powers the
 *  per-field "why this number" hover in ThreatsPanel; `suggestDreadScore`
 *  is just this, summed per key. */
export function explainDreadScore(threat: Threat, diagram: Diagram): DreadContribution[] {
  const target =
    threat.targetType === 'node'
      ? diagram.nodes.find((n) => n.id === threat.targetId)
      : diagram.edges.find((e) => e.id === threat.targetId)
  const attrs = target?.data?.attributes as Record<string, AttributeValue> | undefined

  return [
    ...baseContributions(threat.category),
    ...contextContributions(threat),
    ...attributeContributions(threat, attrs),
    ...complianceContributions(threat, diagram),
    ...mitigationContributions(threat, diagram),
    ...aiContributions(threat, diagram),
  ]
}

/** Rough starting point for DREAD scoring, derived from the threat's STRIDE
 *  category plus context the rule engine already flagged (trust-boundary
 *  crossing, unencrypted sensitive data, compliance scope, and the target's
 *  MS-TMT security attributes). Meant to save the user from staring at 5
 *  blank fields, not to be authoritative — every threat scored this way is
 *  flagged `dreadNeedsReview` until a human confirms or edits it. */
export function suggestDreadScore(threat: Threat, diagram: Diagram): DreadScore {
  const contributions = explainDreadScore(threat, diagram)
  const score = {} as DreadScore
  for (const key of DREAD_KEYS) {
    const total = contributions.filter((c) => c.key === key).reduce((sum, c) => sum + c.amount, 0)
    score[key] = clamp(total)
  }
  return score
}

/** What a threat's DREAD score would be with no mitigation credit applied —
 *  every contribution in the frozen breakdown except the negative
 *  (mitigation-driven) ones. `threat.dread` is already the *residual*
 *  score (mitigations included); this is the "before" number to show next
 *  to it (Release 11). Derived from the already-frozen `dreadBreakdown`,
 *  not recomputed against the live diagram — same reasoning as the DREAD
 *  breakdown persistence fix above: a threat's numbers should always
 *  explain themselves against what was frozen, not silently drift with
 *  later diagram edits. */
export function inherentDreadScore(threat: Threat): DreadScore | null {
  if (!threat.dreadBreakdown || threat.dreadBreakdown.length === 0) return null
  const score = {} as DreadScore
  for (const key of DREAD_KEYS) {
    const total = threat.dreadBreakdown.filter((c) => c.key === key && c.amount >= 0).reduce((sum, c) => sum + c.amount, 0)
    score[key] = clamp(total)
  }
  return score
}

/** Whether at least one mitigation-driven reduction is present in the
 *  breakdown — gates whether the inherent number is worth showing at all.
 *  Most threats have no mitigation on their flow, so inherent === residual
 *  and a second identical number would just be noise, not information. */
export function hasMitigationCredit(threat: Threat): boolean {
  return (threat.dreadBreakdown ?? []).some((c) => c.amount < 0)
}

export function dreadTotal(score?: DreadScore): number | null {
  if (!score) return null
  const values = DREAD_KEYS.map((k) => score[k])
  if (values.some((v) => v === undefined)) return null
  return values.reduce<number>((sum, v) => sum + (v as number), 0)
}

export function dreadAverage(score?: DreadScore): number | null {
  const total = dreadTotal(score)
  return total === null ? null : total / DREAD_KEYS.length
}

export type DreadRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export function dreadRiskLevel(average: number): DreadRiskLevel {
  if (average < 4) return 'Low'
  if (average < 6.5) return 'Medium'
  if (average < 8.5) return 'High'
  return 'Critical'
}

export const DREAD_RISK_COLOR: Record<DreadRiskLevel, string> = {
  Low: '#4ade80',
  Medium: '#f59e0b',
  High: '#fb7185',
  Critical: '#ef4444',
}
