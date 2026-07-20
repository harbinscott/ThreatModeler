import { IconCrownFilled } from '@tabler/icons-react'
import { useThreatOverlay } from './ThreatOverlayContext'
import './CrownJewelBadge.css'

/** Marks a Process or Data Store node flagged as a crown-jewel asset
 *  (Release 12) — bottom-right corner, the one spot ThreatBadge (top-right),
 *  ComplianceBadge (bottom-left), and SubDiagramBadge (top-left) leave free.
 *  Static, no popover — same "a hover tooltip is enough" call ComplianceBadge
 *  made, gated by the same kind of Overlay Menu toggle. */
export function CrownJewelBadge({ targetId }: { targetId: string }) {
  const { isCrownJewel } = useThreatOverlay(targetId)
  if (!isCrownJewel) return null

  return (
    <div
      className="crown-jewel-badge nodrag nopan"
      title="Crown jewel asset — business-critical, feeds elevated DREAD impact on every threat touching it"
    >
      <IconCrownFilled size={10} aria-hidden="true" />
    </div>
  )
}
