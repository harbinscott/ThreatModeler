import { useEffect, useState } from 'react'
import { stencilsForType, findStencil } from './stencils'
import { Combobox, type ComboboxOption } from './Combobox'
import { ColorSwatchPicker } from './ColorSwatchPicker'
import { dataFlowSecurityFields, securityFieldsFor, DATA_FLOW_PROTOCOL_DEFAULTS, type AttributeFieldDef } from './mstmAttributes'
import { CHECKBOX_COMPLIANCE_TAGS, COMPLIANCE_TAG_LABELS } from './complianceTags'
import type {
  ArrowStyle,
  AttributeValue,
  BoundaryType,
  ComplianceTag,
  CustomFieldDef,
  CustomStencil,
  DiagramEdge,
  DiagramNode,
  LineStyle,
  NodeColors,
  PciScope,
} from '../types/project'
import './Inspector.css'

type Selection = { kind: 'node'; node: DiagramNode } | { kind: 'edge'; edge: DiagramEdge } | null

interface InspectorProps {
  selection: Selection
  customStencils: CustomStencil[]
  onUpdateNode: (id: string, patch: Partial<DiagramNode['data']>) => void
  onUpdateEdge: (id: string, patch: Partial<DiagramEdge['data']>) => void
  onReverseEdge: (id: string) => void
  onSaveCustomStencil: (stencil: CustomStencil) => void
  onDelete: () => void
  onClose: () => void
  width?: number
}

const LINE_STYLES: LineStyle[] = ['solid', 'dashed', 'dotted']
const ARROW_STYLES: ArrowStyle[] = ['one-way', 'two-way', 'none']
const BOUNDARY_TYPES: BoundaryType[] = [
  'Network Boundary',
  'Internet Boundary',
  'Corporate/Internal Network Boundary',
  'Sandbox / Isolation Boundary',
  'Kernel/User Mode Boundary',
  'Cloud Account/Tenant Boundary',
]

function slugify(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field'
}

/** Unions two custom-field-def lists by key, keeping the first occurrence —
 *  used when picking a stencil so its field definitions get added without
 *  dropping any the user already added by hand on this instance. */
