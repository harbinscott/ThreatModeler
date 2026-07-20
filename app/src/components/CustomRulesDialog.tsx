import { useState } from 'react'
import { Modal } from './Modal'
import { Combobox, type ComboboxOption } from '../canvas/Combobox'
import { securityFieldsFor, dataFlowSecurityFields } from '../canvas/mstmAttributes'
import type { CustomRule, CustomRuleCondition, CustomRuleConditionOperator, CustomRuleScope, StrideCategory } from '../types/project'
import './CustomRulesDialog.css'

interface CustomRulesDialogProps {
  rules: CustomRule[]
  onChange: (rules: CustomRule[]) => void
  onClose: () => void
}

const SCOPE_LABELS: Record<CustomRuleScope, string> = {
  process: 'Process',
  'external-entity': 'External Entity',
  'data-store': 'Data Store',
  mitigation: 'Mitigation',
  edge: 'Data Flow',
}

const CATEGORY_LABELS: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

const CONDITION_LABELS: Record<CustomRuleConditionOperator, string> = {
  none: 'Always applies',
  true: 'Attribute is Yes / true',
  false: 'Attribute is No / false',
  equals: 'Attribute equals…',
}

function attributeOptionsFor(scope: CustomRuleScope): ComboboxOption[] {
  const fields = scope === 'edge' ? dataFlowSecurityFields() : securityFieldsFor(scope)
  return fields.map((f) => ({ id: f.key, label: `${f.label} (${f.key})` }))
}

function emptyRule(): CustomRule {
  return {
    id: crypto.randomUUID(),
    name: '',
    scope: 'process',
    category: 'T',
    condition: { operator: 'none' },
    title: '',
    description: '',
    enabled: true,
  }
}

function conditionSummary(condition: CustomRuleCondition): string {
  if (condition.operator === 'none') return 'always'
  if (condition.operator === 'equals') return `${condition.attributeKey} = "${condition.value ?? ''}"`
  return `${condition.attributeKey} is ${condition.operator}`
}

/** Project-scoped, user-authored STRIDE rules (Release 12 stage D) — the
 *  same condition -> category + description shape every built-in
 *  `ruleEngine.ts` rule already follows, just editable here instead of in
 *  code. Reachable from the "Custom Rules" toolbar button on the Threats
 *  tab; matched rules generate threats on the next "Regenerate Threats"
 *  click, same manual-trigger convention every other threat-affecting
 *  change in this app already follows (see Backlog item 6 for the known
 *  "forgot to regenerate" trap this shares with everything else here). */
