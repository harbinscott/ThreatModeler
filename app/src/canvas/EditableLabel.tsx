import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useReactFlow } from '@xyflow/react'

interface EditableLabelProps {
  nodeId: string
  value: string
  className?: string
  style?: CSSProperties
}

export function EditableLabel({ nodeId, value, className, style }: EditableLabelProps) {
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      updateNodeData(nodeId, { label: trimmed })
    } else {
      setDraft(value)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`nodrag editable-label-input ${className ?? ''}`}
        style={style}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      className={className}
      style={style}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      title="Double-click to rename"
    >
      {value}
    </span>
  )
}
