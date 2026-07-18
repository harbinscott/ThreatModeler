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

export interface DiagramNodeData extends Record<string, unknown> {
  label: string
  elementType: ElementType
  description?: string
  componentType?: string
  attributes?: Record<string, AttributeValue>
  colors?: NodeColors
  /** Trust-boundary only. Undefined means 'rectangle' (all boundaries before
   *  this field existed). 'Square' isn't its own shape — it's a rectangle
   *  boundary just given equal initial width/height when added. */
  boundaryShape?: BoundaryShape
}

export type LineStyle = 'solid' | 'dashed' | 'dotted'
export type ArrowStyle = 'one-way' | 'two-way' | 'none'

export interface DiagramEdgeData extends Record<string, unknown> {
  label?: string
  lineStyle?: LineStyle
  arrowStyle?: ArrowStyle
  color?: string
  attributes?: Record<string, AttributeValue>
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
  createdAt: string
  updatedAt: string
}

export interface NewProjectInput {
  name: string
  description: string
  frameworks: FrameworkSelection
}