export function CustomRulesDialog({ rules, onChange, onClose }: CustomRulesDialogProps) {
  const [editing, setEditing] = useState<CustomRule | null>(null)
  const [isNew, setIsNew] = useState(false)

  function startAdd() {
    setEditing(emptyRule())
    setIsNew(true)
  }

  function startEdit(rule: CustomRule) {
    setEditing(rule)
    setIsNew(false)
  }

  function saveEdit(rule: CustomRule) {
    onChange(isNew ? [...rules, rule] : rules.map((r) => (r.id === rule.id ? rule : r)))
    setEditing(null)
  }

  function deleteRule(id: string) {
    onChange(rules.filter((r) => r.id !== id))
  }

  function toggleEnabled(rule: CustomRule) {
    onChange(rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
  }

  return (
    <Modal title="Custom STRIDE Rules" onClose={onClose} width={580}>
      {editing ? (
        <CustomRuleForm rule={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />
      ) : (
        <>
          <p className="modal-message__empty" style={{ padding: 0, textAlign: 'left' }}>
            Matched elements/flows generate threats alongside the built-in rule set the next time you click
            "Regenerate Threats." Use <code>{'{label}'}</code> in the title or description to insert the matched
            element's name.
          </p>
          {rules.length === 0 ? (
            <p className="modal-message__empty">No custom rules yet — add one below.</p>
          ) : (
            <div className="custom-rules__list">
              {rules.map((r) => (
                <div className="custom-rules__row" key={r.id}>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={() => toggleEnabled(r)}
                    title={r.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                  />
                  <button type="button" className="custom-rules__summary" onClick={() => startEdit(r)}>
                    <span className="custom-rules__name">{r.name || '(untitled rule)'}</span>
                    <span className="custom-rules__meta">
                      {SCOPE_LABELS[r.scope]} · {CATEGORY_LABELS[r.category]} · {conditionSummary(r.condition)}
                    </span>
                  </button>
                  <button type="button" className="custom-rules__delete" title="Delete rule" onClick={() => deleteRule(r.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="modal-button-row">
            <button type="button" className="btn" onClick={startAdd}>
              + Add rule
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function CustomRuleForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: CustomRule
  onSave: (rule: CustomRule) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<CustomRule>(rule)
  const [attrSearch, setAttrSearch] = useState(draft.condition.attributeKey ?? '')

  function update(patch: Partial<CustomRule>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function updateCondition(patch: Partial<CustomRuleCondition>) {
    setDraft((d) => ({ ...d, condition: { ...d.condition, ...patch } }))
  }

  const attrOptions = attributeOptionsFor(draft.scope)
  const needsAttrKey = draft.condition.operator !== 'none'
  const needsValue = draft.condition.operator === 'equals'
  const canSave = draft.name.trim().length > 0 && draft.description.trim().length > 0 && (!needsAttrKey || attrSearch.trim().length > 0)

  return (
    <div className="custom-rule-form">
      <label className="modal-field">
        <span>Rule name</span>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="e.g. Flag unencrypted PII stores"
          autoFocus
        />
      </label>

      <div className="modal-field-row">
        <label className="modal-field">
          <span>Applies to</span>
          <select
            value={draft.scope}
            onChange={(e) => {
              const scope = e.target.value as CustomRuleScope
              update({ scope })
              setAttrSearch('')
              updateCondition({ attributeKey: undefined, value: undefined })
            }}
          >
            {(Object.keys(SCOPE_LABELS) as CustomRuleScope[]).map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="modal-field">
          <span>STRIDE category</span>
          <select value={draft.category} onChange={(e) => update({ category: e.target.value as StrideCategory })}>
            {(Object.keys(CATEGORY_LABELS) as StrideCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="modal-field">
        <span>Condition</span>
        <select
          value={draft.condition.operator}
          onChange={(e) => updateCondition({ operator: e.target.value as CustomRuleConditionOperator, value: undefined })}
        >
          {(Object.keys(CONDITION_LABELS) as CustomRuleConditionOperator[]).map((op) => (
            <option key={op} value={op}>
              {CONDITION_LABELS[op]}
            </option>
          ))}
        </select>
      </label>

      {needsAttrKey && (
        <label className="modal-field">
          <span>Attribute</span>
          <Combobox
            options={attrOptions}
            value={attrSearch}
            placeholder="Pick a known field, or type a custom property key"
            onChangeText={(text) => {
              setAttrSearch(text)
              updateCondition({ attributeKey: text })
            }}
            onSelect={(option) => {
              setAttrSearch(option.id)
              updateCondition({ attributeKey: option.id })
            }}
          />
        </label>
      )}

      {needsValue && (
        <label className="modal-field">
          <span>Equals</span>
          <input
            type="text"
            value={draft.condition.value ?? ''}
            onChange={(e) => updateCondition({ value: e.target.value })}
            placeholder="Value to match"
          />
        </label>
      )}

      <label className="modal-field">
        <span>Threat title</span>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={`Optional — defaults to "${CATEGORY_LABELS[draft.category]} of {label}"`}
        />
      </label>

      <label className="modal-field">
        <span>Threat description</span>
        <textarea
          rows={3}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="e.g. Could {label} expose PII without an approved data processing agreement?"
        />
      </label>

      <div className="modal-button-row">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSave}
          onClick={() =>
            onSave({ ...draft, condition: { ...draft.condition, attributeKey: needsAttrKey ? attrSearch.trim() : undefined } })
          }
        >
          Save rule
        </button>
      </div>
    </div>
  )
}
