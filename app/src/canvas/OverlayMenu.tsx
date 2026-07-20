import { useEffect, useRef, useState } from 'react'
import { IconLayersIntersect, IconChevronDown } from '@tabler/icons-react'

export interface OverlayLayers {
  threatBadges: boolean
  dreadRiskColoring: boolean
  complianceTags: boolean
  crownJewels: boolean
}

interface OverlayMenuProps {
  layers: OverlayLayers
  onToggle: (key: keyof OverlayLayers) => void
  /** Whether the project has DREAD enabled — the risk-coloring layer is
   *  meaningless without DREAD scores, so it's hidden rather than shown
   *  disabled. */
  dreadAvailable: boolean
}

/** Toolbar dropdown for diagram overlays — a list of independent toggles so
 *  future overlays can be added as another `OverlayLayers` key and another
 *  checkbox here, without restructuring this component. */
export function OverlayMenu({ layers, onToggle, dreadAvailable }: OverlayMenuProps) {
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
      <button type="button" className="btn shape-button__caret" style={{ borderRadius: 8 }} onClick={() => setOpen((o) => !o)}>
        <IconLayersIntersect size={15} aria-hidden="true" />
        Overlay
        <IconChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <ul className="shape-button__menu shape-button__menu--right overlay-menu">
          <li>
            <label className="overlay-menu__item">
              <input type="checkbox" checked={layers.threatBadges} onChange={() => onToggle('threatBadges')} />
              Threat count badges
            </label>
          </li>
          {dreadAvailable && (
            <li>
              <label className="overlay-menu__item">
                <input
                  type="checkbox"
                  checked={layers.dreadRiskColoring}
                  onChange={() => onToggle('dreadRiskColoring')}
                />
                DREAD risk coloring
              </label>
            </li>
          )}
          <li>
            <label className="overlay-menu__item">
              <input type="checkbox" checked={layers.complianceTags} onChange={() => onToggle('complianceTags')} />
              Compliance tags
            </label>
          </li>
          <li>
            <label className="overlay-menu__item">
              <input type="checkbox" checked={layers.crownJewels} onChange={() => onToggle('crownJewels')} />
              Crown jewel assets
            </label>
          </li>
        </ul>
      )}
    </div>
  )
}
