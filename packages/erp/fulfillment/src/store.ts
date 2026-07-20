import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	Delivery,
	DeliveryLine,
	DeliveryPack,
	DeliveryPick,
	DeliveryStatus,
	ProofOfDelivery,
} from "./types";

export type DeliveryCreateRecord = {
	organizationId: string;
	idempotencyKey: string;
	code: string;
	normalizedCode: string;
	salesOrderId: string | null;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	shipToPartyId: string | null;
	shipToPartyCode: string | null;
	shipToPartyName: string | null;
	createdBy: string;
};
export type DeliveryLineCreateRecord = {
	organizationId: string;
	idempotencyKey: string;
	deliveryId: string;
	expectedVersion: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantityOrdered: string | null;
	quantityToDeliver: string;
	salesOrderLineId: string | null;
	createdBy: string;
};
export type DeliveryStateRecord = {
	organizationId: string;
	deliveryId: string;
	expectedVersion: number;
	actorUserId: string;
	idempotencyKey: string;
};
export type DeliveryPickCreateRecord = DeliveryStateRecord & {
	deliveryLineId: string;
	quantityPicked: string;
	reservationId: string;
};
export type DeliveryPackCreateRecord = DeliveryStateRecord & {
	packageCode: string | null;
	notes: string | null;
};
export type ProofOfDeliveryCreateRecord = DeliveryStateRecord & {
	receivedByName: string;
	outcome: "delivered" | "partially_delivered" | "refused" | "failed";
	proofType: string | null;
	evidenceRef: string | null;
	carrierRef: string | null;
	notes: string | null;
	recordedAt: Date;
};
export type DeliveryListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: DeliveryStatus;
	warehouseId?: string;
	salesOrderId?: string;
	sort?: "created_at" | "code" | "status";
};
export type MutationMeta = { correlationId: string };

export type FulfillmentStore = {
	createDelivery(
		record: DeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>>;
	addLine(
		record: DeliveryLineCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryLine>>;
	startPicking(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>>;
	confirmPick(
		record: DeliveryPickCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPick>>;
	confirmPack(
		record: DeliveryPackCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPack>>;
	postDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>>;
	recordProofOfDelivery(
		record: ProofOfDeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<ProofOfDelivery>>;
	cancelDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>>;
	closeDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>>;
	getDeliveryById(
		organizationId: string,
		id: string,
	): Promise<Result<Delivery | null>>;
	listDeliveries(filter: DeliveryListFilter): Promise<Result<Delivery[]>>;
	sumPostedQuantityForSalesOrderLine(
		organizationId: string,
		salesOrderLineId: string,
	): Promise<Result<string>>;
};
