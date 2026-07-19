import { IconSitemap } from '@tabler/icons-react'
import { useThreatOverlay } from './ThreatOverlayContext'
import { tierColor } from './ThreatBadge'
import './SubDiagramBadge.css'

/** Marks a Process node that owns a sub-diagram (Release 8, DFD leveling) —
 *  top-left corner, the one spot ThreatBadge (top-right) and ComplianceBadge
 *  (bottom-left) leave free. Neutral gray with no open threats inside the
 *  sub-diagram, reusing ThreatBadge's tiering colors once there are some, so
 *  "should I look inside" is visible without drilling in. Clicking it
 *  navigates straight into the sub-diagram, same action as the Inspector's
 *  "Open sub-diagram" button. */
export function SubDiagramBadge({ targetId }: { targetId: string }) {
  const { hasSubDiagram, subDiagramOpenThreatCount, onOpenSubDiagram } = useThreatOverlay(targetId)
  if (!hasSubDiagram) return null

  return (
    <button
      type="button"
      className="subdiagram-badge nodrag nopan"
      style={subDiagramOpenThreatCount > 0 ? { background: tierColor(subDiagramOpenThreatCount) } : undefined}
      title={`Contains a sub-diagram${
        subDiagramOpenThreatCount > 0 ? ` — ${subDiagramOpenThreatCount} open threat${subDiagramOpenThreatCount === 1 ? '' : 's'} inside` : ''
      }. Click to open.`}
      onClick={() => onOpenSubDiagram(targetId)}
    >
      <IconSitemap size={11} aria-hidden="true" />
    </button>
  )
}
