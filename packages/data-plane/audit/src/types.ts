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

export const AUDIT_EVENT_OUTCOMES = ["SUCCEEDED", "FAILED", "DENIED"] as const;

export type AuditEventOutcome = (typeof AUDIT_EVENT_OUTCOMES)[number];

/** Versioned semantic context; `createdAt` remains database-recorded time. */
export interface AuditEventContext {
	causationId: string | null;
	occurredAt: Date | null;
	outcome: AuditEventOutcome;
	reasonCode: string | null;
	source: string;
	version: 1;
}

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
	eventContext: AuditEventContext | null;
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
	entity: string;
	entityId: string;
	eventContext?: AuditEventContext;
	ipAddress?: string | null;
	metadata?: Record<string, unknown> | null;
	module: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	userAgent?: string | null;
}

/** Validated, masked write model consumed by package persistence internals. */
export interface PreparedAuditWriteInput
	extends Omit<
		AuditWriteInput,
		| "eventContext"
		| "ipAddress"
		| "metadata"
		| "newValue"
		| "oldValue"
		| "userAgent"
	> {
	eventContext: AuditEventContext;
	ipAddress: string | null;
	metadata: Record<string, unknown> | null;
	newValue: Record<string, unknown> | null;
	oldValue: Record<string, unknown> | null;
	userAgent: string | null;
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

export interface AuditCursorPosition {
	createdAt: Date;
	id: string;
}

export type AuditCursorQueryOptions = AuditQueryFilter & {
	cursor?: AuditCursorPosition;
	pageSize: number;
};

export type AuditQueryOptions = AuditQueryFilter & {
	page: number;
	pageSize: number;
};

export type AuditExportFormat = "json" | "csv";

export type AuditExportOptions = AuditQueryFilter & {
	format: AuditExportFormat;
};

/** Bounded export outcome with explicit completeness and continuation evidence. */
export interface AuditExportResult {
	content: string;
	format: AuditExportFormat;
	nextCursor: string | null;
	rowCount: number;
	truncated: boolean;
}

export interface AuditPurgeOptions {
	olderThan: Date;
	organizationId: string;
}
