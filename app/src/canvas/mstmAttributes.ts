import type { AttributeValue, ElementType } from '../types/project'

export type AttributeFieldType = 'text' | 'boolean' | 'select'

export interface AttributeFieldDef {
  key: string
  label: string
  type: AttributeFieldType
  options?: string[]
  /** Only rendered when this returns true for the element's current attribute bag —
   *  drives Microsoft TMT's conditional sub-fields (e.g. Windows Store capabilities
   *  only apply when Process Type is set to "Windows Store Process"). */
  when?: (attrs: Record<string, AttributeValue>) => boolean
}

const isActiveXProcess = (a: Record<string, AttributeValue>) => a.processType === 'Browser and ActiveX Plugins'
const isWindowsStoreProcess = (a: Record<string, AttributeValue>) => a.processType === 'Windows Store Process'

export const PROCESS_TYPE_OPTIONS = [
  'Generic Process',
  'Managed Application',
  'Thick Client',
  'Browser Client',
  'Browser and ActiveX Plugins',
  'Windows Store Process',
]

/** processType -> Code Type default, mirroring MS-TMT stencil presets. Undefined means don't touch it. */
export const PROCESS_TYPE_CODE_TYPE_DEFAULT: Record<string, 'Managed' | 'Unmanaged' | undefined> = {
  'Managed Application': 'Managed',
  'Windows Store Process': 'Managed',
  'Thick Client': 'Unmanaged',
  'Browser Client': 'Unmanaged',
  'Browser and ActiveX Plugins': 'Unmanaged',
}

export function processSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'processType', label: 'Process type', type: 'select', options: PROCESS_TYPE_OPTIONS },
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
        'Windows Store App',
      ],
    },
    {
      key: 'isolationLevel',
      label: 'Isolation level',
      type: 'select',
      options: ['AppContainer', 'Low Integrity Level', 'MOICE', 'Sandbox'],
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
        'Windows Store Apps or App Container Processes',
        'Nothing',
        'Other',
      ],
    },
    { key: 'implementsAuthentication', label: 'Implements/uses authentication', type: 'boolean' },
    { key: 'implementsAuthorization', label: 'Implements/uses authorization', type: 'boolean' },
    { key: 'implementsProtocol', label: 'Implements a communication protocol', type: 'boolean' },
    { key: 'sanitizesInput', label: 'Sanitizes input', type: 'boolean' },
    { key: 'sanitizesOutput', label: 'Sanitizes output', type: 'boolean' },
    { key: 'activeX', label: 'ActiveX', type: 'boolean', when: isActiveXProcess },
    { key: 'browserPluginObject', label: 'Browser plugin object', type: 'boolean', when: isActiveXProcess },
    { key: 'storeContext', label: 'Context', type: 'select', options: ['Local', 'Web'], when: isWindowsStoreProcess },
    { key: 'documentsLibraryCapability', label: 'Documents Library capability', type: 'boolean', when: isWindowsStoreProcess },
    {
      key: 'enterpriseAuthenticationCapability',
      label: 'Enterprise Authentication capability',
      type: 'boolean',
      when: isWindowsStoreProcess,
    },
    {
      key: 'internetClientServerCapability',
      label: 'Internet (Client & Server) capability',
      type: 'boolean',
      when: isWindowsStoreProcess,
    },
    { key: 'internetClientCapability', label: 'Internet (Client) capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'locationCapability', label: 'Location capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'microphoneCapability', label: 'Microphone capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'musicLibraryCapability', label: 'Music Library capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'picturesLibraryCapability', label: 'Pictures Library capability', type: 'boolean', when: isWindowsStoreProcess },
    {
      key: 'privateNetworksCapability',
      label: 'Private Networks (Client & Server) capability',
      type: 'boolean',
      when: isWindowsStoreProcess,
    },
    { key: 'proximityCapability', label: 'Proximity capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'removableStorageCapability', label: 'Removable Storage capability', type: 'boolean', when: isWindowsStoreProcess },
    {
      key: 'sharedUserCertificatesCapability',
      label: 'Shared User Certificates capability',
      type: 'boolean',
      when: isWindowsStoreProcess,
    },
    { key: 'textMessagingCapability', label: 'Text Messaging capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'videosLibraryCapability', label: 'Videos Library capability', type: 'boolean', when: isWindowsStoreProcess },
    { key: 'webcamCapability', label: 'Webcam capability', type: 'boolean', when: isWindowsStoreProcess },
  ]
}

