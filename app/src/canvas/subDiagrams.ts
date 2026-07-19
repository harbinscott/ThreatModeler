import type { Diagram, DiagramEdge, DiagramNode, Project, Threat } from '../types/project'
import { DEFAULT_EDGE_DATA, edgeVisualProps } from './edgeStyle'

/** Normalizes a raw diagram's edges the same way Canvas.tsx's project-load
 *  effect does — legacy edges saved before line-style/arrow/color logic
 *  existed would otherwise render with no marker. Shared here so a
 *  sub-diagram loaded mid-session gets the same treatment the top-level
 *  diagram gets on initial project load. */
export function normalizeEdges(edges: DiagramEdge[]): DiagramEdge[] {
  return edges.map((e) => {
    const data = { ...DEFAULT_EDGE_DATA, ...e.data }
    return { ...e, data, label: data.label, ...edgeVisualProps(data) }
  })
}

/** Reads whichever level is currently active out of a project — the
 *  top-level diagram/threats if `subDiagramId` is null, or the matching
 *  `Project.subDiagrams` entry otherwise. */
export function readLevel(project: Project, subDiagramId: string | null): { diagram: Diagram; threats: Threat[] } {
  if (!subDiagramId) return { diagram: project.diagram, threats: project.threats }
  const sub = project.subDiagrams?.[subDiagramId]
  return sub ? { diagram: sub.diagram, threats: sub.threats } : { diagram: { nodes: [], edges: [] }, threats: [] }
}

/** Writes the currently-edited nodes/edges/threats back into the right slot
 *  of the project object — either the top-level fields or the matching
 *  `subDiagrams` entry — without touching any other level. Called before
 *  navigating away from a level and before every save, so neither loses
 *  in-progress edits from the level being left. */
export function writeLevel(
  project: Project,
  subDiagramId: string | null,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  threats: Threat[]
): Project {
  if (!subDiagramId) return { ...project, diagram: { nodes, edges }, threats }
  const existing = project.subDiagrams?.[subDiagramId]
  if (!existing) return project
  return { ...project, subDiagrams: { ...project.subDiagrams, [subDiagramId]: { ...existing, diagram: { nodes, edges }, threats } } }
}

/** Collects a subDiagramId and every subDiagramId nested transitively
 *  beneath it — a sub-diagram's own Process nodes may have their own
 *  sub-diagrams — so deleting an owning node cleans up the whole subtree
 *  instead of leaving orphaned entries in `project.subDiagrams`. */
function collectNestedSubDiagramIds(project: Project, subDiagramId: string, acc: Set<string>) {
  if (acc.has(subDiagramId)) return
  acc.add(subDiagramId)
  const sub = project.subDiagrams?.[subDiagramId]
  if (!sub) return
  for (const n of sub.diagram.nodes) {
    if (n.data.subDiagramId) collectNestedSubDiagramIds(project, n.data.subDiagramId, acc)
  }
}

export function removeSubDiagramSubtree(project: Project, subDiagramId: string): Project {
  const toRemove = new Set<string>()
  collectNestedSubDiagramIds(project, subDiagramId, toRemove)
  const remaining = { ...(project.subDiagrams ?? {}) }
  for (const id of toRemove) delete remaining[id]
  return { ...project, subDiagrams: remaining }
}
