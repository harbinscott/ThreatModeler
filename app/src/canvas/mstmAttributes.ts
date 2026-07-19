import type { AttributeValue, DataFlowProtocol, ElementType } from '../types/project'

export type AttributeFieldType = 'text' | 'boolean' | 'select'

export interface AttributeFieldDef {
  key: string
  label: string
  type: AttributeFieldType
  options?: string[]
  /** Only rendered when this returns true for the element's current attribute bag —
   *  drives Microsoft TMT's conditional sub-fields (e.g. device-permission fields
   *  only apply when the selected stencil's `processType` is a mobile/device app).
   *  `processType`/`storeType`/`interactorType` themselves are no longer rendered
   *  as their own fields — the top-level stencil picker in the Inspector sets them
   *  as a side effect of `StencilDef.defaults`, so there's one "type" selector
   *  instead of two. */
  when?: (attrs: Record<string, AttributeValue>) => boolean
}

const isMobileDeviceApp = (a: Record<string, AttributeValue>) => a.processType === 'Mobile/Native Device App'

/** Kept as a reference list (not rendered directly) — stencils in `stencils.ts`
 *  set `processType` via their `defaults`. Exported for anything that wants to
 *  validate/label the value later (e.g. reporting). */
export const PROCESS_TYPE_OPTIONS = [
  'Generic Process',
  'Web Server',
  'Web Application',
  'Web Service',
  'Managed Application',
  'Native Application',
  'Thick Client',
  'Browser Client',
  'Mobile/Native Device App',
  'Virtual Machine',
  'Background Service',
]

const usesAI = (a: Record<string, AttributeValue>) => a.usesAI === true

/** Kept as a reference list (not rendered directly) — `aiFunction`'s own
 *  field def in `processSecurityFields()` references this. */
export const AI_FUNCTION_OPTIONS = [
  'LLM / Generative AI',
  'ML Classification / Scoring',
  'Recommendation Engine',
  'Computer Vision',
  'Other',
]

export function processSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'codeType', label: 'Code type', type: 'select', options: ['Managed', 'Unmanaged'] },
    {
      key: 'runningAs',
      label: 'Running as',
      type: 'select',
      options: [
        'Kernel',
        'System',
        'Network Service',
        'Local Service',
        'Administrator',
        'Standard User with Elevation',
        'Standard User without Elevation',
      ],
    },
    {
      key: 'isolationLevel',
      label: 'Isolation level',
      type: 'select',
      options: ['AppContainer', 'Low Integrity Level', 'Sandbox'],
    },
    {
      key: 'acceptsInputFrom',
      label: 'Accepts input from',
      type: 'select',
      options: [
        'Any Remote User or Entity',
        'Kernel, System or Local Admin',
        'Local or Network Service',
        'Local Standard User with Elevation',
        'Local Standard User without Elevation',
        'Nothing',
        'Other',
      ],
    },
    { key: 'implementsAuthentication', label: 'Implements/uses authentication', type: 'boolean' },
    { key: 'implementsAuthorization', label: 'Implements/uses authorization', type: 'boolean' },
    { key: 'implementsProtocol', label: 'Implements a communication protocol', type: 'boolean' },
    { key: 'sanitizesInput', label: 'Sanitizes input', type: 'boolean' },
    { key: 'sanitizesOutput', label: 'Sanitizes output', type: 'boolean' },
    // Condensed from MS-TMT's 14 separate Windows Store capability checkboxes
    // (GPS/Contacts/Calendar/SMS/Mic/Webcam/Music/Pictures/Videos/Proximity/
    // Removable Storage/Shared Certs/Enterprise/Documents) into 4 vendor-neutral
    // groups — "does this app touch sensitive device data" matters the same way
    // for an iOS/Android app as a UWP one, and 14 always-visible checkboxes for
    // one narrow processType wasn't earning its keep.
    { key: 'deviceLocationContacts', label: 'Location, contacts & calendar', type: 'boolean', when: isMobileDeviceApp },
    { key: 'deviceCamera', label: 'Camera / microphone', type: 'boolean', when: isMobileDeviceApp },
    { key: 'deviceMessaging', label: 'SMS / messaging data', type: 'boolean', when: isMobileDeviceApp },
    { key: 'deviceCredentials', label: 'Cached credentials / enterprise data', type: 'boolean', when: isMobileDeviceApp },
    // AI/ML risk surface (Release 10) — a declared risk surface distinct
    // from every other process field above: an AI/ML component carries
    // prompt-injection/adversarial-input risk (Tampering) and
    // training/inference data-leakage risk (Information Disclosure) that
    // no existing MS-TMT field captures. See ruleEngine.ts/dreadEngine.ts
    // for how this feeds STRIDE descriptions and DREAD scoring.
    { key: 'usesAI', label: 'Uses AI/ML processing', type: 'boolean' },
    { key: 'aiFunction', label: 'AI function', type: 'select', options: AI_FUNCTION_OPTIONS, when: usesAI },
  ]
}

