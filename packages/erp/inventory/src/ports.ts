import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { InventoryEventType } from "@afenda/events/schemas";
import type { Item, RefUom, Warehouse } from "@afenda/master-data";

/** Same-TX audit fact — production adapter writes `platform_audit_log`. */
export interface AuditFactInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	changes: Change[];
	correlationId: string;
	entity: string;
	entityId: string;
	newValue?: Record<string, unknown> | null | undefined;
	oldValue?: Record<string, unknown> | null | undefined;
	organizationId: string;
}

export interface AuditFactPort {
	record: (input: AuditFactInput) => Promise<Result<{ id: string }>>;
}

export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: InventoryEventType;
}

export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}

export interface MutationPorts {
	audit: AuditFactPort;
	outbox: OutboxPort;
}

/** Resolve Authority B masters — never dual-write `md_*`. */
export interface MasterLookupPort {
	getItemById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<Item | null>>;
	getRefUomById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<RefUom | null>>;
	getWarehouseById: (
		organizationId: string,
		id: string,
		actorUserId: string,
	) => Promise<Result<Warehouse | null>>;
}
