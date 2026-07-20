import type { Diagram, DiagramEdge, DiagramNode } from '../types/project'
import { parseTerraformResources } from './terraformParser'
import { TERRAFORM_RESOURCE_MAP, labelForResource } from './terraformMapping'
import { autoLayoutDiagram } from '../canvas/autoLayout'
import { findStencil } from '../canvas/stencils'

export interface TerraformImportSummary {
  /** Distinct resource types seen but not in `TERRAFORM_RESOURCE_MAP` —
   *  shown to the user so "why isn't my X on the diagram" has an answer
   *  instead of a silent gap. */
  skippedTypes: string[]
  importedCount: number
  skippedCount: number
  edgeCount: number
}

export interface TerraformImportResult {
  diagram: Diagram
  summary: TerraformImportSummary
}

/** Release 14 stage B — turns parsed Terraform resources into a positioned
 *  starter diagram, the same "generate a diagram, don't make the user
 *  place every node by hand" idea Release 13 stage G's templates already
 *  established. Unlike the hand-tuned templates, resource count/shape here
 *  is unpredictable, so positions come from the real auto-layout pass
 *  (Release 8) rather than fixed coordinates. Known v1 limitation,
 *  documented rather than silently absent: no `external-entity` nodes are
 *  ever generated — Terraform has no resource type for "a user" or an
 *  external actor, so the user has to add those by hand to complete the
 *  threat model. */
export function importTerraformSource(source: string): TerraformImportResult {
  const resources = parseTerraformResources(source)

  const nodesByAddress = new Map<string, DiagramNode>()
  const skippedTypes = new Set<string>()

  resources.forEach((resource, index) => {
    const mapping = TERRAFORM_RESOURCE_MAP[resource.type]
    if (!mapping) {
      skippedTypes.add(resource.type)
      return
    }
    const stencil = findStencil(mapping.stencilId)
    const node: DiagramNode = {
      id: crypto.randomUUID(),
      type: mapping.elementType,
      // Auto-layout repositions every node — this is just a distinct
      // starting point so dagre's input isn't every node stacked exactly
      // on top of each other.
      position: { x: (index % 6) * 40, y: Math.floor(index / 6) * 40 },
      data: {
        label: labelForResource(resource.type, resource.name),
        elementType: mapping.elementType,
        componentType: stencil?.id,
        attributes: stencil?.defaults ? { ...stencil.defaults } : undefined,
      },
    }
    nodesByAddress.set(resource.address, node)
  })

  const edges: DiagramEdge[] = []
  const seenPairs = new Set<string>()
  for (const resource of resources) {
    const dependent = nodesByAddress.get(resource.address)
    if (!dependent) continue
    const targets = new Set([...resource.dependsOn, ...resource.references])
    for (const targetAddress of targets) {
      const dependency = nodesByAddress.get(targetAddress)
      if (!dependency || dependency.id === dependent.id) continue
      // A resource depending on another implies data/control flows *from*
      // the dependency *to* the dependent (e.g. an instance depends on its
      // security group because the group has to exist first, but the
      // meaningful DFD direction is "traffic flows through the security
      // group to the instance") — so the edge points dependency -> dependent,
      // not the other way around.
      const pairKey = `${dependency.id}->${dependent.id}`
      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)
      edges.push({ id: crypto.randomUUID(), source: dependency.id, target: dependent.id, type: 'floating', data: {} })
    }
  }

  const nodes = [...nodesByAddress.values()]
  const laidOutNodes = autoLayoutDiagram({ nodes, edges })

  return {
    diagram: { nodes: laidOutNodes, edges },
    summary: {
      skippedTypes: [...skippedTypes].sort(),
      importedCount: nodes.length,
      skippedCount: resources.length - nodes.length,
      edgeCount: edges.length,
    },
  }
}
