/**
 * ARCH-023 hard tenant roots after domain wipe.
 * Every table has `organization_id … NOT NULL` — CI: `pnpm audit:tenancy-nulls`.
 */
import {
	platformAuditLog,
	platformNotification,
	platformRbacAudit,
	platformRoleAssignment,
	platformSearchDocument,
} from "./schema/platform";

/** SQL table names for null-org audits (RB-001 §3.4 · ARCH-023). */
export const HARD_TENANT_ROOT_TABLE_NAMES = [
	"platform_role_assignment",
	"platform_rbac_audit",
	"platform_audit_log",
	"platform_search_document",
	"platform_notification",
] as const;

export type HardTenantRootTableName =
	(typeof HARD_TENANT_ROOT_TABLE_NAMES)[number];

/** Drizzle table refs for schema contract tests. */
export const HARD_TENANT_ROOT_TABLES = {
	platformRoleAssignment,
	platformRbacAudit,
	platformAuditLog,
	platformSearchDocument,
	platformNotification,
} as const;
