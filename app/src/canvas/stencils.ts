import type { AttributeValue, CustomFieldDef, CustomStencil, ElementType } from '../types/project'

export interface StencilDef {
  id: string
  name: string
  elementType: ElementType
  description?: string
  /** Shared-field values pre-filled on selection (only into currently-empty
   *  fields — never clobbers something the user already set). Also carries
   *  the elementType's internal subtype key (`processType`/`storeType`/
   *  `interactorType`) so the conditional `when()` sub-fields in
   *  `mstmAttributes.ts` react to stencil choice without a separate visible
   *  "type" dropdown. */
  defaults?: Record<string, AttributeValue>
  customFields?: CustomFieldDef[]
  hiddenFieldKeys?: string[]
}

/** Condensed from the Microsoft Threat Modeling Tool's SDL TM Knowledge Base
 *  (Core) template — brought over close to as-is, with: dead tech dropped
 *  (ActiveX/BHO — no modern browser supports it), OS-internals-only
 *  stencils dropped (Kernel Thread, Thread, OS Process, ALPC/IOCTL-as-
 *  process-types — not meaningful at DFD/architecture granularity), and the
 *  Windows Store Process capability fields generalized into vendor-neutral
 *  device-permission fields (see `mstmAttributes.ts`) since "will this app
 *  read your GPS/contacts/camera" matters equally for a modern iOS/Android
 *  app, not just a UWP one. The old `componentCatalog.ts` quick-preset
 *  fields (Web Server's Protocol/Port, API's Auth mechanism, etc.) are
 *  folded in here as `customFields` on the matching stencil, replacing the
 *  old dual-selector system (component-type combobox + separate MS-TMT
 *  subtype select) with one picker. */
