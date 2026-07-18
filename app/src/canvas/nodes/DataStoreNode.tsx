import type { NodeProps } from '@xyflow/react'
import { FourWayHandles } from '../handles'
import { EditableLabel } from '../EditableLabel'
import { resolveNodeStyle } from '../nodeColor'
import { ThreatBadge } from '../ThreatBadge'
import type { DiagramNode } from '../../types/project'

export function DataStoreNode({ id, data, selected }: NodeProps<DiagramNode>) {
  return (
    <div
      className={`dfd-node dfd-node--store${selected ? ' dfd-node--selected' : ''}`}
      style={resolveNodeStyle(data.colors)}
    >
      <FourWayHandles />
      <EditableLabel nodeId={id} value={data.label} />
      <ThreatBadge targetId={id} />
    </div>
  )
}
