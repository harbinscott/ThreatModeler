import { Modal } from './Modal'
import type { DiagramMessage } from '../threats/diagnostics'

interface MessagesDialogProps {
  messages: DiagramMessage[]
  onClose: () => void
}

export function MessagesDialog({ messages, onClose }: MessagesDialogProps) {
  return (
    <Modal title="Messages" onClose={onClose} width={520}>
      {messages.length === 0 ? (
        <p className="modal-message__empty">No issues found — the diagram looks structurally sound.</p>
      ) : (
        messages.map((m, i) => (
          <div className={`modal-message modal-message--${m.severity}`} key={i}>
            <span className="modal-message__icon">{m.severity === 'warning' ? '⚠' : 'ⓘ'}</span>
            <span>{m.text}</span>
          </div>
        ))
      )}
    </Modal>
  )
}
