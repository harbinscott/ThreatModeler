import type { Diagram, Threat } from '../types/project'

export interface DiagramMessage {
  severity: 'warning' | 'info'
  text: string
}

/** Modeling-quality diagnostics for the "Messages" dialog — mirrors what MS
 *  Threat Modeling Tool's View > Messages pane flags: structural issues with
 *  the diagram itself, not threats. Kept intentionally simple (a handful of
 *  checks) rather than an extensible rule-plugin system — see backlog for
 *  "custom rules" as a separate, larger future feature. */
export function getDiagramMessages(diagram: Diagram, threats: Threat[]): DiagramMessage[] {
  const messages: DiagramMessage[] = []

  if (diagram.nodes.length === 0) {
    messages.push({ severity: 'info', text: 'The diagram is empty — add elements on the Diagram tab to begin modeling.' })
    return messages
  }

  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')
  const nonBoundaryNodes = diagram.nodes.filter((n) => n.data.elementType !== 'trust-boundary')

  const connectedIds = new Set<string>()
  for (const e of diagram.edges) {
    connectedIds.add(e.source)
    connectedIds.add(e.target)
  }
  for (const n of nonBoundaryNodes) {
    if (!connectedIds.has(n.id)) {
      messages.push({ severity: 'warning', text: `"${n.data.label}" has no data flows connected to it.` })
    }
  }

  for (const edge of diagram.edges) {
    const source = diagram.nodes.find((n) => n.id === edge.source)
    const target = diagram.nodes.find((n) => n.id === edge.target)
    if (!source || !target) continue
    const label = edge.data?.label || `${source.data.label} to ${target.data.label}`
    const touchesProcessOrMitigation = (t: string) => t === 'process' || t === 'mitigation'
    if (!touchesProcessOrMitigation(source.data.elementType) && !touchesProcessOrMitigation(target.data.elementType)) {
      messages.push({
        severity: 'info',
        text: `Flow "${label}" doesn't touch a Process — data usually shouldn't move directly between two data stores or external entities.`,
      })
    }
  }

  function boundaryContains(node: (typeof diagram.nodes)[number], boundary: (typeof diagram.nodes)[number]) {
    const bw = typeof boundary.style?.width === 'number' ? boundary.style.width : 320
    const bh = typeof boundary.style?.height === 'number' ? boundary.style.height : 220
    const nw = node.measured?.width ?? 150
    const nh = node.measured?.height ?? 50
    const cx = node.position.x + nw / 2
    const cy = node.position.y + nh / 2
    return cx >= boundary.position.x && cx <= boundary.position.x + bw && cy >= boundary.position.y && cy <= boundary.position.y + bh
  }

  for (const boundary of boundaries) {
    const hasContents = nonBoundaryNodes.some((n) => boundaryContains(n, boundary))
    if (!hasContents) {
      messages.push({ severity: 'warning', text: `Trust boundary "${boundary.data.label}" doesn't contain any elements.` })
    }
  }

  if (threats.length === 0) {
    messages.push({ severity: 'info', text: 'No threats generated yet — click "Regenerate Threats" on the Threats tab.' })
  }

  return messages
}
