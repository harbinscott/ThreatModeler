import { NodeResizer, type NodeProps } from '@xyflow/react'
import { EditableLabel } from '../EditableLabel'
import type { DiagramNode } from '../../types/project'

export function TrustBoundaryNode({ id, data, selected }: NodeProps<DiagramNode>) {
  // Boundaries are containers, not filled shapes — only the accent
  // (border/label) color is customizable, not a solid fill.
  const accent = data.colors?.border ?? data.colors?.fill
  return (
    <div
      className="dfd-node dfd-node--boundary"
      style={accent ? { borderColor: accent, background: `${accent}0a` } : undefined}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        lineClassName="boundary-resize-line"
        handleClassName="boundary-resize-handle"
        color={accent}
      />
      <EditableLabel
        nodeId={id}
        value={data.label}
        className="dfd-node--boundary__label"
        style={accent ? { color: accent, background: 'var(--bg)' } : undefined}
      />
    </div>
  )
}
