import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { MasterDataEventType } from "@afenda/events";

/** Same-TX audit fact — production adapter writes `platform_audit_log`. */
export interface AuditFactInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
}

export interface AuditFactPort {
	record: (input: AuditFactInput) => Promise<Result<{ id: string }>>;
}

/** Same-TX outbox — production adapter appends `platform_domain_event`. */
export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: {
		organizationId: string;
		entityType: string;
		entityId: string;
		code: string;
		version: number;
		actorId: string;
		correlationId: string;
		causationId?: string;
		changedPaths?: string[];
	};
	type: MasterDataEventType;
}

export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}

export interface ClockPort {
	now: () => Date;
}

/**
 * Memory/test composition only. Production Drizzle mutations persist state,
 * audit, and outbox in one database transaction and do not call these ports.
 * Do not wrap Drizzle in fake port invocations.
 */
export interface MutationPorts {
	audit: AuditFactPort;
	clock: ClockPort;
	outbox: OutboxPort;
}
