import type { Diagram, DiagramNode, StrideCategory, Threat } from '../types/project'

const CATEGORY_NAMES: Record<StrideCategory, string> = {
  S: 'Spoofing',
  T: 'Tampering',
  R: 'Repudiation',
  I: 'Information Disclosure',
  D: 'Denial of Service',
  E: 'Elevation of Privilege',
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function nodeRect(node: DiagramNode, fallback: { width: number; height: number }): Rect {
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? styleWidth ?? fallback.width,
    height: node.measured?.height ?? styleHeight ?? fallback.height,
  }
}

function containingBoundaries(node: DiagramNode, boundaries: DiagramNode[]): string[] {
  const rect = nodeRect(node, { width: 150, height: 50 })
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return boundaries
    .filter((b) => {
      const br = nodeRect(b, { width: 320, height: 220 })
      return cx >= br.x && cx <= br.x + br.width && cy >= br.y && cy <= br.y + br.height
    })
    .map((b) => b.id)
}

function makeThreat(
  ruleId: string,
  targetType: 'node' | 'edge',
  targetId: string,
  targetLabel: string,
  category: StrideCategory,
  title: string,
  description: string,
  componentType?: string
): Threat {
  return {
    id: crypto.randomUUID(),
    ruleId,
    targetType,
    targetId,
    targetLabel,
    componentType,
    category,
    title,
    description,
    status: 'open',
    source: 'auto',
    createdAt: new Date().toISOString(),
  }
}

function processDescription(cat: StrideCategory, label: string): string {
  switch (cat) {
    case 'S':
      return `Could an attacker impersonate ${label} or a legitimate caller of it?`
    case 'T':
      return `Could an attacker modify data or logic handled by ${label}?`
    case 'R':
      return `Can actions performed by ${label} be denied due to insufficient logging?`
    case 'I':
      return `Could ${label} leak sensitive data through errors, logs, or responses?`
    case 'D':
      return `Could ${label} be overwhelmed or crashed, denying service to legitimate users?`
    case 'E':
      return `Could an attacker gain higher privileges than intended through ${label}?`
  }
}

function entityDescription(cat: StrideCategory, label: string): string {
  switch (cat) {
    case 'S':
      return `Could an attacker impersonate ${label} when interacting with the system?`
    case 'R':
      return `Can ${label} deny having performed an action if there is no verifiable record?`
    default:
      return ''
  }
}

function dataStoreDescription(cat: StrideCategory, label: string): string {
  switch (cat) {
    case 'T':
      return `Could data in ${label} be modified without authorization or detection?`
    case 'I':
      return `Could data in ${label} be read by an unauthorized party?`
    case 'D':
      return `Could ${label} be made unavailable, denying access to the data it holds?`
    default:
      return ''
  }
}

function flowDescription(cat: StrideCategory, label: string): string {
  switch (cat) {
    case 'T':
      return `Could data on "${label}" be altered in transit?`
    case 'I':
      return `Could data on "${label}" be intercepted or disclosed in transit?`
    case 'D':
      return `Could "${label}" be disrupted, denying the data it carries?`
    default:
      return ''
  }
}

