import type { DiagramNode } from '../types/project'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Shared between `ruleEngine.ts` (boundary-crossing threat detection) and
 *  the Table tab's zone display — one source of truth for "what rectangle
 *  does this node currently occupy" so the two don't drift apart on how
 *  width/height gets resolved (measured post-render size, falling back to
 *  an explicit style size, falling back to a sane default for a node that
 *  hasn't been measured yet). */
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

/** Every boundary whose rectangle contains `node`'s center point — a node
 *  nested inside two overlapping boundaries returns both, ordered as given
 *  in `boundaries`. Used where "did this cross any boundary" matters more
 *  than which specific one (e.g. STRIDE boundary-crossing detection). */
export function containingBoundaries(node: DiagramNode, boundaries: DiagramNode[]): DiagramNode[] {
  const rect = nodeRect(node, { width: 150, height: 50 })
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  return boundaries.filter((b) => {
    const br = nodeRect(b, { width: 320, height: 220 })
    return cx >= br.x && cx <= br.x + br.width && cy >= br.y && cy <= br.y + br.height
  })
}

/** The single most specific (smallest-area) boundary containing `node`, or
 *  undefined if it isn't inside any — what a "which zone is this element in"
 *  display wants when boundaries are nested. */
export function innermostBoundary(node: DiagramNode, boundaries: DiagramNode[]): DiagramNode | undefined {
  const matches = containingBoundaries(node, boundaries)
  if (matches.length === 0) return undefined
  return matches.reduce((smallest, b) => {
    const sr = nodeRect(smallest, { width: 320, height: 220 })
    const br = nodeRect(b, { width: 320, height: 220 })
    return br.width * br.height < sr.width * sr.height ? b : smallest
  })
}
