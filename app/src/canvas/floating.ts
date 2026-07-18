import type { InternalNode } from '@xyflow/react'
import type { DiagramNode } from '../types/project'

/**
 * Computes where the straight line between two node centers crosses each
 * node's rectangle boundary. Used so edges attach wherever they actually
 * point instead of stacking at a fixed handle dot — see React Flow's
 * "floating edges" pattern.
 */
export function getNodeIntersection(
  intersectionNode: InternalNode<DiagramNode>,
  targetNode: InternalNode<DiagramNode>,
  /** Shifts the point this node "aims" at before computing the boundary
   *  crossing — used to fan out where parallel sibling edges actually touch
   *  each node's edge, not just the curve between them. Passing the same
   *  offset for both directions (source->target and target->source) shifts
   *  both ends the same visual way, keeping the line roughly parallel to the
   *  unshifted one instead of skewing it. */
  aimOffset: { x: number; y: number } = { x: 0, y: 0 }
) {
  const iw = intersectionNode.measured.width ?? 150
  const ih = intersectionNode.measured.height ?? 50
  const iPos = intersectionNode.internals.positionAbsolute
  const tPos = targetNode.internals.positionAbsolute
  const tw = targetNode.measured.width ?? 150
  const th = targetNode.measured.height ?? 50

  const w = iw / 2
  const h = ih / 2

  const x2 = iPos.x + w
  const y2 = iPos.y + h
  const x1 = tPos.x + tw / 2 + aimOffset.x
  const y1 = tPos.y + th / 2 + aimOffset.y

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h)
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1
  const yy3 = a * yy1

  return {
    x: w * (xx3 + yy3) + x2,
    y: h * (-xx3 + yy3) + y2,
  }
}

export function getEdgeParams(
  source: InternalNode<DiagramNode>,
  target: InternalNode<DiagramNode>,
  aimOffset?: { x: number; y: number }
) {
  const sourceIntersection = getNodeIntersection(source, target, aimOffset)
  const targetIntersection = getNodeIntersection(target, source, aimOffset)
  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
  }
}
