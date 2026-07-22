import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { HumanResourcesEventType } from "@afenda/events";

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
	type: HumanResourcesEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
};

export type CurrencyLookupPort = {
	exists(currencyCode: string): Promise<Result<boolean>>;
};
