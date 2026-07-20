import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { SalesEventType } from "@afenda/events";
import type { Item, Party, PaymentTerm, RefUom } from "@afenda/master-data";

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

export type OutboxFactInput = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	type: SalesEventType;
	payload: Record<string, unknown>;
};

export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};

export type MutationPorts = {
	audit: AuditFactPort;
	outbox: OutboxPort;
};

/** Resolve Authority B masters — never dual-write `md_*`. */
export type MasterLookupPort = {
	getPartyById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<Party | null>>;
	getItemById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<Item | null>>;
	getPaymentTermById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<PaymentTerm | null>>;
	getRefUomById(id: string): Promise<Result<RefUom | null>>;
};
