import { useMemo, useState } from 'react'
import type { Diagram, PastaData, StrideCategory, Threat } from '../types/project'
import { dreadAverage, dreadRiskLevel, DREAD_RISK_COLOR, type DreadRiskLevel } from '../threats/dreadEngine'
import './PastaWorkflow.css'

interface PastaWorkflowProps {
  pasta: PastaData
  onChange: (pasta: PastaData) => void
  diagram: Diagram
  threats: Threat[]
  dreadEnabled: boolean
}

const STAGES = [
  { key: 'stage1', number: 1, title: 'Define Objectives' },
  { key: 'stage2', number: 2, title: 'Define Technical Scope' },
  { key: 'stage3', number: 3, title: 'Application Decomposition' },
  { key: 'stage4', number: 4, title: 'Threat Analysis' },
  { key: 'stage5', number: 5, title: 'Vulnerability & Weakness Analysis' },
  { key: 'stage6', number: 6, title: 'Attack Modeling' },
  { key: 'stage7', number: 7, title: 'Risk & Impact Analysis' },
] as const satisfies readonly { key: keyof PastaData; number: number; title: string }[]

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

const RISK_LEVELS: DreadRiskLevel[] = ['Low', 'Medium', 'High', 'Critical']

export function PastaWorkflow({ pasta, onChange, diagram, threats, dreadEnabled }: PastaWorkflowProps) {
  const [stageIndex, setStageIndex] = useState(0)
  const stage = STAGES[stageIndex]

  function setField<K extends keyof PastaData>(key: K, patch: Partial<PastaData[K]>) {
    onChange({ ...pasta, [key]: { ...pasta[key], ...patch } })
  }

  const decompositionCounts = useMemo(() => {
    const counts: Record<string, number> = { process: 0, 'external-entity': 0, 'data-store': 0, 'trust-boundary': 0 }
    for (const n of diagram.nodes) counts[n.data.elementType] = (counts[n.data.elementType] ?? 0) + 1
    return counts
  }, [diagram])

  const threatsByCategory = useMemo(() => {
    const counts: Record<StrideCategory, number> = { S: 0, T: 0, R: 0, I: 0, D: 0, E: 0 }
    for (const t of threats) counts[t.category] += 1
    return counts
  }, [threats])

  const riskLevelCounts = useMemo(() => {
    const counts: Record<DreadRiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 }
    for (const t of threats) {
      const avg = dreadAverage(t.dread)
      if (avg !== null) counts[dreadRiskLevel(avg)] += 1
    }
    return counts
  }, [threats])

  return (
    <div className="pasta-workflow">
      <ol className="pasta-stepper">
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className={`pasta-stepper__item${i === stageIndex ? ' pasta-stepper__item--active' : ''}`}
              onClick={() => setStageIndex(i)}
            >
              <span className="pasta-stepper__number">{s.number}</span>
              <span className="pasta-stepper__title">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="pasta-stage">
        <h2>
          Stage {stage.number}: {stage.title}
        </h2>

        {stage.key === 'stage1' && (
          <div className="pasta-stage__fields">
            <label className="pasta-field">
              <span>Business objectives</span>
              <textarea
                rows={3}
                value={pasta.stage1.businessObjectives}
                onChange={(e) => setField('stage1', { businessObjectives: e.target.value })}
                placeholder="What is this application for, and what does the business need it to protect?"
              />
            </label>
            <label className="pasta-field">
              <span>Compliance requirements</span>
              <textarea
                rows={2}
                value={pasta.stage1.complianceRequirements}
                onChange={(e) => setField('stage1', { complianceRequirements: e.target.value })}
                placeholder="e.g. PCI-DSS, HIPAA, GDPR, SOC 2…"
              />
            </label>
            <label className="pasta-field">
              <span>Risk tolerance</span>
              <select
                value={pasta.stage1.riskTolerance}
                onChange={(e) => setField('stage1', { riskTolerance: e.target.value })}
              >
                <option value="">— not set —</option>
                <option value="Low">Low — minimize risk aggressively</option>
                <option value="Medium">Medium — balance risk and delivery speed</option>
                <option value="High">High — accept risk for speed/flexibility</option>
              </select>
            </label>
            <label className="pasta-field">
              <span>Key stakeholders</span>
              <textarea
                rows={2}
                value={pasta.stage1.keyStakeholders}
                onChange={(e) => setField('stage1', { keyStakeholders: e.target.value })}
                placeholder="Who owns this application and who needs to sign off on residual risk?"
              />
            </label>
          </div>
        )}

        {stage.key === 'stage2' && (
          <div className="pasta-stage__fields">
            <label className="pasta-field">
              <span>Technologies & tech stack</span>
              <textarea
                rows={3}
                value={pasta.stage2.technologies}
                onChange={(e) => setField('stage2', { technologies: e.target.value })}
                placeholder="Languages, frameworks, runtime, hosting environment…"
              />
            </label>
            <label className="pasta-field">
              <span>Third-party dependencies</span>
              <textarea
                rows={2}
                value={pasta.stage2.thirdPartyDependencies}
                onChange={(e) => setField('stage2', { thirdPartyDependencies: e.target.value })}
                placeholder="External libraries, SaaS integrations, vendor services…"
              />
            </label>
            <label className="pasta-field">
              <span>Network / deployment notes</span>
              <textarea
                rows={2}
                value={pasta.stage2.networkNotes}
                onChange={(e) => setField('stage2', { networkNotes: e.target.value })}
                placeholder="Where does this run, and what network zones does it touch?"
              />
            </label>
          </div>
        )}

        {stage.key === 'stage3' && (
          <div className="pasta-stage__fields">
            <div className="pasta-summary">
              <div className="pasta-summary__title">From your diagram</div>
              <div className="pasta-summary__row">
                <span>Processes</span>
                <strong>{decompositionCounts.process}</strong>
              </div>
              <div className="pasta-summary__row">
                <span>Data stores</span>
                <strong>{decompositionCounts['data-store']}</strong>
              </div>
              <div className="pasta-summary__row">
                <span>External entities</span>
                <strong>{decompositionCounts['external-entity']}</strong>
              </div>
              <div className="pasta-summary__row">
                <span>Trust boundaries</span>
                <strong>{decompositionCounts['trust-boundary']}</strong>
              </div>
              <div className="pasta-summary__row">
                <span>Data flows</span>
                <strong>{diagram.edges.length}</strong>
              </div>
            </div>
            <label className="pasta-field">
              <span>Entry points</span>
              <textarea
                rows={3}
                value={pasta.stage3.entryPoints}
                onChange={(e) => setField('stage3', { entryPoints: e.target.value })}
                placeholder="Which elements above are reachable by an attacker, and how?"
              />
            </label>
            <label className="pasta-field">
              <span>Trust level notes</span>
              <textarea
                rows={2}
                value={pasta.stage3.trustLevelNotes}
                onChange={(e) => setField('stage3', { trustLevelNotes: e.target.value })}
                placeholder="Which trust boundaries matter most, and why?"
              />
            </label>
          </div>
        )}

        {stage.key === 'stage4' && (
          <div className="pasta-stage__fields">
            <div className="pasta-summary">
              <div className="pasta-summary__title">From your STRIDE threats ({threats.length} total)</div>
              {(Object.keys(threatsByCategory) as StrideCategory[]).map((cat) => (
                <div className="pasta-summary__row" key={cat}>
                  <span>
                    {cat} — {CATEGORY_NAMES[cat]}
                  </span>
                  <strong>{threatsByCategory[cat]}</strong>
                </div>
              ))}
              {threats.length === 0 && <p className="pasta-summary__empty">Regenerate threats on the Diagram tab first.</p>}
            </div>
            <label className="pasta-field">
              <span>Threat agents</span>
              <textarea
                rows={2}
                value={pasta.stage4.threatAgents}
                onChange={(e) => setField('stage4', { threatAgents: e.target.value })}
                placeholder="Who might attack this system? Malicious insider, opportunistic external attacker, organized crime, nation-state…"
              />
            </label>
            <label className="pasta-field">
              <span>Attack scenarios</span>
              <textarea
                rows={3}
                value={pasta.stage4.attackScenarios}
                onChange={(e) => setField('stage4', { attackScenarios: e.target.value })}
                placeholder="Narrative scenarios of how an attacker could chain the threats above into a real incident."
              />
            </label>
          </div>
        )}

        {stage.key === 'stage5' && (
          <div className="pasta-stage__fields">
            <label className="pasta-field">
              <span>Known vulnerabilities / weaknesses</span>
              <textarea
                rows={3}
                value={pasta.stage5.knownVulnerabilities}
                onChange={(e) => setField('stage5', { knownVulnerabilities: e.target.value })}
                placeholder="Specific CVEs, CWEs, or known weak points in the technologies from Stage 2."
              />
            </label>
            <label className="pasta-field">
              <span>Mapping notes</span>
              <textarea
                rows={2}
                value={pasta.stage5.mappingNotes}
                onChange={(e) => setField('stage5', { mappingNotes: e.target.value })}
                placeholder="How do these vulnerabilities relate to the threats identified in Stage 4?"
              />
            </label>
          </div>
        )}

        {stage.key === 'stage6' && (
          <div className="pasta-stage__fields">
            <label className="pasta-field">
              <span>Attack trees / attack paths</span>
              <textarea
                rows={3}
                value={pasta.stage6.attackTrees}
                onChange={(e) => setField('stage6', { attackTrees: e.target.value })}
                placeholder="Step-by-step paths an attacker could take, from entry point to objective."
              />
            </label>
            <label className="pasta-field">
              <span>Simulation notes</span>
              <textarea
                rows={2}
                value={pasta.stage6.simulationNotes}
                onChange={(e) => setField('stage6', { simulationNotes: e.target.value })}
                placeholder="Results from any manual testing, red-teaming, or tabletop exercises."
              />
            </label>
          </div>
        )}

        {stage.key === 'stage7' && (
          <div className="pasta-stage__fields">
            <div className="pasta-summary">
              <div className="pasta-summary__title">From your DREAD scores</div>
              {dreadEnabled ? (
                RISK_LEVELS.map((level) => (
                  <div className="pasta-summary__row" key={level}>
                    <span style={{ color: DREAD_RISK_COLOR[level] }}>{level}</span>
                    <strong>{riskLevelCounts[level]}</strong>
                  </div>
                ))
              ) : (
                <p className="pasta-summary__empty">Enable DREAD scoring on this project for a risk-level breakdown.</p>
              )}
            </div>
            <label className="pasta-field">
              <span>Business impact</span>
              <textarea
                rows={3}
                value={pasta.stage7.businessImpact}
                onChange={(e) => setField('stage7', { businessImpact: e.target.value })}
                placeholder="What happens to the business if the highest-risk threats above are exploited?"
              />
            </label>
            <label className="pasta-field">
              <span>Residual risk</span>
              <textarea
                rows={2}
                value={pasta.stage7.residualRisk}
                onChange={(e) => setField('stage7', { residualRisk: e.target.value })}
                placeholder="What risk remains after planned mitigations, and who accepts it?"
              />
            </label>
            <label className="pasta-field">
              <span>Recommended countermeasures</span>
              <textarea
                rows={3}
                value={pasta.stage7.countermeasures}
                onChange={(e) => setField('stage7', { countermeasures: e.target.value })}
                placeholder="Prioritized list of mitigations, tied back to the highest-risk threats."
              />
            </label>
          </div>
        )}

        <div className="pasta-stage__nav">
          <button type="button" className="btn" disabled={stageIndex === 0} onClick={() => setStageIndex((i) => i - 1)}>
            ← Back
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={stageIndex === STAGES.length - 1}
            onClick={() => setStageIndex((i) => i + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
