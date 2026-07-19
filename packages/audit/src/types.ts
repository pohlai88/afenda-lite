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

export type Change = {
	field: string;
	oldValue: unknown;
	newValue: unknown;
};

export type AuditEntry = {
	id: string;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	module: string;
	entity: string;
	entityId: string;
	action: AuditAction;
	changes: Change[];
	oldValue: Record<string, unknown> | null;
	newValue: Record<string, unknown> | null;
	metadata: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
};

/** Per-call actor / request attribution — never process-global. */
export type AuditContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
};

export type AuditWriteInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	module: string;
	entity: string;
	entityId: string;
	action: AuditAction;
	changes: Change[];
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
	metadata?: Record<string, unknown> | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	createdAt?: Date;
};

export type AuditQueryFilter = {
	organizationId: string;
	module?: string;
	entity?: string;
	entityId?: string;
	actorUserId?: string;
	action?: AuditAction;
	correlationId?: string;
	from?: Date;
	to?: Date;
};

export type AuditQueryOptions = AuditQueryFilter & {
	page: number;
	pageSize: number;
};

export type AuditExportFormat = "json" | "csv";

export type AuditExportOptions = AuditQueryFilter & {
	format: AuditExportFormat;
};

export type AuditPurgeOptions = {
	organizationId: string;
	olderThan: Date;
};
