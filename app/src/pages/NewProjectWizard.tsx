import { useEffect, useRef, useState } from 'react'
import { FrameworkPicker } from '../components/FrameworkPicker'
import type { FrameworkSelection, NewProjectInput } from '../types/project'
import './NewProjectWizard.css'

interface NewProjectWizardProps {
  onCancel: () => void
  onCreate: (input: NewProjectInput) => Promise<void>
}

export function NewProjectWizard({ onCancel, onCreate }: NewProjectWizardProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frameworks, setFrameworks] = useState<FrameworkSelection>({
    stride: true,
    dread: true,
    pasta: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = name.trim().length > 0 && !submitting

  // Plain `autoFocus` is unreliable here — this wizard mounts fresh each time
  // the user clicks "New Project" (App.tsx swaps it in via a state change,
  // not on initial page load), and React's autoFocus-on-mount occasionally
  // lost the race against React 19 StrictMode's double-invoked commit in dev,
  // leaving the input visible but not actually focused. An explicit effect
  // with a ref is the standard fix — idempotent even if it fires twice.
  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onCreate({ name: name.trim(), description: description.trim(), frameworks })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wizard">
      <header className="wizard__header">
        <h1>New Project</h1>
        <p className="wizard__subtitle">
          Name your threat model and choose which frameworks apply. You can change this later.
        </p>
      </header>

      <form className="wizard__form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Project name</span>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Payments API"
          />
        </label>

        <label className="field">
          <span className="field__label">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What system or feature are you modeling?"
            rows={3}
          />
        </label>

        <div className="field">
          <span className="field__label">Threat modeling approach</span>
          <FrameworkPicker value={frameworks} onChange={setFrameworks} />
        </div>

        <div className="wizard__actions">
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
