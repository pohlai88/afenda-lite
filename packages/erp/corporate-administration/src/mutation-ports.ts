import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationEventType } from "@afenda/events/schemas";

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

export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: CorporateAdministrationEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
	record(input: {
		audit: AuditFactInput;
		outbox: OutboxFactInput;
	}): Promise<Result<{ auditId: string; eventId: string }>>;
};
