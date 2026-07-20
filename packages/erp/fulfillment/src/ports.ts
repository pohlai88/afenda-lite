import type { Change } from "@afenda/audit";
import type { Result } from "@afenda/errors/result";
import type { FulfillmentEventType } from "@afenda/events/schemas";
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
	type: FulfillmentEventType;
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

export type FulfillableSalesOrderLine = {
	salesOrderLineId: string;
	itemId: string;
	uomId: string;
	orderedQuantity: string;
};

export type FulfillableSalesOrder = {
	status: string;
	version: number;
	customerPartyId: string;
	customerPartyCode: string;
	customerPartyName: string;
	shipToSnapshot: {
		name: string;
		addressLines: string[];
		countryCode: string;
	} | null;
	lines: FulfillableSalesOrderLine[];
};

export type SalesFulfillmentQueryPort = {
	getFulfillableSalesOrder(input: {
		organizationId: string;
		salesOrderId: string;
		actorUserId: string;
	}): Promise<Result<FulfillableSalesOrder | null>>;
};
