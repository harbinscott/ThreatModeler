import { useEffect, useRef, useState } from 'react'
import { FrameworkPicker } from '../components/FrameworkPicker'
import { PROJECT_TEMPLATES } from '../templates/projectTemplates'
import { importTerraformSource, type TerraformImportResult } from '../iac/terraformImport'
import type { FrameworkSelection, NewProjectInput } from '../types/project'
import './NewProjectWizard.css'

interface NewProjectWizardProps {
  onCancel: () => void
  onCreate: (input: NewProjectInput) => Promise<void>
}

/** Sentinel `templateId` for the "Import from Terraform" card — distinct
 *  from every real `PROJECT_TEMPLATES` id, since picking it doesn't select
 *  a pre-built diagram the way the others do, it triggers a file picker
 *  and generates one from whatever the user chose. */
const TERRAFORM_IMPORT_ID = 'terraform-import'

export function NewProjectWizard({ onCancel, onCreate }: NewProjectWizardProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frameworks, setFrameworks] = useState<FrameworkSelection>({
    stride: true,
    dread: true,
    pasta: false,
  })
  const [templateId, setTemplateId] = useState(PROJECT_TEMPLATES[0].id)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [terraformImport, setTerraformImport] = useState<(TerraformImportResult & { fileName: string }) | null>(null)

  const canSubmit = name.trim().length > 0 && !submitting

  async function handleImportTerraform() {
    setImportError(null)
    setImporting(true)
    try {
      const picked = await window.api.importTerraformFile()
      if (picked.canceled || !picked.content) return
      const result = importTerraformSource(picked.content)
      if (result.summary.importedCount === 0) {
        setImportError(
          `No recognized resources found in ${picked.fileName} — nothing to import. See the Terraform import scope notes if a resource type you expected is missing.`
        )
        setTerraformImport(null)
        return
      }
      setTerraformImport({ ...result, fileName: picked.fileName ?? 'import.tf' })
      setTemplateId(TERRAFORM_IMPORT_ID)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to read or parse that Terraform file.')
      setTerraformImport(null)
    } finally {
      setImporting(false)
    }
  }

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
      const diagram =
        templateId === TERRAFORM_IMPORT_ID
          ? terraformImport?.diagram
          : PROJECT_TEMPLATES.find((t) => t.id === templateId)?.build()
      await onCreate({ name: name.trim(), description: description.trim(), frameworks, diagram })
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

        <div className="field">
          <span className="field__label">Starting point</span>
          <div className="template-picker">
            {PROJECT_TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`template-card${templateId === t.id ? ' template-card--on' : ''}`}
                onClick={() => {
                  setTemplateId(t.id)
                  setImportError(null)
                }}
                aria-pressed={templateId === t.id}
              >
                <span className="template-card__name">{t.name}</span>
                <p className="template-card__description">{t.description}</p>
              </button>
            ))}
            <button
              type="button"
              className={`template-card${templateId === TERRAFORM_IMPORT_ID ? ' template-card--on' : ''}`}
              onClick={handleImportTerraform}
              aria-pressed={templateId === TERRAFORM_IMPORT_ID}
              disabled={importing}
            >
              <span className="template-card__name">Import from Terraform</span>
              <p className="template-card__description">
                {importing
                  ? 'Reading file…'
                  : terraformImport && templateId === TERRAFORM_IMPORT_ID
                    ? `${terraformImport.fileName} selected — click to pick a different file.`
                    : 'Pick a .tf file — resources become a starter diagram (v1: single file, AWS resource types only).'}
              </p>
            </button>
          </div>
          {importError && <p className="template-picker__error">{importError}</p>}
          {terraformImport && templateId === TERRAFORM_IMPORT_ID && (
            <p className="template-picker__summary">
              {terraformImport.summary.importedCount} element{terraformImport.summary.importedCount === 1 ? '' : 's'} imported,{' '}
              {terraformImport.summary.edgeCount} flow{terraformImport.summary.edgeCount === 1 ? '' : 's'} inferred
              {terraformImport.summary.skippedCount > 0 && (
                <>
                  , {terraformImport.summary.skippedCount} resource{terraformImport.summary.skippedCount === 1 ? '' : 's'} skipped
                  (unrecognized type{terraformImport.summary.skippedTypes.length === 1 ? '' : 's'}:{' '}
                  {terraformImport.summary.skippedTypes.join(', ')})
                </>
              )}
              . No External Entity nodes are generated automatically — add any users/external actors by hand.
            </p>
          )}
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
