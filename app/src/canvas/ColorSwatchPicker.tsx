import { useEffect, useState } from 'react'
import { PRESET_COLORS, addRecentColor, getRecentColors } from './color'
import './ColorSwatchPicker.css'

interface ColorSwatchPickerProps {
  value?: string
  onPick: (hex: string) => void
}

export function ColorSwatchPicker({ value, onPick }: ColorSwatchPickerProps) {
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(getRecentColors())
  }, [])

  function pick(hex: string) {
    onPick(hex)
  }

  function pickCustom(hex: string) {
    onPick(hex)
    setRecent(addRecentColor(hex))
  }

  return (
    <div className="swatch-picker">
      <div className="swatch-picker__row">
        {PRESET_COLORS.map((hex) => (
          <button
            type="button"
            key={hex}
            className={`swatch${value?.toLowerCase() === hex.toLowerCase() ? ' swatch--active' : ''}`}
            style={{ background: hex }}
            onClick={() => pick(hex)}
            aria-label={hex}
          />
        ))}
        <label className="swatch swatch--custom" title="Custom color (opens color wheel)">
          <input type="color" value={value ?? '#2563eb'} onChange={(e) => pickCustom(e.target.value)} />
        </label>
      </div>
      {recent.length > 0 && (
        <div className="swatch-picker__recent">
          <span className="swatch-picker__recent-label">Recent</span>
          <div className="swatch-picker__row">
            {recent.map((hex) => (
              <button
                type="button"
                key={hex}
                className={`swatch${value?.toLowerCase() === hex.toLowerCase() ? ' swatch--active' : ''}`}
                style={{ background: hex }}
                onClick={() => pick(hex)}
                aria-label={hex}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
