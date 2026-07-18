import { Modal } from './Modal'

interface NotesDialogProps {
  notes: string
  onChange: (notes: string) => void
  onClose: () => void
}

/** Freeform discussion notes — explicitly not read by the STRIDE rule engine
 *  or counted in threat analysis, just a place to leave context for
 *  collaborators (mirrors MS Threat Modeling Tool's View > Notes pane). */
export function NotesDialog({ notes, onChange, onClose }: NotesDialogProps) {
  return (
    <Modal title="Notes" onClose={onClose} width={520}>
      <label className="modal-field">
        <span>Discussion notes (not used in threat analysis)</span>
        <textarea
          rows={12}
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Freeform notes for you or collaborators — open questions, decisions made, things to revisit…"
          autoFocus
        />
      </label>
    </Modal>
  )
}
