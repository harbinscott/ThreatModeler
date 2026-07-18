import type { NodeProps } from '@xyflow/react'
import { FourWayHandles } from '../handles'
import { EditableLabel } from '../EditableLabel'
import { resolveNodeStyle, withRiskRing } from '../nodeColor'
import { ThreatBadge } from '../ThreatBadge'
import { ComplianceBadge } from '../ComplianceBadge'
import { useThreatOverlay } from '../ThreatOverlayContext'
import type { DiagramNode } from '../../types/project'

export function ExternalEntityNode({ id, data, selected }: NodeProps<DiagramNode>) {
  const { riskColor } = useThreatOverlay(id)
  return (
    <div
      className={`dfd-node dfd-node--entity${selected ? ' dfd-node--selected' : ''}`}
      style={withRiskRing(resolveNodeStyle(data.colors), riskColor)}
    >
      <FourWayHandles />
      <EditableLabel nodeId={id} value={data.label} />
      <ThreatBadge targetId={id} />
      <ComplianceBadge targetId={id} />
    </div>
  )
}
