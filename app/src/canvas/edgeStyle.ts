import { MarkerType, type EdgeMarkerType } from '@xyflow/react'
import type { DiagramEdgeData } from '../types/project'

const DASH: Record<string, string | undefined> = {
  solid: undefined,
  dashed: '8,5',
  dotted: '2,4',
}

export function edgeVisualProps(data: DiagramEdgeData) {
  const dash = DASH[data.lineStyle ?? 'solid']
  const arrow: EdgeMarkerType = data.color
    ? { type: MarkerType.ArrowClosed, color: data.color }
    : { type: MarkerType.ArrowClosed }
  const style = {
    ...(dash ? { strokeDasharray: dash } : {}),
    ...(data.color ? { stroke: data.color } : {}),
  }
  return {
    style: Object.keys(style).length ? style : undefined,
    markerEnd: data.arrowStyle === 'none' ? undefined : arrow,
    markerStart: data.arrowStyle === 'two-way' ? arrow : undefined,
  }
}

export const DEFAULT_EDGE_DATA: DiagramEdgeData = {
  lineStyle: 'solid',
  arrowStyle: 'one-way',
}
