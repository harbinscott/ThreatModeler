import type { CSSProperties } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FourWayHandles } from '../handles'
import { EditableLabel } from '../EditableLabel'
import { resolveNodeStyle, withRiskRing } from '../nodeColor'
import { ThreatBadge } from '../ThreatBadge'
import { ComplianceBadge } from '../ComplianceBadge'
import { useThreatOverlay } from '../ThreatOverlayContext'
import type { DiagramNode } from '../../types/project'

/** The hexagon is drawn on an inner `inset:0` layer rather than directly on
 *  the node div: `clip-path` clips *all* painted content of the element it's
 *  applied to, including overflowing absolutely-positioned children — so
 *  putting it on the same div as `FourWayHandles` silently chopped off the
 *  connection handles (worst at the left/right points, where the hexagon
 *  narrows to nothing), making the node undraggable-into. Handles, label, and
 *  badges stay on the unclipped outer div instead — same split
 *  `TrustBoundaryNode` uses for its shape layer. */
export function MitigationNode({ id, data, selected }: NodeProps<DiagramNode>) {
  const { riskColor } = useThreatOverlay(id)
  const colorStyle = resolveNodeStyle(data.colors)
  const outerStyle: CSSProperties = { ...withRiskRing(undefined, riskColor) }
  if (colorStyle?.color) outerStyle.color = colorStyle.color
  const shapeStyle: CSSProperties = {}
  if (colorStyle?.background) shapeStyle.background = colorStyle.background
  if (colorStyle?.borderColor) shapeStyle.borderColor = colorStyle.borderColor

  return (
    <div className={`dfd-node dfd-node--mitigation${selected ? ' dfd-node--selected' : ''}`} style={outerStyle}>
      <div className="dfd-node--mitigation__shape" style={shapeStyle} />
      <FourWayHandles />
      <EditableLabel nodeId={id} value={data.label} className="dfd-node--mitigation__label" />
      <ThreatBadge targetId={id} />
      <ComplianceBadge targetId={id} />
    </div>
  )
}
