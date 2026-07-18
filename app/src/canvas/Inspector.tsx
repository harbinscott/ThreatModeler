import { useEffect, useState } from 'react'
import { catalogForType, findCatalogEntry } from './componentCatalog'
import { Combobox, type ComboboxOption } from './Combobox'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import {
  dataFlowSecurityFields,
  securityFieldsFor,
  INTERACTOR_TYPE_TYPE_DEFAULT,
  PROCESS_TYPE_CODE_TYPE_DEFAULT,
  type AttributeFieldDef,
} from './mstmAttributes'
import type { ArrowStyle, AttributeValue, DiagramEdge, DiagramNode, LineStyle, NodeColors } from '../types/project'
import './Inspector.css'

type Selection = { kind: 'node'; node: DiagramNode } | { kind: 'edge'; edge: DiagramEdge } | null

interface InspectorProps {
  selection: Selection
  onUpdateNode: (id: string, patch: Partial<DiagramNode['data']>) => void
  onUpdateEdge: (id: string, patch: Partial<DiagramEdge['data']>) => void
  onReverseEdge: (id: string) => void
  onDelete: () => void
  onClose: () => void
  width?: number
}

const LINE_STYLES: LineStyle[] = ['solid', 'dashed', 'dotted']
const ARROW_STYLES: ArrowStyle[] = ['one-way', 'two-way', 'none']

export function Inspector({ selection, onUpdateNode, onUpdateEdge, onReverseEdge, onDelete, onClose, width }: InspectorProps) {
  if (!selection) return null

  return (
    <aside className="inspector" style={width ? { width } : undefined}>
      <div className="inspector__header">
        <h2>{selection.kind === 'node' ? 'Element' : 'Connection'}</h2>
        <button type="button" className="inspector__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {selection.kind === 'node' ? (
        <NodeInspector node={selection.node} onUpdate={onUpdateNode} />
      ) : (
        <EdgeInspector edge={selection.edge} onUpdate={onUpdateEdge} onReverse={onReverseEdge} />
      )}

      <button type="button" className="btn inspector__delete" onClick={onDelete}>
        Delete {selection.kind === 'node' ? 'element' : 'connection'}
      </button>
    </aside>
  )
}

