import { Handle, Position } from '@xyflow/react'

const POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export function FourWayHandles() {
  return (
    <>
      {POSITIONS.map((pos) => (
        <Handle key={pos} type="source" position={pos} id={pos} className="node-handle" />
      ))}
    </>
  )
}
