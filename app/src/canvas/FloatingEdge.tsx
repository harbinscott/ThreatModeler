import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useEdges,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
} from '@xyflow/react'
import { getEdgeParams } from './floating'
import { ThreatBadge } from './ThreatBadge'
import type { DiagramEdge, DiagramNode } from '../types/project'

const PARALLEL_SPACING = 32
const ENDPOINT_SPACING = 20

function nodeCenter(node: InternalNode<DiagramNode>) {
  const w = node.measured.width ?? 150
  const h = node.measured.height ?? 50
  const pos = node.internals.positionAbsolute
  return { x: pos.x + w / 2, y: pos.y + h / 2 }
}

export function FloatingEdge({
  id,
  source,
  target,
  markerStart,
  markerEnd,
  style,
  data,
}: EdgeProps<DiagramEdge>) {
  const sourceNode = useInternalNode<DiagramNode>(source)
  const targetNode = useInternalNode<DiagramNode>(target)
  const edges = useEdges<DiagramEdge>()

  if (!sourceNode || !targetNode) return null

  // Edges between the same pair of nodes (regardless of direction) land on
  // the same source/target intersection line by default and stack exactly
  // on top of each other. Spread siblings apart — both where they touch each
  // node's boundary and along a curved midpoint — so each stays visually
  // distinct and independently clickable; a pair with only one edge keeps
  // the original straight path.
  const pairKey = [source, target].sort().join('::')
  const siblings = edges.filter((e) => [e.source, e.target].sort().join('::') === pairKey)
  const siblingIndex = siblings.findIndex((e) => e.id === id)
  const offsetSteps = siblingIndex - (siblings.length - 1) / 2
  const isOffset = siblings.length > 1 && offsetSteps !== 0

  let px = 0
  let py = 0
  if (isOffset) {
    const sCenter = nodeCenter(sourceNode)
    const tCenter = nodeCenter(targetNode)
    const dx = tCenter.x - sCenter.x
    const dy = tCenter.y - sCenter.y
    const length = Math.hypot(dx, dy) || 1
    // Perpendicular direction is derived from the sorted node pair, not this
    // edge's own source/target, so a reversed edge (B->A vs A->B) still
    // offsets to the same side in world space instead of crossing over.
    const flip = source < target ? 1 : -1
    px = (-dy / length) * flip
    py = (dx / length) * flip
  }

  const aimOffset = isOffset
    ? { x: px * offsetSteps * ENDPOINT_SPACING, y: py * offsetSteps * ENDPOINT_SPACING }
    : undefined
  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode, aimOffset)

  let path: string
  let labelX: number
  let labelY: number

  if (isOffset) {
    const curveOffset = offsetSteps * PARALLEL_SPACING
    const cx = (sx + tx) / 2 + px * curveOffset
    const cy = (sy + ty) / 2 + py * curveOffset

    path = `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`
    // On-curve midpoint of the quadratic bezier (not the control point
    // itself) so the label sits on the visible line.
    labelX = 0.25 * sx + 0.5 * cx + 0.25 * tx
    labelY = 0.25 * sy + 0.5 * cy + 0.25 * ty
  } else {
    ;[path, labelX, labelY] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty })
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        label={data?.label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={{ fill: 'var(--text)', fontSize: 11, fontWeight: 600 }}
        labelBgStyle={{ fill: 'var(--bg)' }}
        labelBgPadding={[4, 2]}
        labelBgBorderRadius={4}
      />
      <EdgeLabelRenderer>
        <div
          className="floating-edge__badge-anchor"
          style={{
            position: 'absolute',
            pointerEvents: 'all',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + 18}px)`,
          }}
        >
          <ThreatBadge targetId={id} />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
