import { useThreatOverlay } from './ThreatOverlayContext'
import { COMPLIANCE_TAG_COLOR, COMPLIANCE_TAG_LABELS } from './complianceTags'
import './ComplianceBadge.css'

/** Effective (direct + propagated) compliance tags for this node, rendered
 *  as small colored chips — bottom-left corner, deliberately opposite
 *  ThreatBadge's top-right so the two overlays never overlap when both are
 *  on. Static, no popover (unlike ThreatBadge) — a hover tooltip is enough
 *  detail for "which regulatory scope is this in", the full name is in the
 *  `title` attribute. */
export function ComplianceBadge({ targetId }: { targetId: string }) {
  const { complianceTags, pciScope } = useThreatOverlay(targetId)
  if (!complianceTags || complianceTags.size === 0) return null

  return (
    <div className="compliance-badge-wrap nodrag nopan">
      {[...complianceTags].map((tag) => (
        <span
          key={tag}
          className="compliance-badge"
          style={{ background: COMPLIANCE_TAG_COLOR[tag] }}
          title={tag === 'PCI' && pciScope ? `${COMPLIANCE_TAG_LABELS[tag]} — ${pciScope}` : COMPLIANCE_TAG_LABELS[tag]}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
