import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { MasterDataEventType } from "@afenda/events";

/** Same-TX audit fact — production adapter writes `platform_audit_log`. */
export type AuditFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	changes: Change[];
	oldValue?: Record<string, unknown> | null;
	newValue?: Record<string, unknown> | null;
};

export type AuditFactPort = {
	record(input: AuditFactInput): Promise<Result<{ id: string }>>;
};

/** Same-TX outbox — production adapter appends `platform_domain_event`. */
export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: MasterDataEventType;
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
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

/**
 * Memory/test composition only. Production Drizzle mutations embed audit + outbox
 * in the same SQL CTE and do not call these ports — do not wrap Drizzle in fake
 * port invocations.
 */
export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
};
