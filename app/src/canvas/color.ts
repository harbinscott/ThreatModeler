export function hexLuminance(hex: string): number {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function autoContrastText(hex: string): string {
  return hexLuminance(hex) > 0.55 ? '#0b1220' : '#f8fafc'
}

export const PRESET_COLORS = [
  '#2563eb',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#fb7185',
  '#f59e0b',
  '#facc15',
  '#4ade80',
  '#94a3b8',
  '#ffffff',
  '#1e293b',
  '#0b1220',
]

const RECENT_KEY = 'tm-recent-colors'
const MAX_RECENT = 5

export function getRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function addRecentColor(hex: string): string[] {
  const existing = getRecentColors().filter((c) => c.toLowerCase() !== hex.toLowerCase())
  const next = [hex, ...existing].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore storage failures
  }
  return next
}
