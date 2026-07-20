import { useState } from 'react'
import { Modal } from './Modal'
import './GettingStartedDialog.css'

interface GettingStartedDialogProps {
  onClose: () => void
}

type Tab = 'guide' | 'shortcuts'

const STEPS = [
  {
    title: 'Create a project',
    body: 'Pick which frameworks apply (STRIDE, DREAD, PASTA — layered, not exclusive), then start from a blank canvas, a starter template, or import an existing Terraform file to auto-generate a diagram.',
  },
  {
    title: 'Draw your diagram',
    body: 'Drag Process, Data Store, External Entity, Mitigation, and Trust Boundary shapes onto the canvas, then connect them with data flows. The Inspector panel edits whatever is selected.',
  },
  {
    title: 'Generate threats',
    body: 'Click "Regenerate Threats" to auto-generate STRIDE threats from your diagram\'s structure and the security properties you\'ve set on each element.',
  },
  {
    title: 'Score DREAD',
    body: 'Review the auto-suggested Damage / Reproducibility / Exploitability / Affected Users / Discoverability scores on each threat — hover "Why these scores?" to see exactly what drove each number, and adjust anything that needs a human judgment call.',
  },
  {
    title: 'Export & report',
    body: 'Use the Export menu for a PDF report, a risk-register CSV, a standalone diagram image, or SARIF/OTM for handing off to other tooling.',
  },
]

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z or Ctrl+Y', action: 'Redo' },
  { keys: 'Delete / Backspace', action: 'Delete selection' },
  { keys: 'Ctrl+C', action: 'Copy selection' },
  { keys: 'Ctrl+V', action: 'Paste' },
  { keys: 'Double-click project title', action: 'Rename project' },
]

/** Release 16 stage D — the app had zero help/onboarding surface anywhere
 *  before this; scoped deliberately small (one dialog, no external site, no
 *  per-feature help content) per explicit user sign-off. Reuses the generic
 *  `Modal` every other dialog in the app already uses. */
export function GettingStartedDialog({ onClose }: GettingStartedDialogProps) {
  const [tab, setTab] = useState<Tab>('guide')

  return (
    <Modal title="Getting Started" onClose={onClose} width={560}>
      <div className="getting-started__tabs">
        <button
          type="button"
          className={`getting-started__tab${tab === 'guide' ? ' getting-started__tab--active' : ''}`}
          onClick={() => setTab('guide')}
        >
          Getting Started
        </button>
        <button
          type="button"
          className={`getting-started__tab${tab === 'shortcuts' ? ' getting-started__tab--active' : ''}`}
          onClick={() => setTab('shortcuts')}
        >
          Shortcuts
        </button>
      </div>

      {tab === 'guide' && (
        <ol className="getting-started__steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="getting-started__step">
              <span className="getting-started__step-num">{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {tab === 'shortcuts' && (
        <>
          <table className="getting-started__shortcuts">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.action}>
                  <td>
                    <kbd>{s.keys}</kbd>
                  </td>
                  <td>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="getting-started__note">Shortcuts are active while the Diagram tab is focused, and are skipped while typing in a field.</p>
        </>
      )}
    </Modal>
  )
}
