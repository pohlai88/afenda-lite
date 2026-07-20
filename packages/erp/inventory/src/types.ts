export const STOCK_MOVEMENT_TYPES = [
	"receipt",
	"issue",
	"transfer",
	"adjustment",
	"reservation",
	"reservation_release",
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_STATUSES = ["draft", "posted"] as const;
export type StockMovementStatus = (typeof STOCK_MOVEMENT_STATUSES)[number];

export const STOCK_RESERVATION_STATUSES = ["active", "released"] as const;
export type StockReservationStatus =
	(typeof STOCK_RESERVATION_STATUSES)[number];

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
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	fromWarehouseId: string | null;
	fromWarehouseCode: string | null;
	fromWarehouseName: string | null;
	toWarehouseId: string | null;
	toWarehouseCode: string | null;
	toWarehouseName: string | null;
	reservationId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
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
	onHand: string;
	reserved: string;
	available: string;
	version: number;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
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
	sourceMovementId: string | null;
	releaseMovementId: string | null;
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
	actorUserId: string;
	correlationId: string;
	createdAt: Date;
};
