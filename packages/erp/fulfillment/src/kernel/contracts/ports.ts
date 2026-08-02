import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors";
import type { FulfillmentEventType } from "@afenda/events/schemas";
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
	type: FulfillmentEventType;
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

export interface FulfillableSalesOrderLine {
	itemId: string;
	orderedQuantity: string;
	salesOrderLineId: string;
	uomId: string;
}

export interface FulfillableSalesOrder {
	customerPartyCode: string;
	customerPartyId: string;
	customerPartyName: string;
	lines: FulfillableSalesOrderLine[];
	shipToSnapshot: {
		name: string;
		addressLines: string[];
		countryCode: string;
	} | null;
	status: string;
	version: number;
}

export interface SalesFulfillmentQueryPort {
	getFulfillableSalesOrder: (input: {
		organizationId: string;
		salesOrderId: string;
		actorUserId: string;
	}) => Promise<Result<FulfillableSalesOrder | null>>;
}