export function generateThreats(diagram: Diagram): Threat[] {
  const threats: Threat[] = []
  const boundaries = diagram.nodes.filter((n) => n.data.elementType === 'trust-boundary')

  for (const node of diagram.nodes) {
    const label = node.data.label

    if (node.data.elementType === 'process') {
      const attrs = node.data.attributes ?? {}
      const highPrivRunningAs = ['Kernel', 'System', 'Administrator'].includes(attrs.runningAs as string)
      ;(['S', 'T', 'R', 'I', 'D', 'E'] as StrideCategory[]).forEach((cat) => {
        let desc = processDescription(cat, label)
        if (cat === 'S' && attrs.implementsAuthentication === false) {
          desc += ' No authentication mechanism is declared for this process — treat as high priority.'
        }
        if (cat === 'E' && attrs.implementsAuthorization === false) {
          desc += ' No authorization mechanism is declared — a successful compromise may grant unchecked access.'
        }
        if (cat === 'E' && highPrivRunningAs) {
          desc += ` This process runs as ${attrs.runningAs} — a compromise yields elevated privileges immediately.`
        }
        if (cat === 'T' && attrs.sanitizesInput === false) {
          desc += ' Input is not sanitized — check for injection vulnerabilities.'
        }
        if (cat === 'I' && attrs.sanitizesOutput === false) {
          desc += ' Output is not sanitized, increasing the chance of leaking sensitive data.'
        }
        threats.push(
          makeThreat(`process-${cat}`, 'node', node.id, label, cat, `${CATEGORY_NAMES[cat]} of ${label}`, desc, node.data.componentType)
        )
      })
    } else if (node.data.elementType === 'external-entity') {
      const attrs = node.data.attributes ?? {}
      ;(['S', 'R'] as StrideCategory[]).forEach((cat) => {
        let desc = entityDescription(cat, label)
        if (cat === 'S' && attrs.authenticated === false) {
          desc += ' This interactor does not authenticate itself — spoofing risk is elevated.'
        }
        threats.push(
          makeThreat(`entity-${cat}`, 'node', node.id, label, cat, `${CATEGORY_NAMES[cat]} of ${label}`, desc, node.data.componentType)
        )
      })
    } else if (node.data.elementType === 'data-store') {
      const attrs = node.data.attributes ?? {}
      const sensitive =
        attrs.dataClassification === 'Confidential' || attrs.dataClassification === 'Restricted' || attrs.storesCredentials === true
      const encryptedAtRest = attrs.encryptedAtRest === true
      ;(['T', 'I', 'D'] as StrideCategory[]).forEach((cat) => {
        let desc = dataStoreDescription(cat, label)
        if (cat === 'I' && sensitive && !encryptedAtRest) {
          const reason = attrs.storesCredentials ? 'stores credentials' : `is classified as ${attrs.dataClassification}`
          desc += ` This store ${reason} and does not have "Encrypted" confirmed — treat as high priority.`
        }
        if (cat === 'T' && attrs.signed === false) {
          desc += ' Data is not signed — unauthorized modification may go undetected.'
        }
        if (cat === 'D' && attrs.backup === false) {
          desc += ' No backup is configured — an availability incident could cause permanent data loss.'
        }
        threats.push(
          makeThreat(`datastore-${cat}`, 'node', node.id, label, cat, `${CATEGORY_NAMES[cat]} of ${label}`, desc, node.data.componentType)
        )
      })
    }
  }

  for (const edge of diagram.edges) {
    const source = diagram.nodes.find((n) => n.id === edge.source)
    const target = diagram.nodes.find((n) => n.id === edge.target)
    if (!source || !target) continue

    const label = edge.data?.label || `${source.data.label} to ${target.data.label}`
    const sourceBoundaries = containingBoundaries(source, boundaries)
    const targetBoundaries = containingBoundaries(target, boundaries)
    const crossesBoundary =
      sourceBoundaries.length !== targetBoundaries.length ||
      sourceBoundaries.some((b) => !targetBoundaries.includes(b))

    const edgeAttrs = edge.data?.attributes ?? {}
    const wireless = ['Wifi', 'Bluetooth', '2G-4G'].includes(edgeAttrs.physicalNetwork as string)

    ;(['T', 'I', 'D'] as StrideCategory[]).forEach((cat) => {
      let desc = flowDescription(cat, label)
      if (crossesBoundary) {
        desc +=
          ' This data flow crosses a trust boundary — verify it is encrypted in transit and that both sides authenticate each other.'
      }
      if (cat === 'T' && (edgeAttrs.sourceAuthenticated === false || edgeAttrs.destinationAuthenticated === false)) {
        desc += ' The communicating parties are not mutually authenticated.'
      }
      if (cat === 'T' && edgeAttrs.providesIntegrity === false) {
        desc += ' This flow does not provide integrity protection.'
      }
      if (cat === 'I' && edgeAttrs.providesConfidentiality === false) {
        desc += ' This flow does not provide confidentiality — data may be readable in transit.'
      }
      if (wireless) {
        desc += ` Transport is over ${edgeAttrs.physicalNetwork}, which raises interception risk.`
      }
      threats.push(
        makeThreat(
          crossesBoundary ? `flow-${cat}-boundary` : `flow-${cat}`,
          'edge',
          edge.id,
          label,
          cat,
          `${CATEGORY_NAMES[cat]} of "${label}"${crossesBoundary ? ' (crosses trust boundary)' : ''}`,
          desc
        )
      )
    })
  }

  return threats
}

/** Merge freshly generated threats into an existing list without duplicating
 *  or clobbering user edits: an existing auto threat for the same target+rule
 *  is kept as-is (preserves status/edits); only genuinely new ones are added.
 *  Manual threats and threats whose target no longer exists in the diagram
 *  are left untouched / pruned respectively by the caller. */
export function mergeThreats(existing: Threat[], generated: Threat[]): Threat[] {
  const existingAutoKeys = new Set(
    existing.filter((t) => t.source === 'auto').map((t) => `${t.targetId}:${t.ruleId}`)
  )
  const stillValidTargetIds = new Set(generated.map((t) => t.targetId))

  const kept = existing.filter((t) => t.source === 'manual' || stillValidTargetIds.has(t.targetId))
  const additions = generated.filter((t) => !existingAutoKeys.has(`${t.targetId}:${t.ruleId}`))

  return [...kept, ...additions]
}
