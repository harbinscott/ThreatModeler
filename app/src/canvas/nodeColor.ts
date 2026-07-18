import type { CSSProperties } from 'react'
import { autoContrastText } from './color'
import type { NodeColors } from '../types/project'

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