const isFileSystemStore = (a: Record<string, AttributeValue>) => a.storeType === 'File System'
const isCookieStore = (a: Record<string, AttributeValue>) => a.storeType === 'Cookie'
const isDeviceStore = (a: Record<string, AttributeValue>) => a.storeType === 'Device'

export function dataStoreSecurityFields(): AttributeFieldDef[] {
  return [
    {
      key: 'storeType',
      label: 'Store type',
      type: 'select',
      options: [
        'SQL Relational Database',
        'Non-Relational Database',
        'File System',
        'Registry',
        'Configuration',
        'Cache',
        'HTML5 Storage',
        'Cookie',
        'Device',
      ],
    },
    { key: 'storesCredentials', label: 'Stores credentials', type: 'boolean' },
    { key: 'storesLogData', label: 'Stores log data', type: 'boolean' },
    { key: 'encryptedAtRest', label: 'Encrypted', type: 'boolean' },
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
    { key: 'deviceGps', label: 'GPS', type: 'boolean', when: isDeviceStore },
    { key: 'deviceContacts', label: 'Contacts', type: 'boolean', when: isDeviceStore },
    { key: 'deviceCalendarEvents', label: 'Calendar events', type: 'boolean', when: isDeviceStore },
    { key: 'deviceSmsMessages', label: 'SMS messages', type: 'boolean', when: isDeviceStore },
    { key: 'deviceCachedCredentials', label: 'Cached credentials', type: 'boolean', when: isDeviceStore },
    { key: 'deviceEnterpriseData', label: 'Enterprise data', type: 'boolean', when: isDeviceStore },
    { key: 'deviceMessagingData', label: 'Messaging data', type: 'boolean', when: isDeviceStore },
    { key: 'deviceSimStorage', label: 'SIM storage', type: 'boolean', when: isDeviceStore },
    { key: 'deviceOtherData', label: 'Other data', type: 'boolean', when: isDeviceStore },
  ]
}

export const INTERACTOR_TYPE_OPTIONS = [
  'External Interactor',
  'Browser',
  'External Web Application',
  'External Web Service',
  'Human User',
  'Windows Runtime',
  'Windows .NET Runtime',
  'Windows RT Runtime',
]

/** interactorType -> Type (Code/Human) default, mirroring MS-TMT stencil presets. */
export const INTERACTOR_TYPE_TYPE_DEFAULT: Record<string, 'Code' | 'Human' | undefined> = {
  Browser: 'Code',
  'External Web Application': 'Code',
  'External Web Service': 'Code',
  'Windows Runtime': 'Code',
  'Windows .NET Runtime': 'Code',
  'Windows RT Runtime': 'Code',
  'Human User': 'Human',
}

export function externalInteractorSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'interactorType', label: 'Interactor type', type: 'select', options: INTERACTOR_TYPE_OPTIONS },
    { key: 'authenticated', label: 'Authenticates itself', type: 'boolean' },
    { key: 'type', label: 'Type', type: 'select', options: ['Not Selected', 'Code', 'Human'] },
    { key: 'isMicrosoft', label: 'Microsoft', type: 'boolean' },
  ]
}

export function dataFlowSecurityFields(): AttributeFieldDef[] {
  return [
    { key: 'physicalNetwork', label: 'Physical network', type: 'select', options: ['Wire', 'Wifi', 'Bluetooth', '2G-4G'] },
    { key: 'sourceAuthenticated', label: 'Source authenticated', type: 'boolean' },
    { key: 'destinationAuthenticated', label: 'Destination authenticated', type: 'boolean' },
    { key: 'providesConfidentiality', label: 'Provides confidentiality', type: 'boolean' },
    { key: 'providesIntegrity', label: 'Provides integrity', type: 'boolean' },
    { key: 'transmitsXml', label: 'Transmits XML', type: 'boolean' },
    { key: 'containsCookies', label: 'Contains cookies', type: 'boolean' },
    { key: 'soapPayload', label: 'SOAP payload', type: 'boolean' },
    { key: 'restPayload', label: 'REST payload', type: 'boolean' },
    { key: 'rssPayload', label: 'RSS payload', type: 'boolean' },
    { key: 'jsonPayload', label: 'JSON payload', type: 'boolean' },
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
    default:
      return []
  }
}
