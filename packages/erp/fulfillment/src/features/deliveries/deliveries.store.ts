import type { Result } from "@afenda/errors";
import type {
	Delivery,
	DeliveryLine,
	DeliveryPack,
	DeliveryPick,
	DeliveryStatus,
	ProofOfDelivery,
} from "../../kernel/contracts/domain";
import type { MutationPorts } from "../../kernel/contracts/ports";

export interface DeliveryCreateRecord {
	code: string;
	createdBy: string;
	idempotencyKey: string;
	normalizedCode: string;
	organizationId: string;
	salesOrderId: string | null;
	shipToPartyCode: string | null;
	shipToPartyId: string | null;
	shipToPartyName: string | null;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}
export interface DeliveryLineCreateRecord {
	baseUomCode: string;
	baseUomId: string;
	createdBy: string;
	deliveryId: string;
	expectedVersion: number;
	idempotencyKey: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	organizationId: string;
	quantityOrdered: string | null;
	quantityToDeliver: string;
	salesOrderLineId: string | null;
}
export interface DeliveryStateRecord {
	actorUserId: string;
	deliveryId: string;
	expectedVersion: number;
	idempotencyKey: string;
	organizationId: string;
}
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
export interface DeliveryListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	salesOrderId?: string | undefined;
	sort?: "created_at" | "code" | "status";
	status?: DeliveryStatus | undefined;
	warehouseId?: string | undefined;
}
export interface MutationMeta {
	correlationId: string;
}

export interface FulfillmentStore {
	addLine: (
		record: DeliveryLineCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<DeliveryLine>>;
	cancelDelivery: (
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Delivery>>;
	closeDelivery: (
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Delivery>>;
	confirmPack: (
		record: DeliveryPackCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<DeliveryPack>>;
	confirmPick: (
		record: DeliveryPickCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<DeliveryPick>>;
	createDelivery: (
		record: DeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Delivery>>;
	getDeliveryById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Delivery | null>>;
	listDeliveries: (filter: DeliveryListFilter) => Promise<Result<Delivery[]>>;
	postDelivery: (
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Delivery>>;
	recordProofOfDelivery: (
		record: ProofOfDeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<ProofOfDelivery>>;
	startPicking: (
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	) => Promise<Result<Delivery>>;
	sumPostedQuantityForSalesOrderLine: (
		organizationId: string,
		salesOrderLineId: string,
	) => Promise<Result<string>>;
}