const isFileSystemStore = (a: Record<string, AttributeValue>) => a.storeType === 'File System'
const isCookieStore = (a: Record<string, AttributeValue>) => a.storeType === 'Cookie'
const isDeviceStore = (a: Record<string, AttributeValue>) => a.storeType === 'Device'

export const STORE_TYPE_OPTIONS = [
  'SQL Relational Database',
  'Non-Relational Database',
  'File System',
  'Registry',
  'Configuration',
  'Cache',
  'HTML5 Storage',
  'Cookie',
  'Device',
  'Cloud Storage',
]

export function dataStoreSecurityFields(): AttributeFieldDef[] {
  return [
    // Promoted from a catalog-only field (previously only shown for the
    // Database/File Storage presets) to a shared field — every data store
    // type feeds `ruleEngine.ts`'s Information Disclosure severity escalation
    // off this value, so it needs to be settable regardless of stencil.
    {
      key: 'dataClassification',
      label: 'Data classification',
      type: 'select',
      options: ['Public', 'Internal', 'Confidential', 'Restricted'],
    },
    { key: 'storesCredentials', label: 'Stores credentials', type: 'boolean' },
    { key: 'storesLogData', label: 'Stores log data', type: 'boolean' },
    { key: 'encryptedAtRest', label: 'Encrypted at rest', type: 'boolean' },
    { key: 'encryptedInTransit', label: 'Encrypted in transit', type: 'boolean' },
    { key: 'signed', label: 'Signed', type: 'boolean' },
    { key: 'writeAccess', label: 'Write access', type: 'boolean' },
    { key: 'removableStorage', label: 'Removable storage', type: 'boolean' },
    { key: 'backup', label: 'Backup', type: 'boolean' },
    { key: 'shared', label: 'Shared', type: 'boolean' },
    {
      key: 'fileSystemType',
      label: 'File system type',
      type: 'select',
      options: ['NTFS', 'ExFAT', 'FAT', 'ReFS', 'IFS', 'UDF', 'Other'],
      when: isFileSystemStore,
    },
    { key: 'httpOnlyCookie', label: 'HTTP only', type: 'boolean', when: isCookieStore },
    // Condensed from MS-TMT's 9 separate device-store checkboxes into 4.
    { key: 'deviceLocationContacts', label: 'Location, contacts & calendar', type: 'boolean', when: isDeviceStore },
    { key: 'deviceMessaging', label: 'SMS / messaging data', type: 'boolean', when: isDeviceStore },
    { key: 'deviceCredentials', label: 'Cached credentials', type: 'boolean', when: isDeviceStore },
    { key: 'deviceOtherSensitive', label: 'Other sensitive data (enterprise, SIM, misc)', type: 'boolean', when: isDeviceStore },
  ]
}

/** Kept as a reference list (not rendered directly) — stencils in `stencils.ts`
 *  set `interactorType` via their `defaults`. */
export const INTERACTOR_TYPE_OPTIONS = [
  'Human User',
  'Browser',
  'External Web Application',
  'External Web Service',
  'Authorization Provider',
  'Megaservice',
  'Managed Runtime',
]

export function externalInteractorSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'authenticated', label: 'Authenticates itself', type: 'boolean' },
    { key: 'type', label: 'Type', type: 'select', options: ['Not Selected', 'Code', 'Human'] },
    { key: 'vendorManaged', label: 'Third-party / vendor-managed', type: 'boolean' },
    // AI/ML risk surface (Release 10) — marks *this* external entity as a
    // third-party AI/LLM provider (e.g. an "OpenAI API" node), the sharpest
    // real-world version of the AI risk surface: data leaving the trust
    // boundary in a prompt to an external model. A data flow terminating
    // at an entity with this set gets an Information Disclosure bump — see
    // dreadEngine.ts's `aiContributions()`.
    { key: 'usesThirdPartyAIProvider', label: 'Is a third-party AI/LLM provider', type: 'boolean' },
  ]
}

