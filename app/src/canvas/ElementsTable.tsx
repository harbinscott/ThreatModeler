import { useState } from 'react'
import { findStencil, type StencilOption } from './stencils'
import { ShapeButton } from './ShapeButton'
import { SHAPE_LABELS, SHAPE_ICONS } from './shapeMeta'
import type { CustomStencil, DiagramEdge, DiagramNode, ElementType } from '../types/project'
import './ElementsTable.css'

type SubTab = 'elements' | 'flows'

interface ElementsTableProps {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  customStencils?: CustomStencil[]
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
  onAddElement: (elementType: ElementType, preset?: StencilOption) => void
  onAddFlow: (sourceId: string, targetId: string) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
}

const TYPE_LABELS = SHAPE_LABELS

const ADDABLE_TYPES: ElementType[] = ['process', 'external-entity', 'data-store']

export function ElementsTable({
  nodes,
  edges,
  customStencils = [],
  onSelectNode,
  onSelectEdge,
  onAddElement,
  onAddFlow,
  onDeleteNode,
  onDeleteEdge,
}: ElementsTableProps) {
  const [subTab, setSubTab] = useState<SubTab>('elements')
  const [addingFlow, setAddingFlow] = useState(false)
  const [flowSource, setFlowSource] = useState('')
  const [flowTarget, setFlowTarget] = useState('')
  const elements = nodes.filter((n) => n.data.elementType !== 'trust-boundary')

  function handleCreateFlow() {
    if (flowSource && flowTarget && flowSource !== flowTarget) {
      onAddFlow(flowSource, flowTarget)
      setAddingFlow(false)
      setFlowSource('')
      setFlowTarget('')
    }
  }

  return (
    <div className="elements-table">
      <div className="elements-table__tabs">
        <button
          type="button"
          className={`tab${subTab === 'elements' ? ' tab--active' : ''}`}
          onClick={() => setSubTab('elements')}
        >
          Elements ({elements.length})
        </button>
        <button
          type="button"
          className={`tab${subTab === 'flows' ? ' tab--active' : ''}`}
          onClick={() => setSubTab('flows')}
        >
          Flows ({edges.length})
        </button>
      </div>

      {subTab === 'elements' ? (
        <>
          <div className="elements-table__toolbar">
            {ADDABLE_TYPES.map((type) => (
              <ShapeButton
                key={type}
                elementType={type}
                label={TYPE_LABELS[type]}
                icon={SHAPE_ICONS[type]}
                customStencils={customStencils}
                onAdd={onAddElement}
              />
            ))}
          </div>
          <div className="elements-table__list">
            {elements.length === 0 && <p className="elements-table__empty">No elements yet — add one above.</p>}
            {elements.map((n) => (
              <div
                key={n.id}
                className={`elements-table__row${n.selected ? ' elements-table__row--selected' : ''}`}
                onClick={() => onSelectNode(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectNode(n.id)}
              >
                <span
                  className="elements-table__swatch"
                  style={{ background: n.data.colors?.fill ?? n.data.colors?.border ?? 'var(--text-muted)' }}
                />
                <span className="elements-table__name">{n.data.label}</span>
                <span className="elements-table__type">{TYPE_LABELS[n.data.elementType]}</span>
                {n.data.componentType && (
                  <span className="elements-table__component">
                    {findStencil(n.data.componentType, customStencils)?.name ?? n.data.componentType}
                  </span>
                )}
                <button
                  type="button"
                  className="elements-table__delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteNode(n.id)
                  }}
                  aria-label={`Delete ${n.data.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="elements-table__toolbar">
            {!addingFlow ? (
              <button type="button" className="btn" onClick={() => setAddingFlow(true)} disabled={elements.length < 2}>
                + Add Flow
              </button>
            ) : (
              <div className="elements-table__add-flow">
                <select value={flowSource} onChange={(e) => setFlowSource(e.target.value)}>
                  <option value="">Source…</option>
                  {elements.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data.label}
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select value={flowTarget} onChange={(e) => setFlowTarget(e.target.value)}>
                  <option value="">Target…</option>
                  {elements.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.data.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCreateFlow}
                  disabled={!flowSource || !flowTarget || flowSource === flowTarget}
                >
                  Create
                </button>
                <button type="button" className="btn" onClick={() => setAddingFlow(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="elements-table__list">
            {edges.length === 0 && <p className="elements-table__empty">No flows yet — add one above.</p>}
            {edges.map((e) => {
              const source = nodes.find((n) => n.id === e.source)
              const target = nodes.find((n) => n.id === e.target)
              const label = e.data?.label || `${source?.data.label ?? '?'} → ${target?.data.label ?? '?'}`
              return (
                <div
                  key={e.id}
                  className={`elements-table__row${e.selected ? ' elements-table__row--selected' : ''}`}
                  onClick={() => onSelectEdge(e.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => ev.key === 'Enter' && onSelectEdge(e.id)}
                >
                  <span className="elements-table__swatch" style={{ background: e.data?.color ?? 'var(--text-muted)' }} />
                  <span className="elements-table__name">{label}</span>
                  <span className="elements-table__type">
                    {e.data?.lineStyle ?? 'solid'} · {e.data?.arrowStyle ?? 'one-way'}
                  </span>
                  <button
                    type="button"
                    className="elements-table__delete"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      onDeleteEdge(e.id)
                    }}
                    aria-label="Delete flow"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
