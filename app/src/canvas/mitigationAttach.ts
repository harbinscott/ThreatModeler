import type { Diagram, DiagramEdge, DiagramEdgeData, DiagramNode } from '../types/project'
import { edgeVisualProps, DEFAULT_EDGE_DATA } from './edgeStyle'

const ATTACH_THRESHOLD_PX = 40

function nodeCenter(node: DiagramNode): { x: number; y: number } {
  const width = node.measured?.width ?? 150
  const height = node.measured?.height ?? 50
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 }
}

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Independent copy of an edge's data bag — the two new segments produced by
 *  a splice each need their own arrays/objects, not shared references, so
 *  editing one segment's compliance tags later can't silently mutate the
 *  other's. */
function cloneEdgeData(data: DiagramEdgeData | undefined): DiagramEdgeData {
  const base = data ?? DEFAULT_EDGE_DATA
  return {
    ...base,
    attributes: base.attributes ? { ...base.attributes } : undefined,
    customFields: base.customFields?.map((f) => ({ ...f })),
    hiddenFieldKeys: base.hiddenFieldKeys ? [...base.hiddenFieldKeys] : undefined,
    complianceTags: base.complianceTags ? [...base.complianceTags] : undefined,
  }
}

function splitEdgeThroughNode(edge: DiagramEdge, mitigationNodeId: string): [DiagramEdge, DiagramEdge] {
  const dataIn = cloneEdgeData(edge.data)
  const dataOut = cloneEdgeData(edge.data)
  return [
    { id: crypto.randomUUID(), source: edge.source, target: mitigationNodeId, type: edge.type, data: dataIn, label: dataIn.label, ...edgeVisualProps(dataIn) },
    { id: crypto.randomUUID(), source: mitigationNodeId, target: edge.target, type: edge.type, data: dataOut, label: dataOut.label, ...edgeVisualProps(dataOut) },
  ]
}

/** Dropping (or re-dragging) a mitigation node onto an existing flow's path
 *  splices it inline: the direct connection is replaced with
 *  source -> mitigation -> target, each new segment carrying its own full
 *  copy of the original edge's line style/color/label/attributes/compliance
 *  data (not just a visual pass-through — the two hops are genuinely
 *  separate STRIDE/DREAD targets once split). Matches *every* edge whose
 *  straight-line path comes within `ATTACH_THRESHOLD_PX` of the node's
 *  current center, not just the closest one, so multiple flows
 *  converging/diverging near the same point (fan-in/fan-out) all route
 *  through it from a single drop. Per-node opt-out via
 *  `data.mitigationAutoAttach === false` for a mitigation the user wants to
 *  place near a path without absorbing it. */
export function attachMitigationToCrossingFlows(mitigationNode: DiagramNode, diagram: Diagram): DiagramEdge[] | null {
  if (mitigationNode.data.elementType !== 'mitigation') return null
  if (mitigationNode.data.mitigationAutoAttach === false) return null

  const center = nodeCenter(mitigationNode)
  const matched: DiagramEdge[] = []
  for (const edge of diagram.edges) {
    if (edge.source === mitigationNode.id || edge.target === mitigationNode.id) continue
    const sourceNode = diagram.nodes.find((n) => n.id === edge.source)
    const targetNode = diagram.nodes.find((n) => n.id === edge.target)
    if (!sourceNode || !targetNode) continue
    if (distanceToSegment(center, nodeCenter(sourceNode), nodeCenter(targetNode)) <= ATTACH_THRESHOLD_PX) {
      matched.push(edge)
    }
  }
  if (matched.length === 0) return null

  const matchedIds = new Set(matched.map((e) => e.id))
  const replacements = matched.flatMap((e) => splitEdgeThroughNode(e, mitigationNode.id))
  return [...diagram.edges.filter((e) => !matchedIds.has(e.id)), ...replacements]
}
