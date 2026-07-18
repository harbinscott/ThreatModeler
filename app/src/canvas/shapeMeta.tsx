import type { ReactNode } from 'react'
import { IconCircle, IconUserSquareRounded, IconDatabase, IconShield, IconShieldCheck } from '@tabler/icons-react'
import type { ElementType } from '../types/project'

/** Shared between the ribbon toolbar (Canvas.tsx) and the Table tab's
 *  Elements toolbar (ElementsTable.tsx) so both entry points for adding an
 *  element show the same label/icon and stay in sync if either changes. */
export const SHAPE_LABELS: Record<ElementType, string> = {
  process: 'Process',
  'external-entity': 'External Entity',
  'data-store': 'Data Store',
  'trust-boundary': 'Trust Boundary',
  mitigation: 'Mitigation',
}

export const SHAPE_ICONS: Record<ElementType, ReactNode> = {
  process: <IconCircle size={15} color="#2563eb" aria-hidden="true" />,
  'external-entity': <IconUserSquareRounded size={15} color="#2563eb" aria-hidden="true" />,
  'data-store': <IconDatabase size={15} color="#2563eb" aria-hidden="true" />,
  'trust-boundary': <IconShield size={15} color="#f59e0b" aria-hidden="true" />,
  mitigation: <IconShieldCheck size={15} color="#10b981" aria-hidden="true" />,
}
