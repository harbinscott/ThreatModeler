import { useEffect, useRef, useState } from 'react'
import { IconChevronDown, IconShield } from '@tabler/icons-react'
import type { BoundaryShape } from '../types/project'

export interface BoundaryShapePreset {
  id: string
  label: string
  shape: BoundaryShape
  width: number
  height: number
}

export const BOUNDARY_SHAPE_PRESETS: BoundaryShapePreset[] = [
  { id: 'square', label: 'Square', shape: 'rectangle', width: 220, height: 220 },
  { id: 'rectangle', label: 'Rectangle', shape: 'rectangle', width: 320, height: 200 },
  { id: 'circle', label: 'Circle', shape: 'circle', width: 240, height: 240 },
  { id: 'cloud', label: 'Cloud', shape: 'cloud', width: 320, height: 220 },
]

const DEFAULT_PRESET = BOUNDARY_SHAPE_PRESETS[1]

interface TrustBoundaryButtonProps {
  onAdd: (preset: BoundaryShapePreset) => void
}

/** Trust boundaries don't have componentType presets like the other three
 *  element types (no equivalent of "Web Server"/"Database"), so this isn't
 *  built on top of ShapeButton — the caret here picks a starting shape/size
 *  instead of a catalog entry. Clicking the main button defaults to a
 *  rectangle, same as before this existed. */
export function TrustBoundaryButton({ onAdd }: TrustBoundaryButtonProps) {
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
      <button type="button" className="btn shape-button__main" onClick={() => onAdd(DEFAULT_PRESET)}>
        <IconShield size={15} color="#f59e0b" aria-hidden="true" />
        Trust boundary
      </button>
      <button
        type="button"
        className="btn shape-button__caret"
        onClick={() => setOpen((o) => !o)}
        aria-label="Trust boundary shapes"
      >
        <IconChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <ul className="shape-button__menu">
          {BOUNDARY_SHAPE_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(preset)
                  setOpen(false)
                }}
              >
                {preset.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
