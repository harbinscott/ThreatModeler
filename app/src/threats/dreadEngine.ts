import type { AttributeValue, Diagram, DreadScore, StrideCategory, Threat } from '../types/project'

const BASE_SCORES: Record<StrideCategory, Required<DreadScore>> = {
  S: { damage: 6, reproducibility: 6, exploitability: 5, affectedUsers: 5, discoverability: 5 },
  T: { damage: 7, reproducibility: 5, exploitability: 5, affectedUsers: 5, discoverability: 4 },
  R: { damage: 4, reproducibility: 7, exploitability: 6, affectedUsers: 3, discoverability: 3 },
  I: { damage: 7, reproducibility: 6, exploitability: 5, affectedUsers: 6, discoverability: 5 },
  D: { damage: 6, reproducibility: 7, exploitability: 6, affectedUsers: 8, discoverability: 6 },
  E: { damage: 9, reproducibility: 4, exploitability: 4, affectedUsers: 7, discoverability: 3 },
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, n))
}

const DREAD_KEYS: (keyof DreadScore)[] = ['damage', 'reproducibility', 'exploitability', 'affectedUsers', 'discoverability']

/** Adjustments derived from the target node/edge's MS-TMT security attributes —
 *  these are the same signals ruleEngine.ts folds into threat descriptions,
 *  reused here so a process with no authentication or a data flow with no
 *  confidentiality protection also scores higher, not just reads scarier. */
function attributeAdjustments(threat: Threat, attrs: Record<string, AttributeValue> | undefined): Partial<Record<keyof DreadScore, number>> {
  if (!attrs) return {}
  const delta: Partial<Record<keyof DreadScore, number>> = {}
  const bump = (key: keyof DreadScore, amount: number) => {
    delta[key] = (delta[key] ?? 0) + amount
  }

  // Process
  if (attrs.implementsAuthentication === false && (threat.category === 'S' || threat.category === 'E')) {
    bump('exploitability', 2)
  }
  if (attrs.implementsAuthorization === false && threat.category === 'E') {
    bump('damage', 2)
  }
  if (attrs.sanitizesInput === false && threat.category === 'T') {
    bump('exploitability', 2)
  }
  if (attrs.sanitizesOutput === false && threat.category === 'I') {
    bump('exploitability', 1)
  }
  if (['Kernel', 'System', 'Administrator'].includes(attrs.runningAs as string) && threat.category === 'E') {
    bump('damage', 2)
  }

  // Data store
  if (attrs.storesCredentials === true && attrs.encryptedAtRest !== true && threat.category === 'I') {
    bump('damage', 3)
    bump('affectedUsers', 2)
  }
  if (attrs.signed === false && threat.category === 'T') {
    bump('damage', 1)
  }

  // External interactor
  if (attrs.authenticated === false && threat.category === 'S') {
    bump('exploitability', 2)
  }

  // Data flow
  if ((attrs.sourceAuthenticated === false || attrs.destinationAuthenticated === false) && threat.category === 'T') {
    bump('exploitability', 2)
  }
  if (attrs.providesConfidentiality === false && threat.category === 'I') {
    bump('damage', 2)
  }
  if (attrs.providesIntegrity === false && threat.category === 'T') {
    bump('damage', 2)
  }
  if (['Wifi', 'Bluetooth', '2G-4G'].includes(attrs.physicalNetwork as string)) {
    bump('discoverability', 1)
  }

  return delta
}

/** Rough starting point for DREAD scoring, derived from the threat's STRIDE
 *  category plus context the rule engine already flagged (trust-boundary
 *  crossing, unencrypted sensitive data, and now the target's MS-TMT security
 *  attributes). Meant to save the user from staring at 5 blank fields, not to
 *  be authoritative — every threat scored this way is flagged
 *  `dreadNeedsReview` until a human confirms or edits it. */
export function suggestDreadScore(threat: Threat, diagram: Diagram): DreadScore {
  const score: DreadScore = { ...BASE_SCORES[threat.category] }

  const crossesBoundary = threat.ruleId.includes('boundary')
  const highPriority = threat.description.includes('high priority')

  if (crossesBoundary) {
    score.exploitability = clamp(score.exploitability! + 2)
    score.discoverability = clamp(score.discoverability! + 1)
  }
  if (highPriority) {
    score.damage = clamp(score.damage! + 2)
    score.affectedUsers = clamp(score.affectedUsers! + 2)
  }

  const target =
    threat.targetType === 'node'
      ? diagram.nodes.find((n) => n.id === threat.targetId)
      : diagram.edges.find((e) => e.id === threat.targetId)
  const attrs = target?.data?.attributes as Record<string, AttributeValue> | undefined
  const delta = attributeAdjustments(threat, attrs)
  for (const key of DREAD_KEYS) {
    const amount = delta[key]
    if (amount) score[key] = clamp((score[key] ?? 5) + amount)
  }

  return score
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
