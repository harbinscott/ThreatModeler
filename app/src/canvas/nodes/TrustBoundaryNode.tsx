import { NodeResizer, type NodeProps } from '@xyflow/react'
import { EditableLabel } from '../EditableLabel'
import type { DiagramNode } from '../../types/project'

const CLOUD_PATH =
  'M 46 45 H 18 C 10 45 4 39 4 31 C 4 24 9 18 16 17 C 17 9 24 3 32 3 C 39 3 45 8 47 15 C 54 15 60 21 60 28 C 60 36 54 42 47 42 Z'

export function TrustBoundaryNode({ id, data, selected }: NodeProps<DiagramNode>) {
  // Boundaries are containers, not filled shapes — only the accent
  // (border/label) color is customizable, not a solid fill.
  const accent = data.colors?.border ?? data.colors?.fill ?? '#f59e0b'
  const shape = data.boundaryShape ?? 'rectangle'
  const fill = `${accent}0a`

  return (
    <div className="dfd-node dfd-node--boundary">
      <NodeResizer
        isVisible={selected}
        minWidth={shape === 'cloud' ? 200 : 120}
        minHeight={shape === 'cloud' ? 140 : 120}
        lineClassName="boundary-resize-line"
        handleClassName="boundary-resize-handle"
        color={accent}
      />
      {shape === 'cloud' ? (
        <svg viewBox="0 0 64 48" preserveAspectRatio="none" className="dfd-node--boundary__cloud" aria-hidden="true">
          <path d={CLOUD_PATH} fill={fill} stroke={accent} strokeWidth="1.2" strokeDasharray="2.5 2" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <div
          className={`dfd-node--boundary__shape${shape === 'circle' ? ' dfd-node--boundary__shape--circle' : ''}`}
          style={{ borderColor: accent, background: fill }}
        />
      )}
      <EditableLabel
        nodeId={id}
        value={data.label}
        className="dfd-node--boundary__label"
        style={{ color: accent, background: 'var(--bg)' }}
      />
    </div>
  )
}
