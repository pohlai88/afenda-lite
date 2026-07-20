import "server-only";

export type {
	InventoryAuthorizationPort,
	InventoryPermission,
} from "./authorization";
export {
	type StockBalanceId,
	type StockMovementId,
	type StockMovementLineId,
	type StockReservationId,
	stockBalanceIdSchema,
	stockMovementIdSchema,
	stockMovementLineIdSchema,
	stockReservationIdSchema,
} from "./brands";
export type { InventoryCommandOptions } from "./command-options";
export {
	createDrizzleInventoryStore,
	DrizzleInventoryStore,
} from "./drizzle-store";
export { createMasterDataLookupPort } from "./master-lookup";
export {
	createMemoryInventoryStore,
	MemoryInventoryStore,
} from "./memory-store";
export {
	addStockMovementLine,
	createStockMovement,
	getStockAvailability,
	getStockMovementById,
	listStockMovements,
	postStockMovement,
	releaseReservation,
	reserveStock,
} from "./movement";
export type {
	AuditFactInput,
	AuditFactPort,
	MasterLookupPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
} from "./ports";
export { createProductionMutationPorts } from "./production-ports";
export {
	addStockMovementLineInputSchema,
	createStockMovementInputSchema,
	getStockAvailabilityInputSchema,
	getStockMovementByIdInputSchema,
	listStockMovementsInputSchema,
	postStockMovementInputSchema,
	releaseReservationInputSchema,
	reserveStockInputSchema,
} from "./schemas";
export type {
	AvailabilityFilter,
	InventoryStore,
	MovementCreateRecord,
	MovementLineCreateRecord,
	MovementListFilter,
	MovementPostRecord,
} from "./store";
export {
	STOCK_MOVEMENT_STATUSES,
	STOCK_MOVEMENT_TYPES,
	STOCK_RESERVATION_STATUSES,
	type StockBalance,
	type StockLedgerEntry,
	type StockMovement,
	type StockMovementLine,
	type StockMovementStatus,
	type StockMovementType,
	type StockReservation,
	type StockReservationStatus,
} from "./types";