function NodeColorField({
  colors,
  onChange,
}: {
  colors?: NodeColors
  onChange: (colors: NodeColors | undefined) => void
}) {
  const [advanced, setAdvanced] = useState(false)
  const borderIsLinked = !colors?.border || colors.border === colors?.fill

  return (
    <div className="inspector__field">
      <span>Color</span>
      <ColorSwatchPicker
        value={colors?.fill}
        onPick={(hex) => {
          // Fill and border stay linked unless the user has customized
          // border independently via Advanced.
          onChange({ ...colors, fill: hex, border: borderIsLinked ? hex : colors?.border })
        }}
      />
      {colors && (colors.fill || colors.border || colors.text) && (
        <button type="button" className="chip inspector__reset" onClick={() => onChange(undefined)}>
          Reset to default
        </button>
      )}

      <button type="button" className="inspector__advanced-toggle" onClick={() => setAdvanced((a) => !a)}>
        {advanced ? '▾' : '▸'} Advanced (border / text)
      </button>

      {advanced && (
        <div className="inspector__advanced">
          <div className="inspector__field">
            <span>Border {borderIsLinked && colors?.fill ? '(linked to fill)' : ''}</span>
            <ColorSwatchPicker value={colors?.border ?? colors?.fill} onPick={(hex) => onChange({ ...colors, border: hex })} />
            {colors?.border && (
              <button
                type="button"
                className="chip inspector__reset"
                onClick={() => onChange({ ...colors, border: undefined })}
              >
                Link to fill
              </button>
            )}
          </div>
          <div className="inspector__field">
            <span>Text {!colors?.text ? '(auto)' : ''}</span>
            <ColorSwatchPicker value={colors?.text} onPick={(hex) => onChange({ ...colors, text: hex })} />
            {colors?.text && (
              <button
                type="button"
                className="chip inspector__reset"
                onClick={() => onChange({ ...colors, text: undefined })}
              >
                Use auto contrast
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AttributeFieldRow({
  field,
  value,
  onChange,
}: {
  field: AttributeFieldDef
  value: AttributeValue | undefined
  onChange: (value: AttributeValue) => void
}) {
  return (
    <label className="inspector__field">
      <span>{field.label}</span>
      {field.type === 'boolean' ? (
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      ) : field.type === 'select' ? (
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— not set —</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input type="text" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

/** Microsoft Threat Modeling Tool's per-element-type security attribute schema,
 *  shown as a separate collapsible section from the component-catalog fields
 *  above (which stay preset-driven — "Web Server", "Database", etc). The two
 *  systems are layered, not merged: catalog fields cover a handful of
 *  architecture-relevant properties per preset; this covers the full MS-TMT
 *  field set per DFD element type, feeding ruleEngine.ts/dreadEngine.ts. */
function SecurityPropertiesSection({
  fields,
  attrs,
  onSetAttribute,
}: {
  fields: AttributeFieldDef[]
  attrs: Record<string, AttributeValue>
  onSetAttribute: (key: string, value: AttributeValue) => void
}) {
  const [open, setOpen] = useState(false)
  const visible = fields.filter((f) => !f.when || f.when(attrs))
  if (visible.length === 0) return null

  return (
    <div className="inspector__security-fields">
      <button
        type="button"
        className="inspector__advanced-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Extended security fields from Microsoft's Threat Modeling Tool schema — feed into STRIDE threat descriptions and DREAD score suggestions."
      >
        {open ? '▾' : '▸'} Security properties
      </button>
      {open && (
        <div className="inspector__security-fields-body">
          {visible.map((f) => (
            <AttributeFieldRow key={f.key} field={f} value={attrs[f.key]} onChange={(v) => onSetAttribute(f.key, v)} />
          ))}
        </div>
      )}
    </div>
  )
}

function NodeInspector({
  node,
  onUpdate,
}: {
  node: DiagramNode
  onUpdate: (id: string, patch: Partial<DiagramNode['data']>) => void
}) {
  const options = catalogForType(node.data.elementType)
  const comboboxOptions: ComboboxOption[] = options.map((o) => ({ id: o.id, label: o.name }))
  const activeEntry = findCatalogEntry(node.data.componentType)
  const [searchText, setSearchText] = useState(activeEntry?.name ?? '')

  useEffect(() => {
    setSearchText(activeEntry?.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  function handleSelect(option: ComboboxOption) {
    const entry = options.find((o) => o.id === option.id)
    setSearchText(option.label)
    onUpdate(node.id, {
      componentType: entry?.id,
      attributes: entry
        ? entry.fields.reduce(
            (acc, f) => ({ ...acc, [f.key]: node.data.attributes?.[f.key] ?? '' }),
            {} as Record<string, string | boolean>
          )
        : node.data.attributes,
    })
  }

  function setAttribute(key: string, value: string | boolean) {
    onUpdate(node.id, { attributes: { ...node.data.attributes, [key]: value } })
  }

  // MS-TMT security fields are layered on top of the catalog fields above —
  // drop any whose key a catalog preset already covers so the same value
  // doesn't render as two separate inputs.
  const catalogKeys = new Set(activeEntry?.fields.map((f) => f.key) ?? [])
  const securityFields = securityFieldsFor(node.data.elementType).filter((f) => !catalogKeys.has(f.key))
  const attrs = node.data.attributes ?? {}

  function setSecurityAttribute(key: string, value: AttributeValue) {
    const nextAttrs = { ...node.data.attributes, [key]: value }
    if (key === 'processType') {
      const codeDefault = PROCESS_TYPE_CODE_TYPE_DEFAULT[value as string]
      if (codeDefault) nextAttrs.codeType = codeDefault
    }
    if (key === 'interactorType') {
      const typeDefault = INTERACTOR_TYPE_TYPE_DEFAULT[value as string]
      if (typeDefault) nextAttrs.type = typeDefault
    }
    onUpdate(node.id, { attributes: nextAttrs })
  }

  return (
    <div className="inspector__body">
      <label className="inspector__field">
        <span>Name</span>
        <input
          type="text"
          value={node.data.label}
          onChange={(e) => onUpdate(node.id, { label: e.target.value })}
        />
      </label>

      <label className="inspector__field">
        <span>Description</span>
        <textarea
          rows={2}
          value={node.data.description ?? ''}
          onChange={(e) => onUpdate(node.id, { description: e.target.value })}
        />
      </label>

      <NodeColorField colors={node.data.colors} onChange={(colors) => onUpdate(node.id, { colors })} />

      {options.length > 0 && (
        <div className="inspector__field">
          <span>Component type</span>
          <Combobox
            options={comboboxOptions}
            value={searchText}
            placeholder="Click or type, e.g. Web Server…"
            onChangeText={setSearchText}
            onSelect={handleSelect}
          />
        </div>
      )}

      {activeEntry && (
        <div className="inspector__catalog-fields">
          {activeEntry.fields.map((field) => (
            <label className="inspector__field" key={field.key}>
              <span>{field.label}</span>
              {field.type === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(node.data.attributes?.[field.key])}
                  onChange={(e) => setAttribute(field.key, e.target.checked)}
                />
              ) : field.type === 'select' ? (
                <select
                  value={(node.data.attributes?.[field.key] as string) ?? ''}
                  onChange={(e) => setAttribute(field.key, e.target.value)}
                >
                  <option value="">— not set —</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={(node.data.attributes?.[field.key] as string) ?? ''}
                  onChange={(e) => setAttribute(field.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <SecurityPropertiesSection fields={securityFields} attrs={attrs} onSetAttribute={setSecurityAttribute} />
    </div>
  )
}

function EdgeInspector({
  edge,
  onUpdate,
  onReverse,
}: {
  edge: DiagramEdge
  onUpdate: (id: string, patch: Partial<DiagramEdge['data']>) => void
  onReverse: (id: string) => void
}) {
  const attrs = edge.data?.attributes ?? {}

  function setSecurityAttribute(key: string, value: AttributeValue) {
    onUpdate(edge.id, { attributes: { ...edge.data?.attributes, [key]: value } })
  }

  return (
    <div className="inspector__body">
      <label className="inspector__field">
        <span>Label</span>
        <input
          type="text"
          value={edge.data?.label ?? ''}
          onChange={(e) => onUpdate(edge.id, { label: e.target.value })}
          placeholder="e.g. HTTPS request"
        />
      </label>

      <div className="inspector__field">
        <span>Color</span>
        <ColorSwatchPicker value={edge.data?.color} onPick={(hex) => onUpdate(edge.id, { color: hex })} />
        {edge.data?.color && (
          <button type="button" className="chip inspector__reset" onClick={() => onUpdate(edge.id, { color: undefined })}>
            Reset to default
          </button>
        )}
      </div>

      <div className="inspector__field">
        <span>Line style</span>
        <div className="inspector__button-row">
          {LINE_STYLES.map((style) => (
            <button
              type="button"
              key={style}
              className={`chip${edge.data?.lineStyle === style ? ' chip--active' : ''}`}
              onClick={() => onUpdate(edge.id, { lineStyle: style })}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="inspector__field">
        <span>Arrow direction</span>
        <div className="inspector__button-row">
          {ARROW_STYLES.map((style) => (
            <button
              type="button"
              key={style}
              className={`chip${edge.data?.arrowStyle === style ? ' chip--active' : ''}`}
              onClick={() => onUpdate(edge.id, { arrowStyle: style })}
            >
              {style}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => onReverse(edge.id)}>
          ⇄ Reverse direction
        </button>
      </div>

      <SecurityPropertiesSection fields={dataFlowSecurityFields()} attrs={attrs} onSetAttribute={setSecurityAttribute} />
    </div>
  )
}
