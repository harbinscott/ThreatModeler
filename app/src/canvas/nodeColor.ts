import type { CSSProperties } from 'react'
import { autoContrastText } from './color'
import type { NodeColors } from '../types/project'

/** Layers a colored outline ring on top of a node's own style — used by the
 *  DREAD risk-coloring overlay. Doesn't touch the node's own fill/border/text
 *  (those are the user's explicit choice via the color picker), just adds a
 *  ring around it so risk coloring and custom colors can coexist. */
export function withRiskRing(style: CSSProperties | undefined, riskColor: string | undefined): CSSProperties | undefined {
  if (!riskColor) return style
  return { ...style, boxShadow: `0 0 0 3px ${riskColor}` }
}

export function resolveNodeStyle(colors?: NodeColors): CSSProperties | undefined {
  if (!colors || (!colors.fill && !colors.border && !colors.text)) return undefined

  const style: CSSProperties = {}
  const border = colors.border ?? colors.fill

  if (border) style.borderColor = border

  if (colors.fill) {
    style.background = colors.fill
    style.color = colors.text ?? autoContrastText(colors.fill)
  } else if (colors.text) {
    style.color = colors.text
  } else if (border) {
    style.color = border
  }

  return style
}
