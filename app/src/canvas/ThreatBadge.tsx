import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useThreatOverlay } from './ThreatOverlayContext'
import './ThreatBadge.css'

const CATEGORY_COLOR: Record<string, string> = {
  S: '#f472b6',
  T: '#f59e0b',
  R: '#a78bfa',
  I: '#38bdf8',
  D: '#fb7185',
  E: '#4ade80',
}

/** Open-threat count on this node/edge -> badge color. Simple tiering
 *  independent of DREAD (which may not be enabled on this project), so the
 *  overlay always has something meaningful to show. Exported for
 *  SubDiagramBadge, which reuses the same tiering for a sub-diagram's open
 *  threat count. */
export function tierColor(count: number): string {
  if (count >= 6) return '#ef4444'
  if (count >= 3) return '#fb7185'
  return '#f59e0b'
}

const POPOVER_WIDTH = 240

/** Small hoverable/clickable badge showing open-threat count for a node or
 *  edge, rendered directly on the diagram. `nodrag nopan` keeps interacting
 *  with it from dragging the node or panning the canvas underneath.
 *
 *  The popover is rendered through a portal into document.body rather than
 *  inline: nodes/edges are each their own stacking context in React Flow, so
 *  a popover nested inside one node's DOM subtree can render underneath a
 *  sibling node instead of on top of it. Position is computed from the
 *  badge's on-screen rect at open time. */
export function ThreatBadge({ targetId }: { targetId: string }) {
  const { threats, onViewThreat } = useThreatOverlay(targetId)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (badgeRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  if (threats.length === 0) return null

  function toggleOpen() {
    if (!open && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - POPOVER_WIDTH) })
    }
    setOpen((o) => !o)
  }

  return (
    <div className="threat-badge-wrap nodrag nopan">
      <button
        ref={badgeRef}
        type="button"
        className="threat-badge"
        style={{ background: tierColor(threats.length) }}
        title={`${threats.length} open threat${threats.length === 1 ? '' : 's'}: ${threats.map((t) => t.category).join(', ')}`}
        onClick={toggleOpen}
      >
        {threats.length}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className="threat-badge__popover"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
          >
            <div className="threat-badge__popover-header">Open threats</div>
            {threats.map((t) => (
              <button
                type="button"
                key={t.id}
                className="threat-badge__popover-row"
                onClick={() => {
                  onViewThreat(t.id)
                  setOpen(false)
                }}
              >
                <span className="threat-badge__popover-cat" style={{ color: CATEGORY_COLOR[t.category] }}>
                  {t.category}
                </span>
                <span className="threat-badge__popover-title">{t.title}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
