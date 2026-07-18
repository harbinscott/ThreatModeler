import { ProcessNode } from './nodes/ProcessNode'
import { ExternalEntityNode } from './nodes/ExternalEntityNode'
import { DataStoreNode } from './nodes/DataStoreNode'
import { TrustBoundaryNode } from './nodes/TrustBoundaryNode'
import { MitigationNode } from './nodes/MitigationNode'

export const nodeTypes = {
  process: ProcessNode,
  'external-entity': ExternalEntityNode,
  'data-store': DataStoreNode,
  'trust-boundary': TrustBoundaryNode,
  mitigation: MitigationNode,
}
