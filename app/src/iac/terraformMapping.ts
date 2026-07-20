import type { ElementType } from '../types/project'

export interface TerraformTypeMapping {
  elementType: ElementType
  /** Built-in stencil id from `stencils.ts`, where a genuinely good match
   *  exists — otherwise the imported node just gets a generic label with
   *  no preset applied, rather than forcing a misleading stencil choice. */
  stencilId?: string
}

/** Release 14 stage A — Terraform resource type -> this app's element
 *  taxonomy. Deliberately AWS-only and deliberately not exhaustive: covers
 *  the resource types that come up constantly in real infrastructure
 *  (compute, storage, databases, networking chokepoints, API/messaging),
 *  not every resource AWS's provider exposes. A type not in this table is
 *  skipped on import rather than guessed at — see `terraformImport.ts`'s
 *  summary count for how that's surfaced to the user. Extend this table
 *  first if another provider (Azure/GCP) is ever added, rather than
 *  building a second parallel mechanism.
 *
 *  Notably absent: IAM (`aws_iam_*`), networking plumbing (`aws_vpc`,
 *  `aws_subnet`, `aws_route_table`, `aws_internet_gateway`,
 *  `aws_nat_gateway`) — these configure *how* the mapped resources connect
 *  or who can act on them, but aren't threat-model elements in their own
 *  right the way this app models DFDs. Also notably absent: any mapping to
 *  `external-entity` — Terraform has no resource type for "a user" or "an
 *  external actor," so an imported diagram never gets one automatically;
 *  the user has to add those by hand to complete the picture. Documented
 *  as a known v1 limitation, not a bug. */
export const TERRAFORM_RESOURCE_MAP: Record<string, TerraformTypeMapping> = {
  // --- Compute / process ---
  aws_instance: { elementType: 'process', stencilId: 'virtual-machine' },
  aws_lambda_function: { elementType: 'process', stencilId: 'background-service' },
  aws_ecs_service: { elementType: 'process', stencilId: 'virtual-machine' },
  aws_ecs_task_definition: { elementType: 'process', stencilId: 'virtual-machine' },
  aws_eks_cluster: { elementType: 'process', stencilId: 'virtual-machine' },
  aws_eks_node_group: { elementType: 'process', stencilId: 'virtual-machine' },
  aws_elastic_beanstalk_environment: { elementType: 'process', stencilId: 'managed-application' },
  aws_sfn_state_machine: { elementType: 'process', stencilId: 'background-service' },
  aws_lb: { elementType: 'process', stencilId: 'load-balancer' },
  aws_alb: { elementType: 'process', stencilId: 'load-balancer' },
  aws_sqs_queue: { elementType: 'process', stencilId: 'message-queue' },
  aws_sns_topic: { elementType: 'process', stencilId: 'message-queue' },

  // --- Data stores ---
  aws_db_instance: { elementType: 'data-store', stencilId: 'sql-database' },
  aws_rds_cluster: { elementType: 'data-store', stencilId: 'sql-database' },
  aws_dynamodb_table: { elementType: 'data-store', stencilId: 'nosql-database' },
  aws_s3_bucket: { elementType: 'data-store', stencilId: 'cloud-storage' },
  aws_elasticache_cluster: { elementType: 'data-store', stencilId: 'cache' },
  aws_elasticache_replication_group: { elementType: 'data-store', stencilId: 'cache' },
  aws_efs_file_system: { elementType: 'data-store', stencilId: 'file-storage' },

  // --- Mitigation controls ---
  aws_api_gateway_rest_api: { elementType: 'mitigation', stencilId: 'api-gateway' },
  aws_apigatewayv2_api: { elementType: 'mitigation', stencilId: 'api-gateway' },
  aws_wafv2_web_acl: { elementType: 'mitigation', stencilId: 'waf' },
  aws_waf_web_acl: { elementType: 'mitigation', stencilId: 'waf' },
  aws_security_group: { elementType: 'mitigation', stencilId: 'firewall' },
  aws_network_acl: { elementType: 'mitigation', stencilId: 'firewall' },
  aws_shield_protection: { elementType: 'mitigation', stencilId: 'generic-mitigation' },
}

/** A human label for an imported node, since Terraform resource *names*
 *  (the second quoted string) are identifiers, not display labels — e.g.
 *  `aws_db_instance.primary` becomes "primary (aws_db_instance)" rather
 *  than just "primary", so the type stays visible even before the user
 *  opens the Inspector. */
export function labelForResource(type: string, name: string): string {
  return `${name} (${type})`
}
