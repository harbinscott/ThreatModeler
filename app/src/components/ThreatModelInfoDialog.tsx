import { Modal } from './Modal'
import type { Project, ThreatModelInfo } from '../types/project'

interface ThreatModelInfoDialogProps {
  project: Project
  onChange: (patch: Partial<Project>) => void
  onClose: () => void
}

const EMPTY_INFO: ThreatModelInfo = {
  owner: '',
  contributors: '',
  reviewer: '',
  assumptions: '',
  externalDependencies: '',
}

/** Project metadata form, mirroring Microsoft Threat Modeling Tool's File >
 *  Threat Model Information dialog. Name/description already exist as
 *  first-class Project fields (name via the toolbar rename, description as
 *  the "high-level system description") — this just adds the rest. */
export function ThreatModelInfoDialog({ project, onChange, onClose }: ThreatModelInfoDialogProps) {
  const info = { ...EMPTY_INFO, ...project.info }

  function setInfo(patch: Partial<ThreatModelInfo>) {
    onChange({ info: { ...info, ...patch } })
  }

  return (
    <Modal title="Threat Model Information" onClose={onClose} width={560}>
      <label className="modal-field">
        <span>Name</span>
        <input type="text" value={project.name} disabled title="Double-click the title in the toolbar to rename" />
      </label>
      <label className="modal-field">
        <span>High-level system description</span>
        <textarea
          rows={3}
          value={project.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What does this system do, at a glance?"
        />
      </label>
      <label className="modal-field">
        <span>Owner</span>
        <input type="text" value={info.owner} onChange={(e) => setInfo({ owner: e.target.value })} />
      </label>
      <label className="modal-field">
        <span>Contributors</span>
        <input
          type="text"
          value={info.contributors}
          onChange={(e) => setInfo({ contributors: e.target.value })}
          placeholder="Who else worked on this threat model?"
        />
      </label>
      <label className="modal-field">
        <span>Reviewer</span>
        <input type="text" value={info.reviewer} onChange={(e) => setInfo({ reviewer: e.target.value })} />
      </label>
      <label className="modal-field">
        <span>Assumptions</span>
        <textarea
          rows={3}
          value={info.assumptions}
          onChange={(e) => setInfo({ assumptions: e.target.value })}
          placeholder="What are you assuming to be true (or out of scope) for this model?"
        />
      </label>
      <label className="modal-field">
        <span>External dependencies</span>
        <textarea
          rows={2}
          value={info.externalDependencies}
          onChange={(e) => setInfo({ externalDependencies: e.target.value })}
          placeholder="Third-party systems or teams this system depends on but doesn't control."
        />
      </label>
    </Modal>
  )
}
