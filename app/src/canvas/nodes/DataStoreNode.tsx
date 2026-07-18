import type { NodeProps } from '@xyflow/react'
import { FourWayHandles } from '../handles'
import { EditableLabel } from '../EditableLabel'
import { resolveNodeStyle, withRiskRing } from '../nodeColor'
import { ThreatBadge } from '../ThreatBadge'
import { useThreatOverlay } from '../ThreatOverlayContext'
import type { DiagramNode } from '../../types/project'

export function DataStoreNode({ id, data, selected }: NodeProps<DiagramNode>) {
  const { riskColor } = useThreatOverlay(id)
  return (
    <div
      className={`dfd-node dfd-node--store${selected ? ' dfd-node--selected' : ''}`}
      style={withRiskRing(resolveNodeStyle(data.colors), riskColor)}
    >
      <FourWayHandles />
      <EditableLabel nodeId={id} value={data.label} />
      <ThreatBadge targetId={id} />
    </div>
  )
}
