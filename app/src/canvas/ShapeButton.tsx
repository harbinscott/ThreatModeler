import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { catalogForType, type CatalogEntry } from './componentCatalog'
import type { ElementType } from '../types/project'

interface ShapeButtonProps {
  elementType: ElementType
  label: string
  icon: ReactNode
  onAdd: (elementType: ElementType, preset?: CatalogEntry) => void
}

export function ShapeButton({ elementType, label, icon, onAdd }: ShapeButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const presets = catalogForType(elementType)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="shape-button" ref={rootRef}>
      <button type="button" className="btn shape-button__main" onClick={() => onAdd(elementType)}>
        {icon}
        {label}
      </button>
      {presets.length > 0 && (
        <>
          <button
            type="button"
            className="btn shape-button__caret"
            onClick={() => setOpen((o) => !o)}
            aria-label={`${label} presets`}
          >
            <IconChevronDown size={13} aria-hidden="true" />
          </button>
          {open && (
            <ul className="shape-button__menu">
              {presets.map((preset) => (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(elementType, preset)
                      setOpen(false)
                    }}
                  >
                    {preset.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
