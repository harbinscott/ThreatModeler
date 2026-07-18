import { useEffect, useRef, useState } from 'react'
import './Combobox.css'

export interface ComboboxOption {
  id: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  placeholder?: string
  onChangeText: (text: string) => void
  onSelect: (option: ComboboxOption) => void
}

export function Combobox({ options, value, placeholder, onChangeText, onSelect }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const filtered = value.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(value.trim().toLowerCase()))
    : options

  useEffect(() => {
    setHighlighted(0)
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectOption(option: ComboboxOption) {
    onSelect(option)
    setOpen(false)
  }

  return (
    <div className="combobox" ref={rootRef}>
      <div className="combobox__control">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChangeText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlighted((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (open && filtered[highlighted]) selectOption(filtered[highlighted])
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <button
          type="button"
          className="combobox__toggle"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          aria-label="Show options"
        >
          ▾
        </button>
      </div>
      {open && filtered.length > 0 && (
        <ul className="combobox__list" role="listbox">
          {filtered.map((option, i) => (
            <li
              key={option.id}
              role="option"
              aria-selected={i === highlighted}
              className={`combobox__option${i === highlighted ? ' combobox__option--highlighted' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                selectOption(option)
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <ul className="combobox__list">
          <li className="combobox__empty">No matches — type a custom name</li>
        </ul>
      )}
    </div>
  )
}
