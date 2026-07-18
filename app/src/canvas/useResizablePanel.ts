import { useCallback, useState } from 'react'

interface UseResizablePanelOptions {
  axis: 'x' | 'y'
  initial: number
  min?: number
  /** Keep at least this much room for whatever's on the other side of the drag handle. */
  maxMargin?: number
}

/**
 * Drag-to-resize for a panel anchored to the window's right or bottom edge
 * (Inspector, Threats detail, docked drawer). Measures directly off the
 * viewport edge rather than a container ref — every panel using this is
 * flush against the window edge, so no ref plumbing is needed. Max size is
 * computed from the current window size minus maxMargin, not a fixed
 * constant, so it grows with the window instead of hitting an arbitrary cap.
 */
export function useResizablePanel({ axis, initial, min = 200, maxMargin = 240 }: UseResizablePanelOptions) {
  const [size, setSize] = useState(initial)

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      function onMove(ev: MouseEvent) {
        const viewportSize = axis === 'x' ? window.innerWidth : window.innerHeight
        const raw = axis === 'x' ? window.innerWidth - ev.clientX : window.innerHeight - ev.clientY
        const max = Math.max(min, viewportSize - maxMargin)
        setSize(Math.min(max, Math.max(min, raw)))
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [axis, min, maxMargin]
  )

  return { size, setSize, startDrag }
}
