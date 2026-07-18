import { useRef, useState } from 'react'
import type { DiagramEdge, DiagramNode } from '../types/project'

interface DiagramSnapshot {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

const MAX_HISTORY = 50

function clone<T>(value: T): T {
  return structuredClone(value)
}

/** Undo/redo stack for the diagram canvas. Nodes/edges are recorded as full
 *  snapshots (not diffs) — simple to reason about, and diagrams are small
 *  enough that this is cheap. Callers call `record()` themselves (typically
 *  debounced on nodes/edges change, see Canvas.tsx) rather than this hook
 *  instrumenting every mutation call site individually.
 *
 *  The hook tracks its own "current settled state" internally (`currentRef`)
 *  rather than trusting the caller to pass it in on every call — `record()`
 *  pushes the *previous* current state onto the undo stack and only then
 *  updates current to the new one, so the first undo actually steps back
 *  instead of restoring the state that's already showing (a no-op that made
 *  it look like undo needed to be pressed twice). */
export function useDiagramHistory() {
  const past = useRef<DiagramSnapshot[]>([])
  const future = useRef<DiagramSnapshot[]>([])
  const currentRef = useRef<DiagramSnapshot | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  /** Establishes the baseline state (e.g. right after project load) without
   *  pushing anything onto the undo stack. */
  function reset(nodes: DiagramNode[], edges: DiagramEdge[]) {
    currentRef.current = { nodes: clone(nodes), edges: clone(edges) }
    past.current = []
    future.current = []
    setCanUndo(false)
    setCanRedo(false)
  }

  function record(nodes: DiagramNode[], edges: DiagramEdge[]) {
    if (currentRef.current) {
      past.current.push(currentRef.current)
      if (past.current.length > MAX_HISTORY) past.current.shift()
    }
    currentRef.current = { nodes: clone(nodes), edges: clone(edges) }
    future.current = []
    setCanUndo(past.current.length > 0)
    setCanRedo(false)
  }

  function undo(): DiagramSnapshot | null {
    const previous = past.current.pop()
    if (!previous || !currentRef.current) return null
    future.current.push(currentRef.current)
    currentRef.current = previous
    setCanUndo(past.current.length > 0)
    setCanRedo(true)
    return clone(previous)
  }

  function redo(): DiagramSnapshot | null {
    const next = future.current.pop()
    if (!next) return null
    if (currentRef.current) past.current.push(currentRef.current)
    currentRef.current = next
    setCanUndo(true)
    setCanRedo(future.current.length > 0)
    return clone(next)
  }

  return { reset, record, undo, redo, canUndo, canRedo }
}
