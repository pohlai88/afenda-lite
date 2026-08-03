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

export interface StockMovementLine {
	baseUomCode: string;
	baseUomId: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineIdempotencyKey: string;
	lineNo: number;
	movementId: string;
	organizationId: string;
	/** Decimal quantity as normalized string (precision preserved). */
	quantity: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface StockMovement {
	adjustmentNote: string | null;
	adjustmentReasonCode: string | null;
	cancelIdempotencyKey: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	fromWarehouseCode: string | null;
	fromWarehouseId: string | null;
	fromWarehouseName: string | null;
	id: string;
	lines: StockMovementLine[];
	movementType: StockMovementType;
	normalizedCode: string;
	organizationId: string;
	postedAt: Date | null;
	postedBy: string | null;
	postIdempotencyKey: string | null;
	/** Linked reservation when issue consumes a reservation. */
	reservationId: string | null;
	/** Posted movement this reverses (compensating movement). */
	reversesMovementId: string | null;
	source: InventoryMovementSource;
	sourceAggregateId: string | null;
	sourceEventId: string | null;
	sourceEventVersion: number | null;
	sourceLineId: string | null;
	sourceModule: string | null;
	status: StockMovementStatus;
	toWarehouseCode: string | null;
	toWarehouseId: string | null;
	toWarehouseName: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}

export interface StockBalance {
	available: string;
	baseUomCode: string | null;
	baseUomId: string | null;
	createdAt: Date;
	id: string;
	itemCode: string;
	itemId: string;
	onHand: string;
	organizationId: string;
	reserved: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string;
	warehouseId: string;
}

/** Availability projection — available = onHand − active reserved (no ATP). */
export interface StockAvailability {
	asOfLedgerSequence: number;
	availableQuantity: string;
	balanceVersion: number;
	baseUomCode: string | null;
	baseUomId: string | null;
	itemCode: string;
	itemId: string;
	onHandQuantity: string;
	organizationId: string;
	reservedQuantity: string;
	warehouseCode: string;
	warehouseId: string;
}

export interface StockReservation {
	baseUomCode: string;
	baseUomId: string;
	code: string;
	consumedQuantity: string;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string;
	id: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	normalizedCode: string;
	organizationId: string;
	quantity: string;
	releasedAt: Date | null;
	releasedBy: string | null;
	releaseIdempotencyKey: string | null;
	status: StockReservationStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}

export interface StockLedgerEntry {
	actorUserId: string;
	availableAfter: string;
	correlationId: string;
	createdAt: Date;
	id: string;
	itemCode: string;
	itemId: string;
	ledgerSequence: number;
	movementCode: string;
	movementId: string;
	movementLineId: string | null;
	movementType: StockMovementType;
	onHandAfter: string;
	organizationId: string;
	quantityDelta: string;
	reservedAfter: string;
	warehouseCode: string;
	warehouseId: string;
}
