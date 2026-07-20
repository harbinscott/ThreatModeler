import type { Edge, Node } from '@xyflow/react'

export interface FrameworkSelection {
  stride: boolean
  dread: boolean
  pasta: boolean
}

export type ElementType = 'process' | 'external-entity' | 'data-store' | 'trust-boundary' | 'mitigation'

export type AttributeValue = string | boolean

export interface NodeColors {
  fill?: string
  border?: string
  text?: string
}

export type BoundaryShape = 'rectangle' | 'circle' | 'cloud'

export type CustomFieldType = 'text' | 'boolean' | 'select'

/** A user-defined security property, beyond the built-in MS-TMT-derived
 *  schema in `mstmAttributes.ts`. Lives inline on the node/edge that defined
 *  it (`DiagramNodeData.customFields` / `DiagramEdgeData.customFields`) so a
 *  one-off addition doesn't require touching the project-level catalog —
 *  "save as custom element" is what promotes a set of these into a reusable
 *  `CustomStencil`. Values are stored in the same `attributes` bag as the
 *  built-in fields, keyed by `key`. */
export interface CustomFieldDef {
  key: string
  label: string
  type: CustomFieldType
  options?: string[]
}

/** A project-scoped, user-saved element preset — "save as custom element"
 *  writes one of these. Selectable from the same Type picker as the
 *  built-in stencils in `stencils.ts`, grouped separately. */
export interface CustomStencil {
  id: string
  name: string
  elementType: ElementType
  /** Pre-filled shared-field values, applied the same way a built-in
   *  stencil's `defaults` are. */
  defaults?: Record<string, AttributeValue>
  customFields?: CustomFieldDef[]
  /** Built-in shared-field keys suppressed for this stencil (see
   *  `DiagramNodeData.hiddenFieldKeys` for the per-instance equivalent). */
  hiddenFieldKeys?: string[]
}

export type DataFlowProtocol =
  | 'HTTP'
  | 'HTTPS'
  | 'IPsec'
  | 'RPC/DCOM'
  | 'Named Pipe'
  | 'SMB'
  | 'ALPC'
  | 'Binary'
  | 'UDP'
  | 'IOCTL'

export type BoundaryType =
  | 'Network Boundary'
  | 'Internet Boundary'
  | 'Corporate/Internal Network Boundary'
  | 'Sandbox / Isolation Boundary'
  | 'Kernel/User Mode Boundary'
  | 'Cloud Account/Tenant Boundary'

export type ComplianceTag = 'PII' | 'PHI' | 'PCI' | 'GDPR' | 'SOX' | 'SOC2' | 'CMMC'

/** PCI-specific sub-classification, only meaningful when `complianceTags`
 *  includes 'PCI' — mirrors how PCI DSS segmentation is actually reasoned
 *  about (cardholder data environment vs. systems merely connected to it),
 *  not the org-wide "merchant level" concept, which isn't a per-asset
 *  property. */
export type PciScope = 'Connected' | 'CDE'

export interface DiagramNodeData extends Record<string, unknown> {
  label: string
  elementType: ElementType
  description?: string
  /** Id of the selected stencil — either a built-in id from `stencils.ts`
   *  or a `CustomStencil.id` from `project.customStencils`. Free text if it
   *  doesn't match either (an unsaved ad-hoc type label). */
  componentType?: string
  attributes?: Record<string, AttributeValue>
  colors?: NodeColors
  /** Trust-boundary only. Undefined means 'rectangle' (all boundaries before
   *  this field existed). 'Square' isn't its own shape — it's a rectangle
   *  boundary just given equal initial width/height when added. */
  boundaryShape?: BoundaryShape
  /** Trust-boundary only. Semantic type, independent of visual shape. */
  boundaryType?: BoundaryType
  /** User-added properties beyond the built-in schema for this instance. */
  customFields?: CustomFieldDef[]
  /** Built-in shared-field keys hidden for this instance only. */
  hiddenFieldKeys?: string[]
  /** Directly (manually) assigned regulatory/data-classification tags —
   *  the seed for propagation, see `complianceTags.ts`. Data Store nodes
   *  and Data Flow edges only; other element types only ever see the
   *  *propagated* result via `ThreatOverlayContext`, not this field. */
  complianceTags?: ComplianceTag[]
  /** Only rendered/meaningful when `complianceTags` includes 'PCI'. */
  pciScope?: PciScope
  /** Freeform context for the directly-assigned tags on *this* element
   *  (e.g. "Tier 2 PCI asset, processes card data — additional review
   *  required"). Not propagated — an element that only inherited tags from
   *  a connected one doesn't inherit this note too, since it's specific to
   *  the element that owns it. */
  complianceNotes?: string
  /** Mitigation nodes only. When a mitigation node is dropped/dragged onto an
   *  existing flow's path, it auto-splices in place of the direct connection
   *  (source -> mitigation -> target) — see `mitigationAttach.ts`. Undefined
   *  means enabled (the default); explicit `false` opts a specific mitigation
   *  out, for one the user wants positioned near a path without absorbing it. */
  mitigationAutoAttach?: boolean
  /** Process nodes only — id of a nested "drill-down" diagram in
   *  `Project.subDiagrams` (DFD leveling: this Process decomposed into its
   *  own detailed flow). Not available on other element types since Data
   *  Stores/External Entities/Trust Boundaries/Mitigations are terminal in
   *  DFD methodology. */
  subDiagramId?: string
  /** Process and Data Store nodes only (Release 12) — manually flags an
   *  asset as business-critical ("if this is compromised, it's a very bad
   *  day"), for risk prioritization. Deliberately not propagated/flood-filled
   *  like `complianceTags` — a crown-jewel designation is about *this specific
   *  asset's* value, not something proximity should spread, so an upstream
   *  node that merely talks to a crown jewel doesn't inherit the label.
   *  Directly-touching flows still count (see `dreadEngine.ts`'s
   *  `crownJewelContributions`), same as compliance tags' direct-edge rule. */
  crownJewel?: boolean
}

