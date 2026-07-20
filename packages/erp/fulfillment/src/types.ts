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

export type DeliveryLine = {
	id: string;
	organizationId: string;
	deliveryId: string;
	lineNo: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantityOrdered: string | null;
	quantityToDeliver: string;
	salesOrderLineId: string | null;
	lineIdempotencyKey: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DeliveryPick = {
	id: string;
	organizationId: string;
	deliveryId: string;
	deliveryLineId: string | null;
	quantityPicked: string;
	reservationId: string | null;
	pickIdempotencyKey: string;
	pickedAt: Date;
	pickedBy: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type DeliveryPack = {
	id: string;
	organizationId: string;
	deliveryId: string;
	packageCode: string | null;
	notes: string | null;
	packedAt: Date;
	packedBy: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ProofOfDelivery = {
	id: string;
	organizationId: string;
	deliveryId: string;
	receivedByName: string;
	outcome: PodOutcome;
	proofType: string | null;
	evidenceRef: string | null;
	carrierRef: string | null;
	notes: string | null;
	recordedAt: Date;
	recordedBy: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type Delivery = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: DeliveryStatus;
	salesOrderId: string | null;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	shipToPartyId: string | null;
	shipToPartyCode: string | null;
	shipToPartyName: string | null;
	createIdempotencyKey: string;
	pickStartIdempotencyKey: string | null;
	packIdempotencyKey: string | null;
	postIdempotencyKey: string | null;
	podIdempotencyKey: string | null;
	cancelIdempotencyKey: string | null;
	closeIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	deliveredAt: Date | null;
	deliveredBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: DeliveryLine[];
	picks: DeliveryPick[];
	packs: DeliveryPack[];
	proofOfDelivery: ProofOfDelivery | null;
};
