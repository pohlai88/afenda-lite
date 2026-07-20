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
