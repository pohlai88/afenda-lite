import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { ReceivingEventType } from "@afenda/events/schemas";
import type { Item, RefUom, Warehouse } from "@afenda/master-data";

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
	type: ReceivingEventType;
	payload: Record<string, unknown>;
};
export type OutboxPort = {
	append(input: OutboxFactInput): Promise<Result<{ id: string }>>;
};
export type MutationPorts = { audit: AuditFactPort; outbox: OutboxPort };

export type MasterLookupPort = {
	getItemById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<Item | null>>;
	getRefUomById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<RefUom | null>>;
	getWarehouseById(
		organizationId: string,
		id: string,
		actorUserId: string,
	): Promise<Result<Warehouse | null>>;
};

/**
 * Receiving-owned PO snapshot for create/post guards.
 * Adapters live in apps/web — package must NOT import @afenda/purchasing.
 */
export type PurchaseOrderReceivingLineSnapshot = {
	purchaseOrderLineId: string;
	ordered: string;
	/** Sum from posted|closed goods receipts for this PO line. */
	received: string;
	/** max(0, ordered - received) */
	remaining: string;
	overReceiptTolerancePercent: string;
};

export type PurchaseOrderReceivingStatus =
	| "draft"
	| "posted"
	| "cancelled"
	| "closed";

export type PurchaseOrderReceivingSnapshot = {
	status: PurchaseOrderReceivingStatus;
	version: number;
	lines: PurchaseOrderReceivingLineSnapshot[];
};

export type PurchaseOrderReceivingQueryPort = {
	getReceivingSnapshot(input: {
		organizationId: string;
		purchaseOrderId: string;
	}): Promise<Result<PurchaseOrderReceivingSnapshot | null>>;
};
