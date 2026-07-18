import type { Edge, Node } from '@xyflow/react'

export interface FrameworkSelection {
  stride: boolean
  dread: boolean
  pasta: boolean
}

export type ElementType = 'process' | 'external-entity' | 'data-store' | 'trust-boundary'

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
}

export type DiagramNode = Node<DiagramNodeData>
export type DiagramEdge = Edge<DiagramEdgeData>

export interface Diagram {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
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
  dreadNeedsReview?: boolean
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
  createdAt: string
  updatedAt: string
}

export interface NewProjectInput {
  name: string
  description: string
  frameworks: FrameworkSelection
}
