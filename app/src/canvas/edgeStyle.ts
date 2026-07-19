import { MarkerType, type EdgeMarkerType } from '@xyflow/react'
import type { DiagramEdgeData } from '../types/project'

const DASH: Record<string, string | undefined> = {
  solid: undefined,
  dashed: '8,5',
  dotted: '2,4',
}

// XYFlow's own dark-mode default (`.react-flow.dark`'s `--xy-edge-stroke-
// default` in its bundled stylesheet — this app doesn't override it, so
// this is the exact color an uncustomized edge already renders as live).
// A color-less edge used to leave `style.stroke` unset entirely, relying
// on that CSS custom property cascading from the stylesheet — invisible in
// PDF/PNG export (Release 11), since html-to-image's DOM clone doesn't
// reliably resolve `var(--xy-edge-stroke, var(--xy-edge-stroke-default))`
// the way a live browser paint does. Setting it inline fixes export
// without changing how anything looks on screen.
const DEFAULT_EDGE_STROKE = '#3e3e3e'

export function edgeVisualProps(data: DiagramEdgeData) {
  const dash = DASH[data.lineStyle ?? 'solid']
  const strokeColor = data.color ?? DEFAULT_EDGE_STROKE
  const arrow: EdgeMarkerType = { type: MarkerType.ArrowClosed, color: strokeColor }
  const style = {
    stroke: strokeColor,
    strokeWidth: 1,
    ...(dash ? { strokeDasharray: dash } : {}),
  }
  return {
    style,
    markerEnd: data.arrowStyle === 'none' ? undefined : arrow,
    markerStart: data.arrowStyle === 'two-way' ? arrow : undefined,
  }
}

export const DEFAULT_EDGE_DATA: DiagramEdgeData = {
  lineStyle: 'solid',
  arrowStyle: 'one-way',
}
