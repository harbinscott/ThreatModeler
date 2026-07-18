import type { DiagramNode } from '../types/project'

/** Maps node id -> a display label, appending a small " (n)" signifier only
 *  when two or more nodes in the given list share the exact same label —
 *  disambiguates the Table tab's list/flow views without ever touching the
 *  actual stored `data.label` (renaming would defeat the point: two
 *  same-named elements in different trust boundaries can be legitimately
 *  distinct, e.g. two "Web Server" instances). Numbering follows array
 *  order, which is stable across renders since it mirrors node-creation
 *  order. */
export function disambiguateLabels(nodes: DiagramNode[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const n of nodes) counts.set(n.data.label, (counts.get(n.data.label) ?? 0) + 1)

  const seen = new Map<string, number>()
  const result = new Map<string, string>()
  for (const n of nodes) {
    const label = n.data.label
    if ((counts.get(label) ?? 0) <= 1) {
      result.set(n.id, label)
      continue
    }
    const next = (seen.get(label) ?? 0) + 1
    seen.set(label, next)
    result.set(n.id, `${label} (${next})`)
  }
  return result
}
