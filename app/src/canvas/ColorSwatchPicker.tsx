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

  // Release 14 stage C — root cause confirmed: React's `onChange` on
  // `<input type="color">` maps to the native `input` event, which
  // Chromium's own color-picker UI fires *continuously* while the user
  // drags across the wheel/slider — not once on confirm. Recording to
  // "recent" on every one of those firings meant a single pick gesture
  // could add many near-identical (or, once the drag settles, literally
  // identical) intermediate values, which read as "all 5 recent swatches
  // show the same color." Live preview still needs every firing (so the
  // swatch reflects the color as you drag), but recording to history only
  // makes sense once, when the picker actually closes — the native
  // `change`/blur point, not `input`.
  function pickCustom(hex: string) {
    onPick(hex)
  }

  function commitCustom(hex: string) {
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
          <input
            type="color"
            value={value ?? '#2563eb'}
            onChange={(e) => pickCustom(e.target.value)}
            onBlur={(e) => commitCustom(e.target.value)}
          />
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
