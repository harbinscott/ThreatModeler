import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}

/** Generic centered dialog with a backdrop, rendered through a portal into
 *  document.body (same reasoning as ThreatBadge's popover — escapes whatever
 *  local stacking context it's opened from). Closes on Escape, backdrop
 *  click, or the × button. */
export function Modal({ title, onClose, children, width }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" style={width ? { width } : undefined}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
