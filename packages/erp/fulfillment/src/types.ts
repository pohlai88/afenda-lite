export const DELIVERY_STATUSES = [
	"draft",
	"picking",
	"packed",
	"posted",
	"delivered",
	"closed",
	"cancelled",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const POD_OUTCOMES = [
	"delivered",
	"partially_delivered",
	"refused",
	"failed",
] as const;
export type PodOutcome = (typeof POD_OUTCOMES)[number];

export interface DeliveryLine {
	baseUomCode: string;
	baseUomId: string;
	createdAt: Date;
	createdBy: string;
	deliveryId: string;
	id: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineIdempotencyKey: string;
	lineNo: number;
	organizationId: string;
	quantityOrdered: string | null;
	quantityToDeliver: string;
	salesOrderLineId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface DeliveryPick {
	createdAt: Date;
	createdBy: string;
	deliveryId: string;
	deliveryLineId: string | null;
	id: string;
	organizationId: string;
	pickedAt: Date;
	pickedBy: string;
	pickIdempotencyKey: string;
	quantityPicked: string;
	reservationId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface DeliveryPack {
	createdAt: Date;
	createdBy: string;
	deliveryId: string;
	id: string;
	notes: string | null;
	organizationId: string;
	packageCode: string | null;
	packedAt: Date;
	packedBy: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ProofOfDelivery {
	carrierRef: string | null;
	createdAt: Date;
	createdBy: string;
	deliveryId: string;
	evidenceRef: string | null;
	id: string;
	notes: string | null;
	organizationId: string;
	outcome: PodOutcome;
	proofType: string | null;
	receivedByName: string;
	recordedAt: Date;
	recordedBy: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface Delivery {
	cancelIdempotencyKey: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	closeIdempotencyKey: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	deliveredAt: Date | null;
	deliveredBy: string | null;
	id: string;
	lines: DeliveryLine[];
	normalizedCode: string;
	organizationId: string;
	packIdempotencyKey: string | null;
	packs: DeliveryPack[];
	pickStartIdempotencyKey: string | null;
	picks: DeliveryPick[];
	podIdempotencyKey: string | null;
	postedAt: Date | null;
	postedBy: string | null;
	postIdempotencyKey: string | null;
	proofOfDelivery: ProofOfDelivery | null;
	salesOrderId: string | null;
	shipToPartyCode: string | null;
	shipToPartyId: string | null;
	shipToPartyName: string | null;
	status: DeliveryStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}
