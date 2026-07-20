import type { Diagram, Project, StrideCategory, Threat } from '../types/project'
import { innermostBoundary } from '../canvas/boundaryGeometry'
import { dreadAverage, dreadRiskLevel } from './dreadEngine'

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

/* ------------------------------------------------------------------------
 * SARIF 2.1.0 — threats as scan "results", for ingestion by CI/security
 * tooling that already consumes SARIF from other scanners. Threats have no
 * source file, so every result uses a `logicalLocations` entry (SARIF's
 * spec explicitly supports non-file-based analysis this way) rather than a
 * `physicalLocation`.
 * ---------------------------------------------------------------------- */

type SarifLevel = 'error' | 'warning' | 'note'

function sarifLevel(threat: Threat): SarifLevel {
  const avg = dreadAverage(threat.dread)
  if (avg === null) return 'warning'
  const level = dreadRiskLevel(avg)
  if (level === 'Critical' || level === 'High') return 'error'
  if (level === 'Medium') return 'warning'
  return 'note'
}

/** Exports whatever threat list the caller hands in (e.g. the Threats tab's
 *  currently filtered list, same posture as `threatsToCsv`) as a single
 *  SARIF run. One rule per distinct `ruleId` seen, deduped rather than
 *  emitting the full built-in rule catalog, since a SARIF consumer only
 *  needs to resolve the rules actually referenced by a result. */
export function threatsToSarif(threats: Threat[]): string {
  const ruleIds = Array.from(new Set(threats.map((t) => t.ruleId))).sort()
  const rules = ruleIds.map((ruleId) => {
    const example = threats.find((t) => t.ruleId === ruleId)!
    return {
      id: ruleId,
      name: CATEGORY_NAMES[example.category],
      shortDescription: { text: `${CATEGORY_NAMES[example.category]} threats identified by rule "${ruleId}"` },
      properties: { strideCategory: example.category },
    }
  })

  const results = threats.map((t) => {
    const avg = dreadAverage(t.dread)
    const result: Record<string, unknown> = {
      ruleId: t.ruleId,
      level: sarifLevel(t),
      message: { text: t.description },
      locations: [
        {
          logicalLocations: [
            { name: t.targetLabel, fullyQualifiedName: t.targetId, kind: t.targetType === 'node' ? 'element' : 'dataflow' },
          ],
        },
      ],
      properties: {
        strideCategory: t.category,
        status: t.status,
        ...(avg !== null ? { dreadAverage: Number(avg.toFixed(1)), riskLevel: dreadRiskLevel(avg) } : {}),
      },
    }
    // SARIF's suppressions mechanism is the correct, tool-recognized way to
    // say "don't count this as an active finding" — a status-aware consumer
    // (e.g. a CI gate) can filter these out without guessing from `status`.
    if (t.status === 'false-positive') {
      result.suppressions = [{ kind: 'external', justification: t.notes || 'Marked as a false positive in Threat Modeler.' }]
    }
    return result
  })

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Threat Modeler',
            informationUri: 'https://github.com/harbinscott/ThreatModeler',
            rules,
          },
        },
        results,
      },
    ],
  }
  return JSON.stringify(sarif, null, 2)
}

/* ------------------------------------------------------------------------
 * OTM (Open Threat Model) 0.2.0 — the full diagram + threats as an open
 * interchange format other threat-modeling tools (e.g. IriusRisk) can read,
 * unlike SARIF above which only carries the threat list. Trust boundaries
 * map to `trustZones`; every other element maps to a `component`; edges map
 * to `dataflows`; per-target threats are embedded on their owning component
 * or dataflow, each with a likelihood/impact pair derived from the already-
 * scored DREAD fields (impact ~ damage+affectedUsers, likelihood ~
 * reproducibility+exploitability+discoverability) rather than a separate,
 * disconnected number — an unscored threat just omits `risk` entirely
 * rather than emitting a fabricated one.
 * ---------------------------------------------------------------------- */

const ELEMENT_OTM_TYPE: Record<string, string> = {
  process: 'process',
  'external-entity': 'external-entity',
  'data-store': 'data-store',
  mitigation: 'mitigation-control',
}

/** Every component/dataflow needs a `trustZone` parent in OTM — this is the
 *  fallback for anything not inside a drawn trust boundary, since OTM has
 *  no "no zone" concept the way this app's own diagram does. */
const GLOBAL_ZONE_ID = 'zone-unscoped'

function otmThreat(t: Threat) {
  const impact = t.dread ? Math.round(((t.dread.damage ?? 0) + (t.dread.affectedUsers ?? 0)) / 2) : undefined
  const likelihood = t.dread
    ? Math.round(((t.dread.reproducibility ?? 0) + (t.dread.exploitability ?? 0) + (t.dread.discoverability ?? 0)) / 3)
    : undefined
  return {
    id: t.id,
    name: t.title,
    description: t.description,
    categories: [CATEGORY_NAMES[t.category]],
    status: t.status,
    ...(impact !== undefined && likelihood !== undefined ? { risk: { likelihood, impact } } : {}),
  }
}

/** Exports the given diagram/threat level (top or sub-diagram — same
 *  "whichever level is currently active" state Canvas.tsx already threads
 *  into other exports) as a single OTM document. */
export function projectToOtm(project: Project, diagram: Diagram, threats: Threat[]): string {
  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')
  const trustZones = [
    { id: GLOBAL_ZONE_ID, name: 'Unscoped', risk: { trustRating: 10 } },
    ...boundaries.map((b) => ({ id: b.id, name: b.data.label, risk: { trustRating: 50 } })),
  ]

  const threatsByTarget = new Map<string, Threat[]>()
  for (const t of threats) {
    const list = threatsByTarget.get(t.targetId) ?? []
    list.push(t)
    threatsByTarget.set(t.targetId, list)
  }

  const components = diagram.nodes
    .filter((n) => n.data.elementType !== 'trust-boundary')
    .map((n) => {
      const zone = innermostBoundary(n, boundaries)
      return {
        id: n.id,
        name: n.data.label,
        type: ELEMENT_OTM_TYPE[n.data.elementType] ?? n.data.elementType,
        parent: { trustZone: zone?.id ?? GLOBAL_ZONE_ID },
        representations: [{ representation: 'diagram-1', id: `${n.id}-repr`, position: { x: n.position.x, y: n.position.y } }],
        threats: (threatsByTarget.get(n.id) ?? []).map(otmThreat),
      }
    })

  const dataflows = diagram.edges.map((e) => ({
    id: e.id,
    name: e.data?.label || `${e.source} to ${e.target}`,
    source: e.source,
    destination: e.target,
    bidirectional: e.data?.arrowStyle === 'two-way',
    threats: (threatsByTarget.get(e.id) ?? []).map(otmThreat),
  }))

  const otm = {
    otmVersion: '0.2.0',
    project: { name: project.name, id: project.id, description: project.description || undefined },
    representations: [{ name: 'Main diagram', id: 'diagram-1', type: 'diagram' }],
    trustZones,
    components,
    dataflows,
  }
  return JSON.stringify(otm, null, 2)
}