export const BUILT_IN_STENCILS: StencilDef[] = [
  // --- Process ---
  { id: 'generic-process', name: 'Generic Process', elementType: 'process' },
  {
    id: 'web-server',
    name: 'Web Server',
    elementType: 'process',
    defaults: { processType: 'Web Server', codeType: 'Managed' },
    customFields: [
      { key: 'protocol', label: 'Protocol', type: 'select', options: ['HTTP', 'HTTPS'] },
      { key: 'port', label: 'Port', type: 'text' },
    ],
  },
  {
    id: 'web-application',
    name: 'Web Application',
    elementType: 'process',
    defaults: { processType: 'Web Application', codeType: 'Unmanaged' },
  },
  {
    id: 'api-service',
    name: 'API / Web Service',
    elementType: 'process',
    defaults: { processType: 'Web Service', codeType: 'Unmanaged' },
    customFields: [
      { key: 'authMechanism', label: 'Auth mechanism', type: 'select', options: ['None', 'API Key', 'OAuth2', 'SAML', 'mTLS', 'JWT'] },
      { key: 'rateLimited', label: 'Rate limited', type: 'boolean' },
      { key: 'dataProcessed', label: 'Data processed', type: 'text' },
    ],
  },
  {
    id: 'managed-application',
    name: 'Managed Application',
    elementType: 'process',
    defaults: { processType: 'Managed Application', codeType: 'Managed' },
  },
  {
    id: 'native-application',
    name: 'Native Application',
    elementType: 'process',
    defaults: { processType: 'Native Application', codeType: 'Unmanaged' },
  },
  { id: 'thick-client', name: 'Thick Client', elementType: 'process', defaults: { processType: 'Thick Client', codeType: 'Unmanaged' } },
  { id: 'browser-client', name: 'Browser Client', elementType: 'process', defaults: { processType: 'Browser Client', codeType: 'Unmanaged' } },
  {
    id: 'message-queue',
    name: 'Message Queue',
    elementType: 'process',
    customFields: [
      { key: 'encryptedInTransit', label: 'Encrypted in transit', type: 'boolean' },
      { key: 'persistsMessages', label: 'Persists messages', type: 'boolean' },
    ],
  },
  {
    id: 'load-balancer',
    name: 'Load Balancer',
    elementType: 'process',
    customFields: [{ key: 'tlsTermination', label: 'TLS termination', type: 'boolean' }],
  },
  {
    id: 'mobile-device-app',
    name: 'Mobile / Native Device App',
    elementType: 'process',
    defaults: { processType: 'Mobile/Native Device App', codeType: 'Managed' },
  },
  { id: 'virtual-machine', name: 'Virtual Machine / Container', elementType: 'process', defaults: { processType: 'Virtual Machine' } },
  { id: 'background-service', name: 'Background Service', elementType: 'process', defaults: { processType: 'Background Service' } },

  // --- Data Store ---
  { id: 'generic-data-store', name: 'Generic Data Store', elementType: 'data-store' },
  { id: 'sql-database', name: 'SQL Database', elementType: 'data-store', defaults: { storeType: 'SQL Relational Database' } },
  { id: 'nosql-database', name: 'NoSQL Database', elementType: 'data-store', defaults: { storeType: 'Non-Relational Database' } },
  {
    id: 'file-storage',
    name: 'File / Object Storage',
    elementType: 'data-store',
    defaults: { storeType: 'File System' },
    customFields: [{ key: 'publiclyAccessible', label: 'Publicly accessible', type: 'boolean' }],
  },
  {
    id: 'cloud-storage',
    name: 'Cloud Storage',
    elementType: 'data-store',
    defaults: { storeType: 'Cloud Storage' },
    customFields: [{ key: 'publiclyAccessible', label: 'Publicly accessible', type: 'boolean' }],
  },
  { id: 'cache', name: 'Cache', elementType: 'data-store', defaults: { storeType: 'Cache' } },
  { id: 'configuration-file', name: 'Configuration File', elementType: 'data-store', defaults: { storeType: 'Configuration' } },
  { id: 'cookie-storage', name: 'Cookie Storage', elementType: 'data-store', defaults: { storeType: 'Cookie' } },
  { id: 'registry', name: 'Registry / Local Config Store', elementType: 'data-store', defaults: { storeType: 'Registry' } },
  { id: 'html5-storage', name: 'Browser Local Storage', elementType: 'data-store', defaults: { storeType: 'HTML5 Storage' } },
  { id: 'device-storage', name: 'Device Local Storage', elementType: 'data-store', defaults: { storeType: 'Device' } },

  // --- External Entity ---
  { id: 'generic-interactor', name: 'Generic External Interactor', elementType: 'external-entity' },
  { id: 'human-user', name: 'Human User', elementType: 'external-entity', defaults: { interactorType: 'Human User', type: 'Human' } },
  { id: 'browser', name: 'Browser', elementType: 'external-entity', defaults: { interactorType: 'Browser', type: 'Code' } },
  {
    id: 'external-web-app',
    name: 'External Web Application',
    elementType: 'external-entity',
    defaults: { interactorType: 'External Web Application', type: 'Code' },
  },
  {
    id: 'external-web-service',
    name: 'External Web Service / Third-Party API',
    elementType: 'external-entity',
    defaults: { interactorType: 'External Web Service', type: 'Code' },
    customFields: [{ key: 'dataShared', label: 'Data shared with them', type: 'text' }],
  },
  {
    id: 'authorization-provider',
    name: 'Authorization Provider',
    elementType: 'external-entity',
    defaults: { interactorType: 'Authorization Provider', type: 'Code' },
  },
  {
    id: 'megaservice',
    name: 'Megaservice / Platform Provider',
    elementType: 'external-entity',
    defaults: { interactorType: 'Megaservice', type: 'Code' },
  },
  {
    id: 'managed-runtime',
    name: 'Managed Runtime',
    elementType: 'external-entity',
    defaults: { interactorType: 'Managed Runtime', type: 'Code' },
  },
]

export interface StencilOption {
  id: string
  name: string
  custom: boolean
}

export function stencilsForType(elementType: ElementType, customStencils: CustomStencil[] = []): StencilOption[] {
  const builtIn = BUILT_IN_STENCILS.filter((s) => s.elementType === elementType).map((s) => ({
    id: s.id,
    name: s.name,
    custom: false,
  }))
  const custom = customStencils
    .filter((s) => s.elementType === elementType)
    .map((s) => ({ id: s.id, name: s.name, custom: true }))
  return [...builtIn, ...custom]
}

export function findStencil(id: string | undefined, customStencils: CustomStencil[] = []): StencilDef | undefined {
  if (!id) return undefined
  return BUILT_IN_STENCILS.find((s) => s.id === id) ?? customStencils.find((s) => s.id === id)
}
