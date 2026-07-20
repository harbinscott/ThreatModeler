import { useEffect, useRef, useState } from 'react'
import { IconDownload, IconChevronDown } from '@tabler/icons-react'
import type { ReportVariant } from '../reports/reportTemplate'

interface ExportMenuProps {
  onExport: (variant: ReportVariant) => void
  onExportImage: (format: 'png' | 'svg') => void
  onExportOtm: () => void
  exporting: boolean
}

export function ExportMenu({ onExport, onExportImage, onExportOtm, exporting }: ExportMenuProps) {
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
        <IconDownload size={15} aria-hidden="true" />
        {exporting ? 'Exporting…' : 'Export'}
        <IconChevronDown size={13} aria-hidden="true" />
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
          <li>
            <button
              type="button"
              onClick={() => {
                onExportImage('png')
                setOpen(false)
              }}
            >
              Diagram (PNG)
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onExportImage('svg')
                setOpen(false)
              }}
            >
              Diagram (SVG)
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                onExportOtm()
                setOpen(false)
              }}
              title="Export the current diagram + threats as an Open Threat Model (OTM) document"
            >
              Threat Model (OTM)
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