export type LineStyle = 'solid' | 'dashed' | 'dotted'
export type ArrowStyle = 'one-way' | 'two-way' | 'none'

export interface DiagramEdgeData extends Record<string, unknown> {
  label?: string
  lineStyle?: LineStyle
  arrowStyle?: ArrowStyle
  color?: string
  attributes?: Record<string, AttributeValue>
  customFields?: CustomFieldDef[]
  hiddenFieldKeys?: string[]
  complianceTags?: ComplianceTag[]
  pciScope?: PciScope
  complianceNotes?: string
}

export type DiagramNode = Node<DiagramNodeData>
export type DiagramEdge = Edge<DiagramEdgeData>

export interface Diagram {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

/** Custom user-defined STRIDE rules (Release 12 stage D) — the same
 *  condition -> STRIDE category + description shape every built-in rule in
 *  `ruleEngine.ts` already follows, just user-authored and project-scoped
 *  instead of hardcoded. 'edge' covers Data Flows; the other four scopes
 *  match `ElementType` minus 'trust-boundary' (boundaries are containers,
 *  not threat targets in this app). */
export type CustomRuleScope = 'process' | 'external-entity' | 'data-store' | 'mitigation' | 'edge'

/** 'none' always fires (no condition — useful for org-specific policy
 *  threats that should apply to every element of a scope regardless of its
 *  attributes). 'true'/'false' check a boolean attribute; 'equals' does a
 *  string comparison — covers every `AttributeValue` shape (`mstmAttributes.ts`
 *  fields are boolean or text/select) without needing a richer expression
 *  language. `attributeKey` is freeform text rather than a closed enum since
 *  it must also reach project-specific custom fields (`DiagramNodeData.customFields`),
 *  which aren't known statically. */
export type CustomRuleConditionOperator = 'none' | 'true' | 'false' | 'equals'

export interface CustomRuleCondition {
  operator: CustomRuleConditionOperator
  attributeKey?: string
  value?: string
}

export interface CustomRule {
  id: string
  /** Short label identifying the rule itself in the rule list — distinct
   *  from the generated threat's title, which is a template. */
  name: string
  scope: CustomRuleScope
  category: StrideCategory
  condition: CustomRuleCondition
  /** Threat title/description templates — `{label}` is replaced with the
   *  matched element's (or flow's) label at generation time. */
  title: string
  description: string
  /** Lets a rule be turned off without losing its definition or discarding
   *  any threats it already generated (those stay, same as deleting a
   *  built-in rule's *code* wouldn't retroactively delete past threats —
   *  this app has no such mechanism for built-ins, so disabling is the
   *  custom-rule equivalent of "stop generating new ones from here on"). */
  enabled: boolean
}

export type StrideCategory = 'S' | 'T' | 'R' | 'I' | 'D' | 'E'
export type ThreatStatus = 'open' | 'mitigated' | 'accepted' | 'false-positive'
export type ThreatSource = 'auto' | 'manual'

export interface DreadScore {
  damage?: number
  reproducibility?: number
  exploitability?: number
  affectedUsers?: number
  discoverability?: number
}

/** One named reason a DREAD field's suggested value is what it is — the
 *  base score for the STRIDE category, plus zero or more adjustments, each
 *  carrying the same "why" a human reviewer would want ("no authentication
 *  declared", "crosses a trust boundary", etc). See `dreadEngine.ts`'s
 *  `explainDreadScore`. Frozen onto `Threat.dreadBreakdown` at the same
 *  time `dread` itself is computed, so the "why these scores" hover always
 *  explains the number actually shown rather than silently recomputing
 *  against however the diagram looks *now* (which could have drifted since
 *  generation and no longer match the frozen score). */
export interface DreadContribution {
  key: keyof DreadScore
  label: string
  amount: number
}

/** One lightweight, timestamped reviewer comment (Release 12) — distinct
 *  from `Threat.notes` (the single freeform "what mitigates this / why
 *  accepted" resolution field): a comment thread for async back-and-forth
 *  during review ("shouldn't Exploitability be higher given no WAF?" / "good
 *  catch, bumped it") without needing full multi-user editing. `author` is
 *  freeform text, same posture as `acceptedBy`/`ThreatModelInfo`'s
 *  owner/reviewer fields elsewhere in this app — no user-account system to
 *  attach a real identity to. Never edited in place once added, only
 *  deletable — a comment thread that silently rewrites itself isn't a real
 *  record of a review conversation. */
export interface ReviewerComment {
  id: string
  author?: string
  text: string
  createdAt: string
}

export interface Threat {
  id: string
  ruleId: string
  targetType: 'node' | 'edge'
  targetId: string
  targetLabel: string
  componentType?: string
  category: StrideCategory
  title: string
  description: string
  status: ThreatStatus
  source: ThreatSource
  notes?: string
  dread?: DreadScore
  dreadBreakdown?: DreadContribution[]
  dreadNeedsReview?: boolean
  /** Risk-acceptance sign-off — only meaningful while `status === 'accepted'`.
   *  `acceptedAt` auto-stamps the first time status becomes 'accepted' and
   *  is never overwritten afterward (so it records *when this was first
   *  accepted*, not the last time the status field happened to read
   *  'accepted' — reopening and re-accepting a threat doesn't erase that
   *  history). `acceptedBy` is freeform text, same as every other
   *  attribution field in this app (`ThreatModelInfo`'s owner/reviewer) —
   *  there's no user-account system to attach a real identity to.
   *  `reviewByDate` drives an overdue check in `diagnostics.ts`. */
  acceptedBy?: string
  acceptedAt?: string
  reviewByDate?: string
  /** Async review-cycle comment thread (Release 12) — see `ReviewerComment`. */
  reviewerComments?: ReviewerComment[]
  createdAt: string
}

export interface PastaData {
  stage1: { businessObjectives: string; complianceRequirements: string; riskTolerance: string; keyStakeholders: string }
  stage2: { technologies: string; thirdPartyDependencies: string; networkNotes: string }
  stage3: { entryPoints: string; trustLevelNotes: string }
  stage4: { threatAgents: string; attackScenarios: string }
  stage5: { knownVulnerabilities: string; mappingNotes: string }
  stage6: { attackTrees: string; simulationNotes: string }
  stage7: { businessImpact: string; residualRisk: string; countermeasures: string }
}

export interface ThreatModelInfo {
  owner: string
  contributors: string
  reviewer: string
  assumptions: string
  externalDependencies: string
}

/** A nested "drill-down" diagram owned by a single Process node (Release 8).
 *  Stored flat in `Project.subDiagrams` keyed by id — not nested inside the
 *  owning node — so arbitrary depth/tree shape doesn't need recursive
 *  typing, and navigating levels is a map lookup rather than a tree walk.
 *  Threats/DREAD scores are scoped to this level only, deliberately not
 *  rolled up into the parent's Threats tab or PDF export (a summary badge
 *  on the owning node, not yet built, is the only planned cross-level
 *  signal) — avoids double-counting between a summary model and its detail. */
export interface SubDiagram {
  id: string
  diagram: Diagram
  threats: Threat[]
}

/** A capped, full-state snapshot taken on every save (Release 9) — same
 *  "full snapshot, not a diff" architecture `useDiagramHistory`'s undo stack
 *  already uses, applied at the project level instead of just nodes/edges.
 *  Everything that can change across a save except the revision history
 *  itself (nesting it inside itself would grow unboundedly) and identity
 *  fields (id/name/createdAt, which don't change per-save anyway). */
export interface ProjectRevision {
  id: string
  savedAt: string
  snapshot: {
    diagram: Diagram
    threats: Threat[]
    pasta?: PastaData
    info?: ThreatModelInfo
    notes?: string
    customStencils?: CustomStencil[]
    customRules?: CustomRule[]
    subDiagrams?: Record<string, SubDiagram>
  }
}

export interface Project {
  id: string
  name: string
  description: string
  frameworks: FrameworkSelection
  diagram: Diagram
  threats: Threat[]
  pasta?: PastaData
  info?: ThreatModelInfo
  notes?: string
  /** User-saved element presets ("save as custom element"), selectable from
   *  the Type picker in the Inspector alongside the built-in stencils. */
  customStencils?: CustomStencil[]
  /** User-authored STRIDE rules (Release 12), merged in alongside the
   *  built-in rule set every time threats are regenerated — see
   *  `generateCustomThreats` in `ruleEngine.ts`. */
  customRules?: CustomRule[]
  /** Nested drill-down diagrams, keyed by id — see `SubDiagram`. */
  subDiagrams?: Record<string, SubDiagram>
  /** Last `MAX_REVISIONS` (see Canvas.tsx) full-state snapshots, newest
   *  first — restorable via the History dialog. Capped to avoid unbounded
   *  project-file growth; `revisionCount` (below) keeps counting past the
   *  cap so the toolbar badge reflects the true number of saves ever made. */
  revisionHistory?: ProjectRevision[]
  /** Total number of saves ever made, uncapped (unlike revisionHistory,
   *  which only keeps the most recent few) — what the toolbar badge shows. */
  revisionCount?: number
  createdAt: string
  updatedAt: string
}

export interface NewProjectInput {
  name: string
  description: string
  frameworks: FrameworkSelection
}
