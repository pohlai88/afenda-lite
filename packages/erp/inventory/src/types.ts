export const STOCK_MOVEMENT_TYPES = [
	"receipt",
	"issue",
	"transfer",
	"adjustment",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_STATUSES = [
	"draft",
	"posted",
	"cancelled",
] as const;
export type StockMovementStatus = (typeof STOCK_MOVEMENT_STATUSES)[number];

export const STOCK_RESERVATION_STATUSES = [
	"active",
	"partially_consumed",
	"consumed",
	"released",
	"expired",
	"cancelled",
] as const;
export type StockReservationStatus =
	(typeof STOCK_RESERVATION_STATUSES)[number];

export const INVENTORY_MOVEMENT_SOURCES = [
	"receiving",
	"fulfillment",
	"manual_adjustment",
	"opening_balance",
	"transfer",
] as const;
export type InventoryMovementSource =
	(typeof INVENTORY_MOVEMENT_SOURCES)[number];

export type StockMovementLine = {
	id: string;
	organizationId: string;
	movementId: string;
	lineNo: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	/** Decimal quantity as normalized string (precision preserved). */
	quantity: string;
	lineIdempotencyKey: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type StockMovement = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	movementType: StockMovementType;
	status: StockMovementStatus;
	source: InventoryMovementSource;
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	fromWarehouseId: string | null;
	fromWarehouseCode: string | null;
	fromWarehouseName: string | null;
	toWarehouseId: string | null;
	toWarehouseCode: string | null;
	toWarehouseName: string | null;
	/** Linked reservation when issue consumes a reservation. */
	reservationId: string | null;
	/** Posted movement this reverses (compensating movement). */
	reversesMovementId: string | null;
	adjustmentReasonCode: string | null;
	adjustmentNote: string | null;
	sourceModule: string | null;
	sourceAggregateId: string | null;
	sourceEventId: string | null;
	sourceEventVersion: number | null;
	sourceLineId: string | null;
	createIdempotencyKey: string;
	postIdempotencyKey: string | null;
	cancelIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: StockMovementLine[];
};

export type StockBalance = {
	id: string;
	organizationId: string;
	warehouseId: string;
	warehouseCode: string;
	itemId: string;
	itemCode: string;
	baseUomId: string | null;
	baseUomCode: string | null;
	onHand: string;
	reserved: string;
	available: string;
	version: number;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

/** Availability projection — available = onHand − active reserved (no ATP). */
export type StockAvailability = {
	organizationId: string;
	warehouseId: string;
	warehouseCode: string;
	itemId: string;
	itemCode: string;
	baseUomId: string | null;
	baseUomCode: string | null;
	onHandQuantity: string;
	reservedQuantity: string;
	availableQuantity: string;
	asOfLedgerSequence: number;
	balanceVersion: number;
};

export type StockReservation = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: StockReservationStatus;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantity: string;
	consumedQuantity: string;
	createIdempotencyKey: string;
	releaseIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	releasedAt: Date | null;
	releasedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type StockLedgerEntry = {
	id: string;
	organizationId: string;
	movementId: string;
	movementLineId: string | null;
	movementCode: string;
	movementType: StockMovementType;
	warehouseId: string;
	warehouseCode: string;
	itemId: string;
	itemCode: string;
	quantityDelta: string;
	onHandAfter: string;
	reservedAfter: string;
	availableAfter: string;
	ledgerSequence: number;
	actorUserId: string;
	correlationId: string;
	createdAt: Date;
};
