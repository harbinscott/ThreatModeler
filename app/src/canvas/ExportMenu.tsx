import { useEffect, useRef, useState } from 'react'
import type { ReportVariant } from '../reports/reportTemplate'

interface ExportMenuProps {
  onExport: (variant: ReportVariant) => void
  exporting: boolean
}

export function ExportMenu({ onExport, exporting }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="shape-button" ref={rootRef}>
      <button
        type="button"
        className="btn shape-button__caret"
        style={{ borderRadius: 8 }}
        onClick={() => setOpen((o) => !o)}
        disabled={exporting}
      >
        {exporting ? 'Exporting…' : 'Export ▾'}
      </button>
      {open && (
        <ul className="shape-button__menu shape-button__menu--right">
          <li>
            <button
              type="button"
              onClick={() => {
                onExport('summary')
                setOpen(false)
              }}
            >
              Executive Summary (PDF)
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onExport('detailed')
                setOpen(false)
              }}
            >
              Detailed Report (PDF)
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
