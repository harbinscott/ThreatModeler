import { Modal } from './Modal'
import type { ProjectRevision } from '../types/project'
import './HistoryDialog.css'

interface HistoryDialogProps {
  revisionCount: number
  revisionHistory: ProjectRevision[]
  onRestore: (revision: ProjectRevision) => void
  onClose: () => void
}

/** Lists the last `revisionHistory.length` (capped, see Canvas.tsx's
 *  MAX_REVISIONS) saves, newest first, each restorable. `revisionCount` is
 *  shown separately since it keeps counting past the cap — "save #47"
 *  still means something even once only the last 10 are restorable. */
export function HistoryDialog({ revisionCount, revisionHistory, onRestore, onClose }: HistoryDialogProps) {
  return (
    <Modal title="Version History" onClose={onClose} width={480}>
      <p className="modal-message__empty" style={{ marginBottom: '0.75rem' }}>
        {revisionCount} save{revisionCount === 1 ? '' : 's'} total — the last {revisionHistory.length} are restorable below.
      </p>
      {revisionHistory.length === 0 ? (
        <p className="modal-message__empty">No saved revisions yet — they're recorded every time you click Save.</p>
      ) : (
        revisionHistory.map((r, i) => (
          <div className="modal-message history-dialog__row" key={r.id}>
            <span>
              {i === 0 ? 'Most recent — ' : ''}
              {new Date(r.savedAt).toLocaleString()}
            </span>
            <button type="button" className="btn" onClick={() => onRestore(r)}>
              Restore
            </button>
          </div>
        ))
      )}
    </Modal>
  )
}
