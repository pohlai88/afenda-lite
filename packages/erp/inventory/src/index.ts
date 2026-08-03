import "server-only";

export { createMasterDataLookupPort } from "./composition/master-lookup";
export {
	addStockMovementLine,
	cancelReservation,
	cancelStockMovement,
	createReversalMovement,
	createStockMovement,
	expireReservation,
	getStockAvailability,
	getStockMovementById,
	listStockMovements,
	listStockReservations,
	postStockMovement,
	releaseReservation,
	reserveStock,
} from "./facade/capabilities";
export type { InventoryCommandOptions } from "./facade/contracts";
export { reconcileInventory } from "./facade/reconcile";
export {
	addStockMovementLineInputSchema,
	cancelReservationInputSchema,
	cancelStockMovementInputSchema,
	createReversalMovementInputSchema,
	createStockMovementInputSchema,
	expireReservationInputSchema,
	getStockAvailabilityInputSchema,
	getStockMovementByIdInputSchema,
	listStockMovementsInputSchema,
	listStockReservationsInputSchema,
	postStockMovementInputSchema,
	releaseReservationInputSchema,
	reserveStockInputSchema,
} from "./features/movements/movements.schema";
export type {
	AvailabilityFilter,
	InventoryStore,
	MovementCancelRecord,
	MovementCreateRecord,
	MovementLineCreateRecord,
	MovementListFilter,
	MovementPostRecord,
	ReservationCreateRecord,
	ReservationListFilter,
	ReservationReleaseRecord,
	ReservationTerminalEventType,
	ReservationTerminalStatus,
} from "./features/movements/movements.store";
export { reservationTerminalEventType } from "./features/movements/movements.store";
export {
	INVENTORY_MOVEMENT_SOURCES,
	type InventoryMovementSource,
	STOCK_MOVEMENT_STATUSES,
	STOCK_MOVEMENT_TYPES,
	STOCK_RESERVATION_STATUSES,
	type StockAvailability,
	type StockBalance,
	type StockLedgerEntry,
	type StockMovement,
	type StockMovementLine,
	type StockMovementStatus,
	type StockMovementType,
	type StockReservation,
	type StockReservationStatus,
} from "./kernel/contracts/domain";
export type {
	InventoryAuthorizationPort,
	InventoryPermission,
} from "./kernel/execution/authorization";
export {
	INVENTORY_PERMISSION_ADJUSTMENT_POST,
	INVENTORY_PERMISSION_AVAILABILITY_READ,
	INVENTORY_PERMISSION_CODES,
	INVENTORY_PERMISSION_MOVEMENT_CANCEL,
	INVENTORY_PERMISSION_MOVEMENT_CREATE,
	INVENTORY_PERMISSION_MOVEMENT_POST,
	INVENTORY_PERMISSION_MOVEMENT_READ,
	INVENTORY_PERMISSION_RESERVATION_CREATE,
	INVENTORY_PERMISSION_RESERVATION_RELEASE,
} from "./kernel/execution/permissions";
export {
	type StockBalanceId,
	type StockMovementId,
	type StockMovementLineId,
	type StockReservationId,
	stockBalanceIdSchema,
	stockMovementIdSchema,
	stockMovementLineIdSchema,
	stockReservationIdSchema,
} from "./kernel/identity/brands";
