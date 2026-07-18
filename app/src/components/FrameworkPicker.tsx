import type { FrameworkSelection } from '../types/project'
import './FrameworkPicker.css'

type FrameworkId = keyof FrameworkSelection

interface FrameworkMeta {
  id: FrameworkId
  name: string
  category: 'Diagram-driven identification' | 'Scoring layer' | 'Guided workflow'
  summary: string
  excelsAt: string
  locked?: boolean
}

const FRAMEWORKS: FrameworkMeta[] = [
  {
    id: 'stride',
    name: 'STRIDE',
    category: 'Diagram-driven identification',
    summary: 'Categorizes threats per diagram element and data flow.',
    excelsAt:
      'Systematic, repeatable threat identification tied directly to your architecture diagram. Covers Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege. Best when you have (or are building) a data-flow diagram and want broad engineering-team coverage. Drives this tool\'s diagram canvas and rule engine.',
    locked: true,
  },
  {
    id: 'dread',
    name: 'DREAD',
    category: 'Scoring layer',
    summary: 'Scores and prioritizes threats you\'ve already identified.',
    excelsAt:
      'Not a standalone identification method — a scoring rubric applied to threats found via STRIDE (or PASTA). Rates Damage, Reproducibility, Exploitability, Affected Users, and Discoverability to produce a ranked severity score. Best for deciding what to fix first once you have a threat list.',
  },
  {
    id: 'pasta',
    name: 'PASTA',
    category: 'Guided workflow',
    summary: 'Business-risk-driven, 7-stage process alongside the diagram.',
    excelsAt:
      'Process Attack Simulation and Threat Analysis: a 7-stage methodology starting from business objectives, through technical scope, threat intelligence, vulnerability analysis, attack modeling, and risk/impact analysis. Best for high-value applications where you need to justify security investment to stakeholders. More document-driven than diagram-driven.',
  },
]

interface FrameworkPickerProps {
  value: FrameworkSelection
  onChange: (next: FrameworkSelection) => void
}

export function FrameworkPicker({ value, onChange }: FrameworkPickerProps) {
  function toggle(id: FrameworkId) {
    if (FRAMEWORKS.find((f) => f.id === id)?.locked) return
    onChange({ ...value, [id]: !value[id] })
  }

  return (
    <div className="framework-picker">
      {FRAMEWORKS.map((fw) => (
        <button
          type="button"
          key={fw.id}
          className={`framework-card${value[fw.id] ? ' framework-card--on' : ''}${
            fw.locked ? ' framework-card--locked' : ''
          }`}
          onClick={() => toggle(fw.id)}
          aria-pressed={value[fw.id]}
        >
          <div className="framework-card__header">
            <span className="framework-card__name">{fw.name}</span>
            <span
              className="framework-card__info"
              data-tooltip={fw.excelsAt}
              tabIndex={0}
              aria-label={`What ${fw.name} excels at`}
              onClick={(e) => e.stopPropagation()}
            >
              i
            </span>
          </div>
          <div className="framework-card__category">{fw.category}</div>
          <p className="framework-card__summary">{fw.summary}</p>
          <div className="framework-card__toggle">
            {fw.locked ? 'Always on' : value[fw.id] ? 'Enabled' : 'Disabled'}
          </div>
        </button>
      ))}
    </div>
  )
}