function mergeFieldDefs(existing: CustomFieldDef[] = [], incoming: CustomFieldDef[] = []): CustomFieldDef[] {
  const keys = new Set(existing.map((f) => f.key))
  return [...existing, ...incoming.filter((f) => !keys.has(f.key))]
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

function FieldInput({
  type,
  options,
  value,
  onChange,
}: {
  type: 'text' | 'boolean' | 'select'
  options?: string[]
  value: AttributeValue | undefined
  onChange: (value: AttributeValue) => void
}) {
  if (type === 'boolean') {
    return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
  }
  if (type === 'select') {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— not set —</option>
        {options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }
  return <input type="text" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
}

/** A small inline form for adding a user-defined security property — the
 *  "add custom properties" half of the custom-element ask. Type choices are
 *  deliberately limited to the same three the built-in schema uses (text /
 *  yes-no / choice list) so custom fields render identically to built-in
 *  ones everywhere else in the app (Inspector, PDF export, table view). */
function AddCustomFieldForm({ onAdd }: { onAdd: (def: CustomFieldDef) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'text' | 'boolean' | 'select'>('text')
  const [optionsText, setOptionsText] = useState('')

  function submit() {
    const trimmed = label.trim()
    if (!trimmed) return
    const key = `custom_${slugify(trimmed)}_${crypto.randomUUID().slice(0, 4)}`
    const options =
      type === 'select'
        ? optionsText
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined
    onAdd({ key, label: trimmed, type, options })
    setLabel('')
    setOptionsText('')
    setType('text')
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="inspector__advanced-toggle" onClick={() => setOpen(true)}>
        + Add custom property
      </button>
    )
  }

  return (
    <div className="inspector__custom-field-form">
      <label className="inspector__field">
        <span>Property name</span>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Compliance zone" autoFocus />
      </label>
      <label className="inspector__field">
        <span>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="text">Text</option>
          <option value="boolean">Yes / No</option>
          <option value="select">Choice list</option>
        </select>
      </label>
      {type === 'select' && (
        <label className="inspector__field">
          <span>Options (comma-separated)</span>
          <input type="text" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="e.g. PCI, HIPAA, PII" />
        </label>
      )}
      <div className="inspector__button-row">
        <button type="button" className="btn" onClick={submit} disabled={!label.trim()}>
          Add
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Microsoft Threat Modeling Tool's per-element-type security attribute
 *  schema, plus any user-added custom properties, in one collapsible
 *  section. Feeds ruleEngine.ts/dreadEngine.ts (built-in fields only —
 *  custom fields are descriptive, not yet wired into scoring). Built-in
 *  fields can be hidden per-instance (small × — restorable), custom fields
 *  can be removed entirely (nothing else defines them, so hiding one is the
 *  same as deleting it). */
function SecurityPropertiesSection({
  fields,
  customFields,
  attrs,
  hiddenKeys,
  onSetAttribute,
  onHideField,
  onRestoreField,
  onAddCustomField,
  onRemoveCustomField,
}: {
  fields: AttributeFieldDef[]
  customFields: CustomFieldDef[]
  attrs: Record<string, AttributeValue>
  hiddenKeys: string[]
  onSetAttribute: (key: string, value: AttributeValue) => void
  onHideField: (key: string) => void
  onRestoreField: (key: string) => void
  onAddCustomField: (def: CustomFieldDef) => void
  onRemoveCustomField: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const applicable = fields.filter((f) => !f.when || f.when(attrs))
  const visible = applicable.filter((f) => !hiddenKeys.includes(f.key))
  const hidden = applicable.filter((f) => hiddenKeys.includes(f.key))

  return (
    <div className="inspector__security-fields">
      <button
        type="button"
        className="inspector__advanced-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Extended security fields — feed into STRIDE threat descriptions and DREAD score suggestions. Custom properties are descriptive only for now."
      >
        {open ? '▾' : '▸'} Security properties
      </button>
      {open && (
        <div className="inspector__security-fields-body">
          {visible.map((f) => (
            <div className="inspector__field-row" key={f.key}>
              <label className="inspector__field">
                <span>{f.label}</span>
                <FieldInput type={f.type} options={f.options} value={attrs[f.key]} onChange={(v) => onSetAttribute(f.key, v)} />
              </label>
              <button type="button" className="inspector__field-remove" title="Hide this field" onClick={() => onHideField(f.key)}>
                ×
              </button>
            </div>
          ))}

          {customFields.map((f) => (
            <div className="inspector__field-row" key={f.key}>
              <label className="inspector__field">
                <span>{f.label}</span>
                <FieldInput type={f.type} options={f.options} value={attrs[f.key]} onChange={(v) => onSetAttribute(f.key, v)} />
              </label>
              <button
                type="button"
                className="inspector__field-remove"
                title="Remove this custom property"
                onClick={() => onRemoveCustomField(f.key)}
              >
                ×
              </button>
            </div>
          ))}

          {hidden.length > 0 && (
            <div className="inspector__hidden-fields">
              {hidden.map((f) => (
                <button type="button" key={f.key} className="chip" title="Restore this field" onClick={() => onRestoreField(f.key)}>
                  ↺ {f.label}
                </button>
              ))}
            </div>
          )}

          <AddCustomFieldForm onAdd={onAddCustomField} />
        </div>
      )}
    </div>
  )
}

/** Data classification / regulatory-scope tagging (Release 5) — separate
 *  from Security Properties since it's a different kind of concern
 *  (compliance scope, not architecture/protocol facts) and only applies to
 *  Data Store nodes and Data Flow edges, not every element type. PCI gets
 *  its own conditional sub-field (`pciScope`) instead of a plain checkbox
 *  since "in scope" alone isn't enough detail to be useful — see
 *  `PciScope` in types/project.ts for why it's Connected/CDE rather than
 *  the org-wide merchant-level concept. Tags set here are the *direct*
 *  assignment only; `complianceTags.ts`'s `computeEffectiveComplianceTags`
 *  propagates them to connected elements for the canvas overlay. */
function ComplianceSection({
  tags,
  pciScope,
  notes,
  onChange,
}: {
  tags: ComplianceTag[]
  pciScope?: PciScope
  notes?: string
  onChange: (tags: ComplianceTag[], pciScope?: PciScope, notes?: string) => void
}) {
  const [open, setOpen] = useState(false)
  const hasPci = tags.includes('PCI')
  const hasAnyTag = tags.length > 0

  function toggleTag(tag: ComplianceTag) {
    onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag], pciScope, notes)
  }

  function togglePci(checked: boolean) {
    onChange(
      checked ? [...tags, 'PCI'] : tags.filter((t) => t !== 'PCI'),
      checked ? (pciScope ?? 'Connected') : undefined,
      notes
    )
  }

  return (
    <div className="inspector__security-fields">
      <button
        type="button"
        className="inspector__advanced-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Regulatory/data-classification scope — propagates to connected elements within the same trust boundary and feeds the Compliance overlay + STRIDE/DREAD."
      >
        {open ? '▾' : '▸'} Compliance & data classification
      </button>
      {open && (
        <div className="inspector__security-fields-body">
          {CHECKBOX_COMPLIANCE_TAGS.map((tag) => (
            <label className="inspector__field" key={tag} title={COMPLIANCE_TAG_LABELS[tag]}>
              <span>{tag}</span>
              <input type="checkbox" checked={tags.includes(tag)} onChange={() => toggleTag(tag)} />
            </label>
          ))}
          <label className="inspector__field" title={COMPLIANCE_TAG_LABELS.PCI}>
            <span>PCI</span>
            <input type="checkbox" checked={hasPci} onChange={(e) => togglePci(e.target.checked)} />
          </label>
          {hasPci && (
            <label className="inspector__field">
              <span>PCI scope</span>
              <select value={pciScope ?? 'Connected'} onChange={(e) => onChange(tags, e.target.value as PciScope, notes)}>
                <option value="Connected">Connected to CDE</option>
                <option value="CDE">Cardholder Data Environment (CDE)</option>
              </select>
            </label>
          )}
          {hasAnyTag && (
            <label className="inspector__field">
              <span>Notes</span>
              <textarea
                rows={2}
                value={notes ?? ''}
                onChange={(e) => onChange(tags, pciScope, e.target.value)}
                placeholder="e.g. Tier 2 PCI asset, processes card data — additional review required"
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

function SaveAsCustomElement({
  defaultName,
  onSave,
}: {
  defaultName: string
  onSave: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)

  useEffect(() => {
    setName(defaultName)
  }, [defaultName])

  if (!open) {
    return (
      <button type="button" className="inspector__advanced-toggle" onClick={() => setOpen(true)}>
        Save as custom element…
      </button>
    )
  }

  return (
    <div className="inspector__custom-field-form">
      <label className="inspector__field">
        <span>Custom element name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="inspector__button-row">
        <button
          type="button"
          className="btn"
          disabled={!name.trim()}
          onClick={() => {
            onSave(name.trim())
            setOpen(false)
          }}
        >
          Save
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function NodeInspector({
  node,
  customStencils,
  onUpdate,
  onSaveCustomStencil,
}: {
  node: DiagramNode
  customStencils: CustomStencil[]
  onUpdate: (id: string, patch: Partial<DiagramNode['data']>) => void
  onSaveCustomStencil: (stencil: CustomStencil) => void
}) {
  const stencilOptions = stencilsForType(node.data.elementType, customStencils)
  const comboboxOptions: ComboboxOption[] = stencilOptions.map((o) => ({
    id: o.id,
    label: o.custom ? `${o.name} · Custom` : o.name,
  }))
  const activeStencil = findStencil(node.data.componentType, customStencils)
  const [searchText, setSearchText] = useState(activeStencil?.name ?? node.data.componentType ?? '')

  useEffect(() => {
    setSearchText(activeStencil?.name ?? node.data.componentType ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  function handleSelect(option: ComboboxOption) {
    const stencil = findStencil(option.id, customStencils)
    setSearchText(option.label.replace(' · Custom', ''))
    const nextAttrs = { ...node.data.attributes }
    if (stencil?.defaults) {
      for (const [key, value] of Object.entries(stencil.defaults)) {
        if (nextAttrs[key] === undefined || nextAttrs[key] === '') nextAttrs[key] = value
      }
    }
    onUpdate(node.id, {
      componentType: option.id,
      attributes: nextAttrs,
      customFields: mergeFieldDefs(node.data.customFields, stencil?.customFields),
      hiddenFieldKeys: stencil?.hiddenFieldKeys ?? node.data.hiddenFieldKeys,
    })
  }

  function setAttribute(key: string, value: AttributeValue) {
    onUpdate(node.id, { attributes: { ...node.data.attributes, [key]: value } })
  }

  function hideField(key: string) {
    onUpdate(node.id, { hiddenFieldKeys: [...(node.data.hiddenFieldKeys ?? []), key] })
  }

  function restoreField(key: string) {
    onUpdate(node.id, { hiddenFieldKeys: (node.data.hiddenFieldKeys ?? []).filter((k) => k !== key) })
  }

  function addCustomField(def: CustomFieldDef) {
    onUpdate(node.id, { customFields: [...(node.data.customFields ?? []), def] })
  }

  function removeCustomField(key: string) {
    const { [key]: _removed, ...restAttrs } = node.data.attributes ?? {}
    onUpdate(node.id, {
      customFields: (node.data.customFields ?? []).filter((f) => f.key !== key),
      attributes: restAttrs,
    })
  }

  function setCompliance(tags: ComplianceTag[], pciScope?: PciScope, complianceNotes?: string) {
    onUpdate(node.id, { complianceTags: tags, pciScope, complianceNotes })
  }

  function saveCustomElement(name: string) {
    const attrs = node.data.attributes ?? {}
    const defaults = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== '' && v !== undefined))
    onSaveCustomStencil({
      id: crypto.randomUUID(),
      name,
      elementType: node.data.elementType,
      defaults,
      customFields: node.data.customFields ?? [],
      hiddenFieldKeys: node.data.hiddenFieldKeys,
    })
  }

  const securityFields = securityFieldsFor(node.data.elementType)
  const attrs = node.data.attributes ?? {}

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

      {node.data.elementType === 'trust-boundary' && (
        <label className="inspector__field">
          <span>Boundary type</span>
          <select
            value={node.data.boundaryType ?? ''}
            onChange={(e) => onUpdate(node.id, { boundaryType: (e.target.value || undefined) as never })}
          >
            <option value="">— not set —</option>
            {BOUNDARY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}

      {stencilOptions.length > 0 && (
        <div className="inspector__field">
          <span>Type</span>
          <Combobox
            options={comboboxOptions}
            value={searchText}
            placeholder="Click or type, e.g. Web Server…"
            onChangeText={setSearchText}
            onSelect={handleSelect}
          />
          <div className="inspector__stencil-actions">
            <SaveAsCustomElement defaultName={searchText || node.data.label} onSave={saveCustomElement} />
          </div>
        </div>
      )}

      <SecurityPropertiesSection
        fields={securityFields}
        customFields={node.data.customFields ?? []}
        attrs={attrs}
        hiddenKeys={node.data.hiddenFieldKeys ?? []}
        onSetAttribute={setAttribute}
        onHideField={hideField}
        onRestoreField={restoreField}
        onAddCustomField={addCustomField}
        onRemoveCustomField={removeCustomField}
      />

      {node.data.elementType === 'data-store' && (
        <ComplianceSection
          tags={node.data.complianceTags ?? []}
          pciScope={node.data.pciScope}
          notes={node.data.complianceNotes}
          onChange={setCompliance}
        />
      )}
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
    const nextAttrs = { ...edge.data?.attributes, [key]: value }
    if (key === 'protocol') {
      const protocolDefaults = DATA_FLOW_PROTOCOL_DEFAULTS[value as keyof typeof DATA_FLOW_PROTOCOL_DEFAULTS]
      if (protocolDefaults) {
        for (const [k, v] of Object.entries(protocolDefaults)) {
          if (nextAttrs[k] === undefined || nextAttrs[k] === '') nextAttrs[k] = v
        }
      }
    }
    onUpdate(edge.id, { attributes: nextAttrs })
  }

  function hideField(key: string) {
    onUpdate(edge.id, { hiddenFieldKeys: [...(edge.data?.hiddenFieldKeys ?? []), key] })
  }

  function restoreField(key: string) {
    onUpdate(edge.id, { hiddenFieldKeys: (edge.data?.hiddenFieldKeys ?? []).filter((k) => k !== key) })
  }

  function addCustomField(def: CustomFieldDef) {
    onUpdate(edge.id, { customFields: [...(edge.data?.customFields ?? []), def] })
  }

  function removeCustomField(key: string) {
    const { [key]: _removed, ...restAttrs } = edge.data?.attributes ?? {}
    onUpdate(edge.id, {
      customFields: (edge.data?.customFields ?? []).filter((f) => f.key !== key),
      attributes: restAttrs,
    })
  }

  function setCompliance(tags: ComplianceTag[], pciScope?: PciScope, complianceNotes?: string) {
    onUpdate(edge.id, { complianceTags: tags, pciScope, complianceNotes })
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

      <SecurityPropertiesSection
        fields={dataFlowSecurityFields()}
        customFields={edge.data?.customFields ?? []}
        attrs={attrs}
        hiddenKeys={edge.data?.hiddenFieldKeys ?? []}
        onSetAttribute={setSecurityAttribute}
        onHideField={hideField}
        onRestoreField={restoreField}
        onAddCustomField={addCustomField}
        onRemoveCustomField={removeCustomField}
      />

      <ComplianceSection
        tags={edge.data?.complianceTags ?? []}
        pciScope={edge.data?.pciScope}
        notes={edge.data?.complianceNotes}
        onChange={setCompliance}
      />
    </div>
  )
}

export function Inspector({
  selection,
  customStencils,
  onUpdateNode,
  onUpdateEdge,
  onReverseEdge,
  onSaveCustomStencil,
  onDelete,
  onClose,
  width,
}: InspectorProps) {
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
        <NodeInspector
          node={selection.node}
          customStencils={customStencils}
          onUpdate={onUpdateNode}
          onSaveCustomStencil={onSaveCustomStencil}
        />
      ) : (
        <EdgeInspector edge={selection.edge} onUpdate={onUpdateEdge} onReverse={onReverseEdge} />
      )}

      <button type="button" className="btn inspector__delete" onClick={onDelete}>
        Delete {selection.kind === 'node' ? 'element' : 'connection'}
      </button>
    </aside>
  )
}
