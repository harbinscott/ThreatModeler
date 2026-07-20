import type { Diagram, DiagramEdge, DiagramNode, ElementType } from '../types/project'
import { findStencil } from '../canvas/stencils'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  /** A factory, not a static diagram — called once at project creation so
   *  every node/edge gets a fresh id, same as `makeNode`/`addFlow` do for a
   *  manually-added shape. Returns an empty diagram for the 'blank'
   *  template, preserving today's default behavior exactly. */
  build: () => Diagram
}

function node(elementType: ElementType, label: string, x: number, y: number, stencilId?: string): DiagramNode {
  const stencil = findStencil(stencilId)
  return {
    id: crypto.randomUUID(),
    type: elementType,
    position: { x, y },
    data: {
      label,
      elementType,
      componentType: stencil?.id,
      attributes: stencil?.defaults ? { ...stencil.defaults } : undefined,
    },
  }
}

function boundary(label: string, x: number, y: number, width: number, height: number): DiagramNode {
  return { ...node('trust-boundary', label, x, y), style: { width, height }, zIndex: -1 }
}

function flow(source: DiagramNode, target: DiagramNode, label?: string): DiagramEdge {
  return { id: crypto.randomUUID(), source: source.id, target: target.id, type: 'floating', data: { label } }
}

function threeTierWebApp(): Diagram {
  const user = node('external-entity', 'End User', 40, 130, 'human-user')
  const zone = boundary('Corporate Network', 260, 40, 700, 220)
  const web = node('process', 'Web Server', 300, 120, 'web-server')
  const app = node('process', 'App Server', 520, 120, 'api-service')
  const db = node('data-store', 'Database', 740, 120, 'sql-database')
  return {
    nodes: [user, zone, web, app, db],
    edges: [flow(user, web, 'HTTPS request'), flow(web, app, 'Internal API call'), flow(app, db, 'SQL query')],
  }
}

function microservicesApiGateway(): Diagram {
  const client = node('external-entity', 'Mobile / Web Client', 40, 160, 'browser')
  const gateway = node('mitigation', 'API Gateway', 260, 160, 'api-gateway')
  const zone = boundary('Service Mesh', 460, 20, 640, 320)
  const orders = node('process', 'Orders Service', 500, 60, 'api-service')
  const users = node('process', 'Users Service', 500, 160, 'api-service')
  const payments = node('process', 'Payments Service', 500, 260, 'api-service')
  const db = node('data-store', 'Shared Database', 800, 160, 'sql-database')
  return {
    nodes: [client, gateway, zone, orders, users, payments, db],
    edges: [
      flow(client, gateway, 'HTTPS request'),
      flow(gateway, orders, 'Routed request'),
      flow(gateway, users, 'Routed request'),
      flow(gateway, payments, 'Routed request'),
      flow(orders, db, 'Read/write'),
      flow(users, db, 'Read/write'),
      flow(payments, db, 'Read/write'),
    ],
  }
}

function mobileAppCloudBackend(): Diagram {
  const user = node('external-entity', 'Mobile App User', 40, 160, 'human-user')
  const mobileApp = node('process', 'Mobile App', 220, 160, 'mobile-device-app')
  const zone = boundary('Cloud Backend', 420, 60, 520, 200)
  const api = node('process', 'Backend API', 460, 100, 'api-service')
  api.data.attributes = { ...api.data.attributes, usesAI: true, aiFunction: 'LLM / Generative AI' }
  const userData = node('data-store', 'User Data Store', 680, 100, 'sql-database')
  userData.data.complianceTags = ['PII']
  const aiProvider = node('external-entity', 'Third-Party AI Provider', 760, 300, 'external-web-service')
  aiProvider.data.attributes = { ...aiProvider.data.attributes, usesThirdPartyAIProvider: true }
  return {
    nodes: [user, mobileApp, zone, api, userData, aiProvider],
    edges: [
      flow(user, mobileApp, 'App interaction'),
      flow(mobileApp, api, 'HTTPS API calls'),
      flow(api, userData, 'Read/write user data'),
      flow(api, aiProvider, 'Inference request'),
    ],
  }
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'blank', name: 'Blank', description: 'Start from an empty canvas.', build: () => ({ nodes: [], edges: [] }) },
  {
    id: 'three-tier-web-app',
    name: 'Three-Tier Web App',
    description: 'External user → web server → app server → database, inside a corporate network boundary.',
    build: threeTierWebApp,
  },
  {
    id: 'microservices-api-gateway',
    name: 'Microservices + API Gateway',
    description: 'Client traffic routed through an API Gateway to three services sharing a database.',
    build: microservicesApiGateway,
  },
  {
    id: 'mobile-app-cloud-backend',
    name: 'Mobile App + Cloud Backend',
    description: 'Mobile client, cloud backend API (AI-enabled), a PII data store, and a third-party AI provider.',
    build: mobileAppCloudBackend,
  },
]
