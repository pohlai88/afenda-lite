/**
 * General domain activity audit vocabulary (not RBAC — see `@afenda/admin/audit`).
 */

export const AUDIT_ACTIONS = [
	"CREATE",
	"UPDATE",
	"DELETE",
	"READ",
	"LOGIN",
	"LOGOUT",
	"EXPORT",
	"IMPORT",
	"APPROVE",
	"REJECT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface Change {
	field: string;
	newValue: unknown;
	oldValue: unknown;
}

export interface AuditEntry {
	action: AuditAction;
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	createdAt: Date;
	entity: string;
	entityId: string;
	id: string;
	ipAddress: string | null;
	metadata: Record<string, unknown> | null;
	module: string;
	newValue: Record<string, unknown> | null;
	oldValue: Record<string, unknown> | null;
	organizationId: string;
	userAgent: string | null;
}

/** Per-call actor / request attribution — never process-global. */
export interface AuditContext {
	actorUserId: string;
	correlationId: string;
	ipAddress?: string;
	metadata?: Record<string, unknown>;
	organizationId: string;
	userAgent?: string;
}

export interface AuditWriteInput {
	action: AuditAction;
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	createdAt?: Date;
	entity: string;
	entityId: string;
	ipAddress?: string | null;
	metadata?: Record<string, unknown> | null;
	module: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	userAgent?: string | null;
}

export interface AuditQueryFilter {
	action?: AuditAction | undefined;
	actorUserId?: string | undefined;
	correlationId?: string | undefined;
	entity?: string | undefined;
	entityId?: string | undefined;
	from?: Date | undefined;
	module?: string | undefined;
	organizationId: string;
	to?: Date | undefined;
}

export type AuditQueryOptions = AuditQueryFilter & {
	page: number;
	pageSize: number;
};

export type AuditExportFormat = "json" | "csv";

export type AuditExportOptions = AuditQueryFilter & {
	format: AuditExportFormat;
};

export interface AuditPurgeOptions {
	olderThan: Date;
	organizationId: string;
}
