import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { ReceivingEventType } from "@afenda/events/schemas";
import type { Item, RefUom, Warehouse } from "@afenda/master-data";

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

export interface OutboxFactInput {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: ReceivingEventType;
}
export interface OutboxPort {
	append: (input: OutboxFactInput) => Promise<Result<{ id: string }>>;
}
export interface MutationPorts {
	audit: AuditFactPort;
	outbox: OutboxPort;
}

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

/**
 * Receiving-owned PO snapshot for create/post guards.
 * Adapters live in apps/web — package must NOT import @afenda/purchasing.
 */
export interface PurchaseOrderReceivingLineSnapshot {
	ordered: string;
	overReceiptTolerancePercent: string;
	purchaseOrderLineId: string;
	/** Sum from posted|closed goods receipts for this PO line. */
	received: string;
	/** max(0, ordered - received) */
	remaining: string;
}

export type PurchaseOrderReceivingStatus =
	| "draft"
	| "posted"
	| "cancelled"
	| "closed";

export interface PurchaseOrderReceivingSnapshot {
	lines: PurchaseOrderReceivingLineSnapshot[];
	status: PurchaseOrderReceivingStatus;
	version: number;
}

export interface PurchaseOrderReceivingQueryPort {
	getReceivingSnapshot: (input: {
		organizationId: string;
		purchaseOrderId: string;
	}) => Promise<Result<PurchaseOrderReceivingSnapshot | null>>;
}