export const DATA_FLOW_PROTOCOL_OPTIONS: DataFlowProtocol[] = [
  'HTTP',
  'HTTPS',
  'IPsec',
  'RPC/DCOM',
  'Named Pipe',
  'SMB',
  'ALPC',
  'Binary',
  'UDP',
  'IOCTL',
]

/** protocol -> shared-field defaults, mirroring the MS-TMT Data Flow stencils'
 *  property overrides. Applied the same way stencil selection applies
 *  `StencilDef.defaults` — only into currently-empty fields, never clobbering
 *  a value the user already set. Protocols not listed (RPC/DCOM, Named Pipe,
 *  SMB, ALPC, Binary, UDP, IOCTL) have no MS-TMT default overrides either —
 *  left for the user to set explicitly. */
export const DATA_FLOW_PROTOCOL_DEFAULTS: Partial<Record<DataFlowProtocol, Record<string, AttributeValue>>> = {
  HTTP: { sourceAuthenticated: false, destinationAuthenticated: false, providesConfidentiality: false, providesIntegrity: false },
  HTTPS: { destinationAuthenticated: true, providesConfidentiality: true, providesIntegrity: true },
  IPsec: { sourceAuthenticated: true, destinationAuthenticated: true, providesConfidentiality: true, providesIntegrity: true },
}

export function dataFlowSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'protocol', label: 'Protocol', type: 'select', options: DATA_FLOW_PROTOCOL_OPTIONS },
    { key: 'physicalNetwork', label: 'Physical network', type: 'select', options: ['Wire', 'Wifi', 'Bluetooth', '2G-4G'] },
    { key: 'sourceAuthenticated', label: 'Source authenticated', type: 'boolean' },
    { key: 'destinationAuthenticated', label: 'Destination authenticated', type: 'boolean' },
    { key: 'providesConfidentiality', label: 'Provides confidentiality', type: 'boolean' },
    { key: 'providesIntegrity', label: 'Provides integrity', type: 'boolean' },
    // Condensed from 5 mostly-mutually-exclusive payload booleans (XML/SOAP/
    // REST/RSS/JSON) into one select — a flow's payload is practically always
    // one of these, not several at once.
    {
      key: 'payloadFormat',
      label: 'Payload format',
      type: 'select',
      options: ['JSON', 'XML', 'SOAP', 'REST', 'RSS', 'Binary', 'Other'],
    },
    { key: 'containsCookies', label: 'Contains cookies', type: 'boolean' },
  ]
}

/** Kept as a reference list (not rendered directly) — stencils in `stencils.ts`
 *  set `mitigationType` via their `defaults`, same pattern as `processType`. */
export const MITIGATION_TYPE_OPTIONS = ['Generic Mitigation Control', 'Firewall', 'WAF', 'IDS/IPS', 'API Gateway']

/** A mitigation's declared properties are read by `ruleEngine.ts`/`dreadEngine.ts`
 *  for any data flow whose *source* is this node — see `mitigationContributions()`
 *  in `dreadEngine.ts` for why only the downstream edge benefits, not the
 *  protected node itself. `rulesUpToDate === false` explicitly suppresses the
 *  `blocksUnauthorizedTraffic`/`inspectsPayload` benefit elsewhere — a control
 *  with a stale ruleset shouldn't get credit for filtering it may no longer do
 *  reliably. Deliberately no "terminates TLS" field: TLS termination splits
 *  trust rather than reducing risk, so it wouldn't have a clean, defensible
 *  scoring direction. `rateLimitingEnabled` (Release 10, added for API
 *  Gateway) is the first mitigation attribute with a clean, statable reason
 *  to reduce Denial-of-Service risk specifically — see
 *  `mitigationContributions()` in `dreadEngine.ts`, which until now only
 *  ever touched Tampering. */
export function mitigationSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'blocksUnauthorizedTraffic', label: 'Blocks unauthorized traffic', type: 'boolean' },
    { key: 'inspectsPayload', label: 'Inspects payload / content', type: 'boolean' },
    { key: 'logsTraffic', label: 'Logs traffic', type: 'boolean' },
    { key: 'rulesUpToDate', label: 'Rules / signatures up to date', type: 'boolean' },
    { key: 'rateLimitingEnabled', label: 'Rate limiting enabled', type: 'boolean' },
  ]
}

export function securityFieldsFor(elementType: ElementType): AttributeFieldDef[] {
  switch (elementType) {
    case 'process':
      return processSecurityFields()
    case 'data-store':
      return dataStoreSecurityFields()
    case 'external-entity':
      return externalInteractorSecurityFields()
    case 'mitigation':
      return mitigationSecurityFields()
    default:
      return []
  }
}
