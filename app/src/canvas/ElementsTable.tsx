import { useMemo, useState } from 'react'
import { findStencil, type StencilOption } from './stencils'
import { ShapeButton } from './ShapeButton'
import { SHAPE_LABELS, SHAPE_ICONS } from './shapeMeta'
import { disambiguateLabels } from './elementLabels'
import { innermostBoundary } from './boundaryGeometry'
import type { ArrowStyle, CustomStencil, DiagramEdge, DiagramNode, ElementType } from '../types/project'
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
  onEditFlow: (edgeId: string, sourceId: string, targetId: string) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
}

const TYPE_LABELS = SHAPE_LABELS

const ADDABLE_TYPES: ElementType[] = ['process', 'external-entity', 'data-store', 'mitigation']

const ARROW_GLYPH: Record<ArrowStyle, string> = { 'one-way': '→', 'two-way': '⇄', none: '–' }

export function ElementsTable({
  nodes,
  edges,
  customStencils = [],
  onSelectNode,
  onSelectEdge,
  onAddElement,
  onAddFlow,
  onEditFlow,
  onDeleteNode,
  onDeleteEdge,
}: ElementsTableProps) {
  const [subTab, setSubTab] = useState<SubTab>('elements')
  const [addingFlow, setAddingFlow] = useState(false)
  // Set while editing an existing flow's endpoints (vs. creating a new one)
  // — the form below is shared between both, just its submit target differs.
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [flowSourceZone, setFlowSourceZone] = useState('all')
  const [flowTargetZone, setFlowTargetZone] = useState('all')
  const [flowSource, setFlowSource] = useState('')
  const [flowTarget, setFlowTarget] = useState('')
  const elements = nodes.filter((n) => n.data.elementType !== 'trust-boundary')
  const boundaries = useMemo(() => nodes.filter((n) => n.data.elementType === 'trust-boundary'), [nodes])
  // Disambiguates same-named elements ("Web Server" x2 -> "Web Server (1)"/
  // "(2)") without ever touching the stored label — a display-only lookup
  // shared by both sub-tabs so an element and its flow-path mentions always
  // agree on which one is which.
  const displayLabels = useMemo(() => disambiguateLabels(nodes), [nodes])
  const elementZoneId = useMemo(() => {
    const map = new Map<string, string | undefined>()
    for (const el of elements) map.set(el.id, innermostBoundary(el, boundaries)?.id)
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, boundaries])

  function zoneLabel(node: DiagramNode | undefined): string | undefined {
    if (!node) return undefined
    const boundary = innermostBoundary(node, boundaries)
    return boundary ? (displayLabels.get(boundary.id) ?? boundary.data.label) : undefined
  }

  // "All zones"/"No zone" plus one entry per trust boundary — narrows the
  // Source/Target pickers so two same-typed elements in different zones
  // (e.g. two "Web Server"s, one Internal one Cloud) aren't just numbers in
  // a flat list — the user has to pick a zone first to tell them apart.
  function elementsInZone(zoneFilter: string): DiagramNode[] {
    if (zoneFilter === 'all') return elements
    if (zoneFilter === 'unzoned') return elements.filter((el) => !elementZoneId.get(el.id))
    return elements.filter((el) => elementZoneId.get(el.id) === zoneFilter)
  }

  function elementOptionLabel(el: DiagramNode): string {
    const zone = zoneLabel(el)
    const label = displayLabels.get(el.id) ?? el.data.label
    return zone ? `${zone} · ${label}` : label
  }

  function resetFlowForm() {
    setAddingFlow(false)
    setEditingEdgeId(null)
    setFlowSourceZone('all')
    setFlowTargetZone('all')
    setFlowSource('')
    setFlowTarget('')
  }

  function startEditFlow(edge: DiagramEdge) {
    setFlowSourceZone(elementZoneId.get(edge.source) ?? 'unzoned')
    setFlowTargetZone(elementZoneId.get(edge.target) ?? 'unzoned')
    setFlowSource(edge.source)
    setFlowTarget(edge.target)
    setEditingEdgeId(edge.id)
    setAddingFlow(true)
    onSelectEdge(edge.id)
  }

  function handleCreateFlow() {
    if (!flowSource || !flowTarget || flowSource === flowTarget) return
    if (editingEdgeId) {
      onEditFlow(editingEdgeId, flowSource, flowTarget)
    } else {
      onAddFlow(flowSource, flowTarget)
    }
    resetFlowForm()
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
            {elements.map((n) => {
              const zone = zoneLabel(n)
              return (
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
                  <span className="elements-table__name">{displayLabels.get(n.id) ?? n.data.label}</span>
                  <span className="elements-table__type">{TYPE_LABELS[n.data.elementType]}</span>
                  {boundaries.length > 0 && <span className="elements-table__zone">{zone ?? 'No zone'}</span>}
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
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="elements-table__toolbar">
            {!addingFlow ? (
              <button type="button" className="btn" onClick={() => setAddingFlow(true)} disabled={elements.length < 2}>
                + Add Flow
              </button>
            ) : boundaries.length === 0 ? (
              <div className="elements-table__add-flow">
                <select value={flowSource} onChange={(e) => setFlowSource(e.target.value)}>
                  <option value="">Source…</option>
                  {elements.map((n) => (
                    <option key={n.id} value={n.id}>
                      {displayLabels.get(n.id) ?? n.data.label}
                    </option>
                  ))}
                </select>
                <span>→</span>
                <select value={flowTarget} onChange={(e) => setFlowTarget(e.target.value)}>
                  <option value="">Target…</option>
                  {elements.map((n) => (
                    <option key={n.id} value={n.id}>
                      {displayLabels.get(n.id) ?? n.data.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCreateFlow}
                  disabled={!flowSource || !flowTarget || flowSource === flowTarget}
                >
                  {editingEdgeId ? 'Save' : 'Create'}
                </button>
                <button type="button" className="btn" onClick={resetFlowForm}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="elements-table__add-flow elements-table__add-flow--zoned">
                <div className="elements-table__add-flow-row">
                  <span className="elements-table__add-flow-label">From</span>
                  <select
                    value={flowSourceZone}
                    onChange={(e) => {
                      setFlowSourceZone(e.target.value)
                      setFlowSource('')
                    }}
                  >
                    <option value="all">All zones</option>
                    <option value="unzoned">No zone</option>
                    {boundaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {displayLabels.get(b.id) ?? b.data.label}
                      </option>
                    ))}
                  </select>
                  <select value={flowSource} onChange={(e) => setFlowSource(e.target.value)}>
                    <option value="">Source…</option>
                    {elementsInZone(flowSourceZone).map((n) => (
                      <option key={n.id} value={n.id}>
                        {elementOptionLabel(n)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="elements-table__add-flow-row">
                  <span className="elements-table__add-flow-label">To</span>
                  <select
                    value={flowTargetZone}
                    onChange={(e) => {
                      setFlowTargetZone(e.target.value)
                      setFlowTarget('')
                    }}
                  >
                    <option value="all">All zones</option>
                    <option value="unzoned">No zone</option>
                    {boundaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {displayLabels.get(b.id) ?? b.data.label}
                      </option>
                    ))}
                  </select>
                  <select value={flowTarget} onChange={(e) => setFlowTarget(e.target.value)}>
                    <option value="">Target…</option>
                    {elementsInZone(flowTargetZone).map((n) => (
                      <option key={n.id} value={n.id}>
                        {elementOptionLabel(n)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="elements-table__add-flow-row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleCreateFlow}
                    disabled={!flowSource || !flowTarget || flowSource === flowTarget}
                  >
                    {editingEdgeId ? 'Save' : 'Create'}
                  </button>
                  <button type="button" className="btn" onClick={resetFlowForm}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="elements-table__list">
            {edges.length === 0 && <p className="elements-table__empty">No flows yet — add one above.</p>}
            {edges.map((e) => {
              const source = nodes.find((n) => n.id === e.source)
              const target = nodes.find((n) => n.id === e.target)
              const sourceLabel = source ? (displayLabels.get(source.id) ?? source.data.label) : '?'
              const targetLabel = target ? (displayLabels.get(target.id) ?? target.data.label) : '?'
              const sourceZone = zoneLabel(source)
              const targetZone = zoneLabel(target)
              const arrow = ARROW_GLYPH[e.data?.arrowStyle ?? 'one-way']
              // Structural path is always shown — clicking the row still opens
              // the Connection Inspector to edit label/color/style, same as
              // before, but the row itself now reads like the user's TMT
              // reference: zone > source --arrow--> zone > target, instead of
              // hiding the path entirely behind a custom edge label.
              const path = `${sourceZone ? `${sourceZone} · ` : ''}${sourceLabel}  ${arrow}  ${targetZone ? `${targetZone} · ` : ''}${targetLabel}`
              const meta = [e.data?.label, e.data?.lineStyle ?? 'solid', e.data?.arrowStyle ?? 'one-way'].filter(Boolean).join(' · ')
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
                  <span className="elements-table__name">{path}</span>
                  <span className="elements-table__type">{meta}</span>
                  <button
                    type="button"
                    className="elements-table__edit"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      startEditFlow(e)
                    }}
                    aria-label="Edit flow endpoints"
                    title="Edit source/target"
                  >
                    ✎
                  </button>
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
