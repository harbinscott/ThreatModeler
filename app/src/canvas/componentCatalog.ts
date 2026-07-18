import type { ElementType } from '../types/project'

export type FieldType = 'text' | 'boolean' | 'select'

export interface CatalogField {
  key: string
  label: string
  type: FieldType
  options?: string[]
}

export interface CatalogEntry {
  id: string
  name: string
  appliesTo: ElementType[]
  fields: CatalogField[]
}

export const COMPONENT_CATALOG: CatalogEntry[] = [
  {
    id: 'web-server',
    name: 'Web Server',
    appliesTo: ['process'],
    fields: [
      { key: 'protocol', label: 'Protocol', type: 'select', options: ['HTTP', 'HTTPS'] },
      { key: 'port', label: 'Port', type: 'text' },
      { key: 'dataProcessed', label: 'Data processed', type: 'text' },
      { key: 'authRequired', label: 'Requires authentication', type: 'boolean' },
    ],
  },
  {
    id: 'api-service',
    name: 'API / Application Service',
    appliesTo: ['process'],
    fields: [
      {
        key: 'authMechanism',
        label: 'Auth mechanism',
        type: 'select',
        options: ['None', 'API Key', 'OAuth2', 'mTLS'],
      },
      { key: 'rateLimited', label: 'Rate limited', type: 'boolean' },
      { key: 'dataProcessed', label: 'Data processed', type: 'text' },
    ],
  },
  {
    id: 'message-queue',
    name: 'Message Queue',
    appliesTo: ['process', 'data-store'],
    fields: [
      { key: 'encryptedInTransit', label: 'Encrypted in transit', type: 'boolean' },
      { key: 'persistsMessages', label: 'Persists messages', type: 'boolean' },
    ],
  },
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    appliesTo: ['process'],
    fields: [{ key: 'tlsTermination', label: 'TLS termination', type: 'boolean' }],
  },
  {
    id: 'database',
    name: 'Database',
    appliesTo: ['data-store'],
    fields: [
      {
        key: 'dataClassification',
        label: 'Data classification',
        type: 'select',
        options: ['Public', 'Internal', 'Confidential', 'Restricted'],
      },
      { key: 'encryptedAtRest', label: 'Encrypted at rest', type: 'boolean' },
      { key: 'encryptedInTransit', label: 'Encrypted in transit', type: 'boolean' },
    ],
  },
  {
    id: 'file-storage',
    name: 'File / Object Storage',
    appliesTo: ['data-store'],
    fields: [
      {
        key: 'dataClassification',
        label: 'Data classification',
        type: 'select',
        options: ['Public', 'Internal', 'Confidential', 'Restricted'],
      },
      { key: 'encryptedAtRest', label: 'Encrypted at rest', type: 'boolean' },
      { key: 'publiclyAccessible', label: 'Publicly accessible', type: 'boolean' },
    ],
  },
  {
    id: 'external-user',
    name: 'External User / Client',
    appliesTo: ['external-entity'],
    fields: [{ key: 'authenticated', label: 'Authenticated', type: 'boolean' }],
  },
  {
    id: 'third-party-service',
    name: 'Third-Party Service',
    appliesTo: ['external-entity'],
    fields: [{ key: 'dataShared', label: 'Data shared with them', type: 'text' }],
  },
]

export function catalogForType(elementType: ElementType): CatalogEntry[] {
  return COMPONENT_CATALOG.filter((entry) => entry.appliesTo.includes(elementType))
}

export function findCatalogEntry(id: string | undefined): CatalogEntry | undefined {
  return COMPONENT_CATALOG.find((entry) => entry.id === id)
}
