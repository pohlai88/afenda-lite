import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	requireInventoryCommandPermission,
	requireInventoryQueryPermission,
} from "./authorization";
import {
	type InventoryCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	INVENTORY_ERROR_CODE_CONFLICT,
	INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
	INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
	INVENTORY_ERROR_INVALID_TRANSFER,
	INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
	INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED,
	INVENTORY_ERROR_MOVEMENT_EMPTY_LINES,
	INVENTORY_ERROR_MOVEMENT_NOT_DRAFT,
	INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
	INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT,
	INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED,
	INVENTORY_ERROR_RESERVATION_NOT_FOUND,
	INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT,
	INVENTORY_ERROR_SOURCE_REQUIRED,
	type InventoryErrorCode,
	inventoryErrorDetails,
} from "./error-codes";
import { requireMaster } from "./master-lookup";
import {
	INVENTORY_COMMAND_CANCEL,
	INVENTORY_COMMAND_CANCEL_RESERVATION,
	INVENTORY_COMMAND_CREATE,
	INVENTORY_COMMAND_EXPIRE,
	INVENTORY_COMMAND_LINE_ADD,
	INVENTORY_COMMAND_POST,
	INVENTORY_COMMAND_RELEASE,
	INVENTORY_COMMAND_RESERVE,
	INVENTORY_COMMAND_REVERSE,
	type InventoryCommandId,
	INVENTORY_QUERY_AVAILABILITY,
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_LIST,
	INVENTORY_QUERY_RESERVATION_LIST,
} from "./module-ids";
import { parseInventoryInput } from "./parse-input";
import { INVENTORY_PERMISSION_ADJUSTMENT_POST } from "./permissions";
import {
	addStockMovementLineInputSchema,
	cancelStockMovementInputSchema,
	createReversalMovementInputSchema,
	createStockMovementInputSchema,
	getStockAvailabilityInputSchema,
	getStockMovementByIdInputSchema,
	listStockMovementsInputSchema,
	listStockReservationsInputSchema,
	positiveQuantitySchema,
	postStockMovementInputSchema,
	releaseReservationInputSchema,
	reserveStockInputSchema,
	signedNonZeroQuantitySchema,
} from "./schemas";
import { normalizeMovementCode } from "./shared/code";
import {
	formatQuantity,
	type MovementCreateRecord,
	parseQuantity,
	type ReservationTerminalStatus,
} from "./store";
import type {
	InventoryMovementSource,
	StockAvailability,
	StockMovement,
	StockMovementLine,
	StockReservation,
} from "./types";

type FailureCode = Parameters<typeof fail>[0];
type ResolvedDeps = ReturnType<typeof resolveCommandDeps>;
type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

type WarehouseSnapshot = {
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
};

type ItemSnapshot = {
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
};

function inventoryFail(
	code: FailureCode,
	message: string,
	inventoryCode: InventoryErrorCode,
	details?: Record<string, unknown>,
): Result<never> {
	return fail(code, message, {
		...details,
		...inventoryErrorDetails(inventoryCode),
	});
}

function annotateCreateMovementFailure(
	result: Result<StockMovement>,
): Result<StockMovement> {
	if (result.ok) {
		return result;
	}
	const message = result.message.toLowerCase();
	if (message.includes("idempotency")) {
		return inventoryFail(
			result.code,
			result.message,
			INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
		);
	}
	if (message.includes("code") && message.includes("exist")) {
		return inventoryFail(
			result.code,
			result.message,
			INVENTORY_ERROR_CODE_CONFLICT,
		);
	}
	return result;
}

function annotateAvailabilityFailure<T>(result: Result<T>): Result<T> {
	if (result.ok) {
		return result;
	}
	if (result.message.toLowerCase().includes("available")) {
		return inventoryFail(
			result.code,
			result.message,
			INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
		);
	}
	return result;
}

function deriveIdempotencyKey(base: string, suffix: string): string {
	const maxLength = 128;
	const separator = ":";
	const extraLength = separator.length + suffix.length;
	if (base.length + extraLength <= maxLength) {
		return `${base}${separator}${suffix}`;
	}
	return `${base.slice(0, maxLength - extraLength)}${separator}${suffix}`;
}

function idempotencyConflict(message: string): Result<never> {
	return inventoryFail(
		"CONFLICT",
		message,
		INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
	);
}

function sameQuantity(left: string, right: string): boolean {
	return parseQuantity(left) === parseQuantity(right);
}

function assertMatchingCreateReplay(
	existing: StockMovement,
	input: CreateStockMovementInput,
): Result<void> {
	const matchesCommonFields =
		existing.organizationId === input.organizationId &&
		existing.createdBy === input.actorUserId &&
		existing.code === input.code &&
		existing.movementType === input.movementType &&
		existing.source === input.source &&
		existing.createIdempotencyKey === input.idempotencyKey &&
		existing.sourceModule === (input.sourceModule ?? null) &&
		existing.sourceAggregateId === (input.sourceAggregateId ?? null) &&
		existing.sourceEventId === (input.sourceEventId ?? null) &&
		existing.sourceEventVersion === (input.sourceEventVersion ?? null) &&
		existing.sourceLineId === (input.sourceLineId ?? null);
	if (!matchesCommonFields) {
		return idempotencyConflict(
			"Stock movement idempotency key was reused with different payload",
		);
	}

	switch (input.movementType) {
		case "receipt":
			if (
				existing.warehouseId !== input.warehouseId ||
				existing.reservationId !== null ||
				existing.adjustmentReasonCode !== null ||
				existing.adjustmentNote !== null
			) {
				return idempotencyConflict(
					"Stock movement idempotency key was reused with different payload",
				);
			}
			return ok(undefined);
		case "issue":
			if (
				existing.warehouseId !== input.warehouseId ||
				existing.reservationId !== (input.reservationId ?? null) ||
				existing.adjustmentReasonCode !== null ||
				existing.adjustmentNote !== null
			) {
				return idempotencyConflict(
					"Stock movement idempotency key was reused with different payload",
				);
			}
			return ok(undefined);
		case "transfer":
			if (
				existing.fromWarehouseId !== input.fromWarehouseId ||
				existing.toWarehouseId !== input.toWarehouseId ||
				existing.warehouseId !== null ||
				existing.reservationId !== null ||
				existing.adjustmentReasonCode !== null ||
				existing.adjustmentNote !== null
			) {
				return idempotencyConflict(
					"Stock movement idempotency key was reused with different payload",
				);
			}
			return ok(undefined);
		case "adjustment":
			if (
				existing.warehouseId !== input.warehouseId ||
				existing.reservationId !== null ||
				existing.adjustmentReasonCode !== input.adjustmentReasonCode ||
				existing.adjustmentNote !== (input.adjustmentNote ?? null)
			) {
				return idempotencyConflict(
					"Stock movement idempotency key was reused with different payload",
				);
			}
			return ok(undefined);
	}
}

function assertMatchingAddLineReplay(input: {
	organizationId: string;
	actorUserId: string;
	movementId: string;
	itemId: string;
	quantity: string;
	idempotencyKey: string;
	existing: StockMovementLine;
}): Result<void> {
	const matches =
		input.existing.organizationId === input.organizationId &&
		input.existing.movementId === input.movementId &&
		input.existing.itemId === input.itemId &&
		input.existing.createdBy === input.actorUserId &&
		input.existing.lineIdempotencyKey === input.idempotencyKey &&
		sameQuantity(input.existing.quantity, input.quantity);
	if (matches) {
		return ok(undefined);
	}
	return idempotencyConflict(
		"Stock movement line idempotency key was reused with different payload",
	);
}

function assertMatchingReserveReplay(input: {
	organizationId: string;
	actorUserId: string;
	code: string;
	warehouseId: string;
	itemId: string;
	quantity: string;
	idempotencyKey: string;
	existing: StockReservation;
}): Result<void> {
	const matches =
		input.existing.organizationId === input.organizationId &&
		input.existing.createdBy === input.actorUserId &&
		input.existing.code === input.code &&
		input.existing.warehouseId === input.warehouseId &&
		input.existing.itemId === input.itemId &&
		input.existing.createIdempotencyKey === input.idempotencyKey &&
		sameQuantity(input.existing.quantity, input.quantity);
	if (matches) {
		return ok(undefined);
	}
	return idempotencyConflict(
		"Stock reservation idempotency key was reused with different payload",
	);
}

function sourceRequiresEventLinkage(source: InventoryMovementSource): boolean {
	return source === "receiving" || source === "fulfillment";
}

function parseLineQuantity(
	movementType: StockMovement["movementType"],
	raw: unknown,
): Result<string> {
	const schema =
		movementType === "adjustment"
			? signedNonZeroQuantitySchema()
			: positiveQuantitySchema();
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		return inventoryFail(
			"BAD_REQUEST",
			"Invalid stock movement line quantity",
			INVENTORY_ERROR_SOURCE_REQUIRED,
			{ fieldErrors: parsed.error.flatten().fieldErrors },
		);
	}
	return ok(parsed.data);
}

function validateCreateSourcePolicy(
	input: CreateStockMovementInput,
): Result<void> {
	if (!sourceRequiresEventLinkage(input.source)) {
		return ok(undefined);
	}

	const missingFields: string[] = [];
	if (!input.sourceModule) {
		missingFields.push("sourceModule");
	}
	if (!input.sourceAggregateId) {
		missingFields.push("sourceAggregateId");
	}
	if (!input.sourceEventId) {
		missingFields.push("sourceEventId");
	}
	if (missingFields.length > 0) {
		return inventoryFail(
			"BAD_REQUEST",
			"Source movement linkage is required for receiving and fulfillment movements",
			INVENTORY_ERROR_SOURCE_REQUIRED,
			{ missingFields },
		);
	}
	return ok(undefined);
}

async function resolveWarehouseSnapshot(
	masters: ResolvedDeps["masters"],
	organizationId: string,
	warehouseId: string,
	actorUserId: string,
): Promise<Result<WarehouseSnapshot>> {
	const warehouseResult = requireMaster(
		await masters.getWarehouseById(organizationId, warehouseId, actorUserId),
		"Warehouse not found in organization",
	);
	if (!warehouseResult.ok) {
		return warehouseResult;
	}
	return ok({
		warehouseId: warehouseResult.data.id,
		warehouseCode: warehouseResult.data.code,
		warehouseName: warehouseResult.data.name,
	});
}

async function resolveItemSnapshot(
	masters: ResolvedDeps["masters"],
	organizationId: string,
	itemId: string,
	actorUserId: string,
): Promise<Result<ItemSnapshot>> {
	const itemResult = requireMaster(
		await masters.getItemById(organizationId, itemId, actorUserId),
		"Item not found in organization",
	);
	if (!itemResult.ok) {
		return itemResult;
	}

	const uomResult = requireMaster(
		await masters.getRefUomById(
			organizationId,
			itemResult.data.baseUomId,
			actorUserId,
		),
		"Base UoM not found for item",
	);
	if (!uomResult.ok) {
		return uomResult;
	}

	return ok({
		itemId: itemResult.data.id,
		itemCode: itemResult.data.code,
		itemName: itemResult.data.name,
		baseUomId: itemResult.data.baseUomId,
		baseUomCode: uomResult.data.code,
	});
}

async function resolveCreateMovementRecord(
	input: CreateStockMovementInput,
	deps: ResolvedDeps,
	code: { code: string; normalizedCode: string },
): Promise<Result<MovementCreateRecord>> {
	if (input.movementType === "transfer") {
		const fromWarehouse = await resolveWarehouseSnapshot(
			deps.masters,
			input.organizationId,
			input.fromWarehouseId,
			input.actorUserId,
		);
		if (!fromWarehouse.ok) {
			return fromWarehouse;
		}

		const toWarehouse = await resolveWarehouseSnapshot(
			deps.masters,
			input.organizationId,
			input.toWarehouseId,
			input.actorUserId,
		);
		if (!toWarehouse.ok) {
			return toWarehouse;
		}

		return ok({
			organizationId: input.organizationId,
			code: code.code,
			normalizedCode: code.normalizedCode,
			movementType: input.movementType,
			source: input.source,
			warehouseId: null,
			warehouseCode: null,
			warehouseName: null,
			fromWarehouseId: fromWarehouse.data.warehouseId,
			fromWarehouseCode: fromWarehouse.data.warehouseCode,
			fromWarehouseName: fromWarehouse.data.warehouseName,
			toWarehouseId: toWarehouse.data.warehouseId,
			toWarehouseCode: toWarehouse.data.warehouseCode,
			toWarehouseName: toWarehouse.data.warehouseName,
			reservationId: null,
			reversesMovementId: null,
			adjustmentReasonCode: null,
			adjustmentNote: null,
			sourceModule: input.sourceModule ?? null,
			sourceAggregateId: input.sourceAggregateId ?? null,
			sourceEventId: input.sourceEventId ?? null,
			sourceEventVersion: input.sourceEventVersion ?? null,
			sourceLineId: input.sourceLineId ?? null,
			createIdempotencyKey: input.idempotencyKey,
			createdBy: input.actorUserId,
		});
	}

	const warehouse = await resolveWarehouseSnapshot(
		deps.masters,
		input.organizationId,
		input.warehouseId,
		input.actorUserId,
	);
	if (!warehouse.ok) {
		return warehouse;
	}

	return ok({
		organizationId: input.organizationId,
		code: code.code,
		normalizedCode: code.normalizedCode,
		movementType: input.movementType,
		source: input.source,
		warehouseId: warehouse.data.warehouseId,
		warehouseCode: warehouse.data.warehouseCode,
		warehouseName: warehouse.data.warehouseName,
		fromWarehouseId: null,
		fromWarehouseCode: null,
		fromWarehouseName: null,
		toWarehouseId: null,
		toWarehouseCode: null,
		toWarehouseName: null,
		reservationId:
			input.movementType === "issue" ? (input.reservationId ?? null) : null,
		reversesMovementId: null,
		adjustmentReasonCode:
			input.movementType === "adjustment" ? input.adjustmentReasonCode : null,
		adjustmentNote:
			input.movementType === "adjustment"
				? (input.adjustmentNote ?? null)
				: null,
		sourceModule: input.sourceModule ?? null,
		sourceAggregateId: input.sourceAggregateId ?? null,
		sourceEventId: input.sourceEventId ?? null,
		sourceEventVersion: input.sourceEventVersion ?? null,
		sourceLineId: input.sourceLineId ?? null,
		createIdempotencyKey: input.idempotencyKey,
		createdBy: input.actorUserId,
	});
}

function requireDraftMovement(
	movement: StockMovement,
	expectedVersion: number,
): Result<void> {
	if (movement.status === "posted") {
		return inventoryFail(
			"CONFLICT",
			"Stock movement has already been posted",
			INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED,
		);
	}
	if (movement.status === "cancelled") {
		return inventoryFail(
			"CONFLICT",
			"Stock movement has already been cancelled",
			INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
		);
	}
	if (movement.version !== expectedVersion) {
		return inventoryFail(
			"CONFLICT",
			"Stock movement version conflict",
			INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT,
			{
				expectedVersion,
				actualVersion: movement.version,
			},
		);
	}
	return ok(undefined);
}

function requirePostedMovementForReversal(
	movement: StockMovement,
	expectedVersion: number,
): Result<void> {
	if (movement.status === "cancelled") {
		return inventoryFail(
			"CONFLICT",
			"Cancelled stock movements cannot be reversed",
			INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
		);
	}
	if (movement.status !== "posted") {
		return inventoryFail(
			"CONFLICT",
			"Only posted stock movements can be reversed",
			INVENTORY_ERROR_MOVEMENT_NOT_DRAFT,
		);
	}
	if (movement.version !== expectedVersion) {
		return inventoryFail(
			"CONFLICT",
			"Stock movement version conflict",
			INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT,
			{
				expectedVersion,
				actualVersion: movement.version,
			},
		);
	}
	if (movement.lines.length === 0) {
		return inventoryFail(
			"CONFLICT",
			"Cannot reverse a stock movement without lines",
			INVENTORY_ERROR_MOVEMENT_EMPTY_LINES,
		);
	}
	return ok(undefined);
}

async function requireAdjustmentPermission(
	deps: ResolvedDeps,
	organizationId: string,
	actorUserId: string,
): Promise<Result<void>> {
	if (deps.authorization === undefined) {
		return fail("UNAUTHORIZED", "Inventory authorization port is required", {
			permission: INVENTORY_PERMISSION_ADJUSTMENT_POST,
		});
	}
	const allowed = await deps.authorization.can({
		organizationId,
		actorUserId,
		permission: INVENTORY_PERMISSION_ADJUSTMENT_POST,
	});
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required inventory permission", {
			permission: INVENTORY_PERMISSION_ADJUSTMENT_POST,
		});
	}
	return ok(undefined);
}

function getReversalQuantity(
	movementType: StockMovement["movementType"],
	line: StockMovementLine,
): string {
	if (movementType !== "adjustment") {
		return line.quantity;
	}
	return formatQuantity(-parseQuantity(line.quantity));
}

function buildReversalCreateRecord(input: {
	movement: StockMovement;
	code: { code: string; normalizedCode: string };
	createIdempotencyKey: string;
	sourceEventId: string;
	actorUserId: string;
}): Result<MovementCreateRecord> {
	const { movement } = input;

	switch (movement.movementType) {
		case "receipt": {
			if (
				movement.warehouseId === null ||
				movement.warehouseCode === null ||
				movement.warehouseName === null
			) {
				return inventoryFail(
					"CONFLICT",
					"Receipt movement is missing warehouse data required for reversal",
					INVENTORY_ERROR_SOURCE_REQUIRED,
				);
			}
			return ok({
				organizationId: movement.organizationId,
				code: input.code.code,
				normalizedCode: input.code.normalizedCode,
				movementType: "issue",
				source: movement.source,
				warehouseId: movement.warehouseId,
				warehouseCode: movement.warehouseCode,
				warehouseName: movement.warehouseName,
				fromWarehouseId: null,
				fromWarehouseCode: null,
				fromWarehouseName: null,
				toWarehouseId: null,
				toWarehouseCode: null,
				toWarehouseName: null,
				reservationId: null,
				reversesMovementId: movement.id,
				adjustmentReasonCode: null,
				adjustmentNote: null,
				sourceModule: movement.sourceModule,
				sourceAggregateId: movement.sourceAggregateId,
				sourceEventId: sourceRequiresEventLinkage(movement.source)
					? input.sourceEventId
					: movement.sourceEventId,
				sourceEventVersion: movement.sourceEventVersion,
				sourceLineId: movement.sourceLineId,
				createIdempotencyKey: input.createIdempotencyKey,
				createdBy: input.actorUserId,
			});
		}
		case "issue": {
			if (
				movement.warehouseId === null ||
				movement.warehouseCode === null ||
				movement.warehouseName === null
			) {
				return inventoryFail(
					"CONFLICT",
					"Issue movement is missing warehouse data required for reversal",
					INVENTORY_ERROR_SOURCE_REQUIRED,
				);
			}
			return ok({
				organizationId: movement.organizationId,
				code: input.code.code,
				normalizedCode: input.code.normalizedCode,
				movementType: "receipt",
				source: movement.source,
				warehouseId: movement.warehouseId,
				warehouseCode: movement.warehouseCode,
				warehouseName: movement.warehouseName,
				fromWarehouseId: null,
				fromWarehouseCode: null,
				fromWarehouseName: null,
				toWarehouseId: null,
				toWarehouseCode: null,
				toWarehouseName: null,
				reservationId: null,
				reversesMovementId: movement.id,
				adjustmentReasonCode: null,
				adjustmentNote: null,
				sourceModule: movement.sourceModule,
				sourceAggregateId: movement.sourceAggregateId,
				sourceEventId: sourceRequiresEventLinkage(movement.source)
					? input.sourceEventId
					: movement.sourceEventId,
				sourceEventVersion: movement.sourceEventVersion,
				sourceLineId: movement.sourceLineId,
				createIdempotencyKey: input.createIdempotencyKey,
				createdBy: input.actorUserId,
			});
		}
		case "transfer": {
			if (
				movement.fromWarehouseId === null ||
				movement.fromWarehouseCode === null ||
				movement.fromWarehouseName === null ||
				movement.toWarehouseId === null ||
				movement.toWarehouseCode === null ||
				movement.toWarehouseName === null
			) {
				return inventoryFail(
					"CONFLICT",
					"Transfer movement is missing warehouse data required for reversal",
					INVENTORY_ERROR_INVALID_TRANSFER,
				);
			}
			return ok({
				organizationId: movement.organizationId,
				code: input.code.code,
				normalizedCode: input.code.normalizedCode,
				movementType: "transfer",
				source: movement.source,
				warehouseId: null,
				warehouseCode: null,
				warehouseName: null,
				fromWarehouseId: movement.toWarehouseId,
				fromWarehouseCode: movement.toWarehouseCode,
				fromWarehouseName: movement.toWarehouseName,
				toWarehouseId: movement.fromWarehouseId,
				toWarehouseCode: movement.fromWarehouseCode,
				toWarehouseName: movement.fromWarehouseName,
				reservationId: null,
				reversesMovementId: movement.id,
				adjustmentReasonCode: null,
				adjustmentNote: null,
				sourceModule: movement.sourceModule,
				sourceAggregateId: movement.sourceAggregateId,
				sourceEventId: movement.sourceEventId,
				sourceEventVersion: movement.sourceEventVersion,
				sourceLineId: movement.sourceLineId,
				createIdempotencyKey: input.createIdempotencyKey,
				createdBy: input.actorUserId,
			});
		}
		case "adjustment": {
			if (
				movement.warehouseId === null ||
				movement.warehouseCode === null ||
				movement.warehouseName === null
			) {
				return inventoryFail(
					"CONFLICT",
					"Adjustment movement is missing warehouse data required for reversal",
					INVENTORY_ERROR_SOURCE_REQUIRED,
				);
			}
			return ok({
				organizationId: movement.organizationId,
				code: input.code.code,
				normalizedCode: input.code.normalizedCode,
				movementType: "adjustment",
				source: movement.source,
				warehouseId: movement.warehouseId,
				warehouseCode: movement.warehouseCode,
				warehouseName: movement.warehouseName,
				fromWarehouseId: null,
				fromWarehouseCode: null,
				fromWarehouseName: null,
				toWarehouseId: null,
				toWarehouseCode: null,
				toWarehouseName: null,
				reservationId: null,
				reversesMovementId: movement.id,
				adjustmentReasonCode: movement.adjustmentReasonCode,
				adjustmentNote: movement.adjustmentNote,
				sourceModule: movement.sourceModule,
				sourceAggregateId: movement.sourceAggregateId,
				sourceEventId: movement.sourceEventId,
				sourceEventVersion: movement.sourceEventVersion,
				sourceLineId: movement.sourceLineId,
				createIdempotencyKey: input.createIdempotencyKey,
				createdBy: input.actorUserId,
			});
		}
		default: {
			const exhaustive: never = movement.movementType;
			return inventoryFail(
				"CONFLICT",
				`Unsupported stock movement type for reversal: ${exhaustive}`,
				INVENTORY_ERROR_SOURCE_REQUIRED,
			);
		}
	}
}

export async function createStockMovement(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		createStockMovementInputSchema,
		input,
		"Invalid stock movement create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	if (parsed.data.source === "manual_adjustment") {
		const adjustmentAuthorized = await requireAdjustmentPermission(
			deps,
			parsed.data.organizationId,
			parsed.data.actorUserId,
		);
		if (!adjustmentAuthorized.ok) {
			return adjustmentAuthorized;
		}
	}

	const sourcePolicy = validateCreateSourcePolicy(parsed.data);
	if (!sourcePolicy.ok) {
		return sourcePolicy;
	}

	const existing = await deps.store.getMovementByCreateIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data !== null) {
		const replay = assertMatchingCreateReplay(existing.data, parsed.data);
		if (!replay.ok) {
			return replay;
		}
		return ok(existing.data);
	}

	const code = normalizeMovementCode(parsed.data.code);
	if (!code.ok) {
		return code;
	}

	const record = await resolveCreateMovementRecord(
		parsed.data,
		deps,
		code.data,
	);
	if (!record.ok) {
		return record;
	}

	const created = await deps.store.createMovement(record.data, deps.ports, {
		correlationId: parsed.data.correlationId,
	});
	return annotateCreateMovementFailure(created);
}

export async function addStockMovementLine(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovementLine>> {
	const parsed = parseInventoryInput(
		addStockMovementLineInputSchema,
		input,
		"Invalid stock movement line input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_LINE_ADD,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const movementResult = await deps.store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!movementResult.ok) {
		return movementResult;
	}
	if (movementResult.data === null) {
		return inventoryFail(
			"NOT_FOUND",
			"Stock movement not found",
			INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
		);
	}

	const draftCheck = requireDraftMovement(
		movementResult.data,
		parsed.data.expectedVersion,
	);
	if (!draftCheck.ok) {
		return draftCheck;
	}

	const quantityResult = parseLineQuantity(
		movementResult.data.movementType,
		parsed.data.quantity,
	);
	if (!quantityResult.ok) {
		return quantityResult;
	}

	const existingLine = movementResult.data.lines.find(
		(line) => line.lineIdempotencyKey === parsed.data.idempotencyKey,
	);
	if (existingLine !== undefined) {
		const replay = assertMatchingAddLineReplay({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			movementId: parsed.data.movementId,
			itemId: parsed.data.itemId,
			quantity: quantityResult.data,
			idempotencyKey: parsed.data.idempotencyKey,
			existing: existingLine,
		});
		if (!replay.ok) {
			return replay;
		}
		return ok(existingLine);
	}

	const itemSnapshot = await resolveItemSnapshot(
		deps.masters,
		parsed.data.organizationId,
		parsed.data.itemId,
		parsed.data.actorUserId,
	);
	if (!itemSnapshot.ok) {
		return itemSnapshot;
	}

	return deps.store.addLine(
		{
			organizationId: parsed.data.organizationId,
			movementId: parsed.data.movementId,
			itemId: itemSnapshot.data.itemId,
			itemCode: itemSnapshot.data.itemCode,
			itemName: itemSnapshot.data.itemName,
			baseUomId: itemSnapshot.data.baseUomId,
			baseUomCode: itemSnapshot.data.baseUomCode,
			quantity: quantityResult.data,
			lineIdempotencyKey: parsed.data.idempotencyKey,
			expectedVersion: parsed.data.expectedVersion,
			createdBy: parsed.data.actorUserId,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postStockMovement(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		postStockMovementInputSchema,
		input,
		"Invalid stock movement post input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_POST,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const movementResult = await deps.store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!movementResult.ok) {
		return movementResult;
	}
	if (movementResult.data === null) {
		return inventoryFail(
			"NOT_FOUND",
			"Stock movement not found",
			INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
		);
	}

	if (movementResult.data.status === "posted") {
		if (movementResult.data.postIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(movementResult.data);
		}
		return inventoryFail(
			"CONFLICT",
			"Stock movement has already been posted",
			INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED,
		);
	}

	if (movementResult.data.status === "cancelled") {
		if (movementResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(movementResult.data);
		}
		return inventoryFail(
			"CONFLICT",
			"Stock movement has already been cancelled",
			INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
		);
	}

	const draftCheck = requireDraftMovement(
		movementResult.data,
		parsed.data.expectedVersion,
	);
	if (!draftCheck.ok) {
		return draftCheck;
	}
	if (movementResult.data.lines.length === 0) {
		return inventoryFail(
			"CONFLICT",
			"Cannot post stock movement without lines",
			INVENTORY_ERROR_MOVEMENT_EMPTY_LINES,
		);
	}

	const posted = await deps.store.postMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: parsed.data.movementId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			postIdempotencyKey: parsed.data.idempotencyKey,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
	return annotateAvailabilityFailure(posted);
}

export async function cancelStockMovement(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		cancelStockMovementInputSchema,
		input,
		"Invalid stock movement cancel input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_CANCEL,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const movementResult = await deps.store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!movementResult.ok) {
		return movementResult;
	}
	if (movementResult.data === null) {
		return inventoryFail(
			"NOT_FOUND",
			"Stock movement not found",
			INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
		);
	}

	if (movementResult.data.status === "cancelled") {
		if (movementResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(movementResult.data);
		}
		return inventoryFail(
			"CONFLICT",
			"Stock movement has already been cancelled",
			INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
		);
	}

	const draftCheck = requireDraftMovement(
		movementResult.data,
		parsed.data.expectedVersion,
	);
	if (!draftCheck.ok) {
		return draftCheck;
	}

	return deps.store.cancelMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: parsed.data.movementId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			cancelIdempotencyKey: parsed.data.idempotencyKey,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function createReversalMovement(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		createReversalMovementInputSchema,
		input,
		"Invalid stock movement reversal input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_REVERSE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const originalResult = await deps.store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!originalResult.ok) {
		return originalResult;
	}
	if (originalResult.data === null) {
		return inventoryFail(
			"NOT_FOUND",
			"Stock movement not found",
			INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
		);
	}

	const original = originalResult.data;
	const reversalReady = requirePostedMovementForReversal(
		original,
		parsed.data.expectedVersion,
	);
	if (!reversalReady.ok) {
		return reversalReady;
	}

	if (original.source === "manual_adjustment") {
		const adjustmentAuthorized = await requireAdjustmentPermission(
			deps,
			parsed.data.organizationId,
			parsed.data.actorUserId,
		);
		if (!adjustmentAuthorized.ok) {
			return adjustmentAuthorized;
		}
	}

	const code = normalizeMovementCode(parsed.data.code);
	if (!code.ok) {
		return code;
	}

	const createIdempotencyKey = deriveIdempotencyKey(
		parsed.data.idempotencyKey,
		"create",
	);
	const postIdempotencyKey = deriveIdempotencyKey(
		parsed.data.idempotencyKey,
		"post",
	);
	const sourceEventId = deriveIdempotencyKey(
		parsed.data.idempotencyKey,
		"reversal",
	);

	const createRecord = buildReversalCreateRecord({
		movement: original,
		code: code.data,
		createIdempotencyKey,
		sourceEventId,
		actorUserId: parsed.data.actorUserId,
	});
	if (!createRecord.ok) {
		return createRecord;
	}

	const created = await deps.store.createMovement(
		createRecord.data,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
		},
	);
	if (!created.ok) {
		return annotateCreateMovementFailure(created);
	}

	let currentMovement = created.data;
	for (const line of original.lines) {
		const added = await deps.store.addLine(
			{
				organizationId: parsed.data.organizationId,
				movementId: currentMovement.id,
				itemId: line.itemId,
				itemCode: line.itemCode,
				itemName: line.itemName,
				baseUomId: line.baseUomId,
				baseUomCode: line.baseUomCode,
				quantity: getReversalQuantity(original.movementType, line),
				lineIdempotencyKey: deriveIdempotencyKey(
					parsed.data.idempotencyKey,
					`line-${line.lineNo}`,
				),
				expectedVersion: currentMovement.version,
				createdBy: parsed.data.actorUserId,
			},
			deps.ports,
			{ correlationId: parsed.data.correlationId },
		);
		if (!added.ok) {
			return added;
		}

		const reloaded = await deps.store.getMovementById(
			parsed.data.organizationId,
			currentMovement.id,
		);
		if (!reloaded.ok) {
			return reloaded;
		}
		if (reloaded.data === null) {
			return inventoryFail(
				"INTERNAL_ERROR",
				"Reversal stock movement disappeared after line create",
				INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
			);
		}
		currentMovement = reloaded.data;
	}

	const posted = await deps.store.postMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: currentMovement.id,
			expectedVersion: currentMovement.version,
			actorUserId: parsed.data.actorUserId,
			postIdempotencyKey,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
	if (!posted.ok) {
		return posted;
	}

	return ok(posted.data);
}

export async function reserveStock(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	const parsed = parseInventoryInput(
		reserveStockInputSchema,
		input,
		"Invalid reserve stock input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: INVENTORY_COMMAND_RESERVE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const existing = await deps.store.getReservationByCreateIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data !== null) {
		const replay = assertMatchingReserveReplay({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			code: parsed.data.code,
			warehouseId: parsed.data.warehouseId,
			itemId: parsed.data.itemId,
			quantity: parsed.data.quantity,
			idempotencyKey: parsed.data.idempotencyKey,
			existing: existing.data,
		});
		if (!replay.ok) {
			return replay;
		}
		return ok(existing.data);
	}

	const code = normalizeMovementCode(parsed.data.code);
	if (!code.ok) {
		return code;
	}

	const warehouse = await resolveWarehouseSnapshot(
		deps.masters,
		parsed.data.organizationId,
		parsed.data.warehouseId,
		parsed.data.actorUserId,
	);
	if (!warehouse.ok) {
		return warehouse;
	}

	const item = await resolveItemSnapshot(
		deps.masters,
		parsed.data.organizationId,
		parsed.data.itemId,
		parsed.data.actorUserId,
	);
	if (!item.ok) {
		return item;
	}

	const reserved = await deps.store.reserveStock(
		{
			organizationId: parsed.data.organizationId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			warehouseId: warehouse.data.warehouseId,
			warehouseCode: warehouse.data.warehouseCode,
			warehouseName: warehouse.data.warehouseName,
			itemId: item.data.itemId,
			itemCode: item.data.itemCode,
			itemName: item.data.itemName,
			baseUomId: item.data.baseUomId,
			baseUomCode: item.data.baseUomCode,
			quantity: parsed.data.quantity,
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
	return annotateAvailabilityFailure(reserved);
}

async function terminateReservationCommand(
	input: unknown,
	options: InventoryCommandOptions,
	args: {
		invalidMessage: string;
		command: InventoryCommandId;
		terminalStatus: ReservationTerminalStatus;
	},
): Promise<Result<StockReservation>> {
	const parsed = parseInventoryInput(
		releaseReservationInputSchema,
		input,
		args.invalidMessage,
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: args.command,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const reservationResult = await deps.store.getReservationById(
		parsed.data.organizationId,
		parsed.data.reservationId,
	);
	if (!reservationResult.ok) {
		return reservationResult;
	}
	if (reservationResult.data === null) {
		return inventoryFail(
			"NOT_FOUND",
			"Stock reservation not found",
			INVENTORY_ERROR_RESERVATION_NOT_FOUND,
		);
	}

	const reservation = reservationResult.data;
	if (reservation.status === args.terminalStatus) {
		if (reservation.releaseIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(reservation);
		}
		return inventoryFail(
			"CONFLICT",
			"Stock reservation has already been terminated",
			INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED,
		);
	}
	if (reservation.version !== parsed.data.expectedVersion) {
		return inventoryFail(
			"CONFLICT",
			"Stock reservation version conflict",
			INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT,
			{
				expectedVersion: parsed.data.expectedVersion,
				actualVersion: reservation.version,
			},
		);
	}
	if (
		reservation.status === "expired" ||
		reservation.status === "cancelled" ||
		reservation.status === "consumed" ||
		reservation.status === "released"
	) {
		return inventoryFail(
			"CONFLICT",
			"Stock reservation has already been terminated",
			INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED,
		);
	}

	return deps.store.releaseReservation(
		{
			organizationId: parsed.data.organizationId,
			reservationId: parsed.data.reservationId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			releaseIdempotencyKey: parsed.data.idempotencyKey,
			terminalStatus: args.terminalStatus,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function releaseReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	return terminateReservationCommand(input, options, {
		invalidMessage: "Invalid release reservation input",
		command: INVENTORY_COMMAND_RELEASE,
		terminalStatus: "released",
	});
}

export async function expireReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	return terminateReservationCommand(input, options, {
		invalidMessage: "Invalid expire reservation input",
		command: INVENTORY_COMMAND_EXPIRE,
		terminalStatus: "expired",
	});
}

export async function cancelReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	return terminateReservationCommand(input, options, {
		invalidMessage: "Invalid cancel reservation input",
		command: INVENTORY_COMMAND_CANCEL_RESERVATION,
		terminalStatus: "cancelled",
	});
}

export async function getStockMovementById(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement | null>> {
	const parsed = parseInventoryInput(
		getStockMovementByIdInputSchema,
		input,
		"Invalid stock movement get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return deps.store.getMovementById(parsed.data.organizationId, parsed.data.id);
}

export async function listStockMovements(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement[]>> {
	const parsed = parseInventoryInput(
		listStockMovementsInputSchema,
		input,
		"Invalid stock movement list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return deps.store.listMovements({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		movementType: parsed.data.movementType,
	});
}

export async function listStockReservations(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation[]>> {
	const parsed = parseInventoryInput(
		listStockReservationsInputSchema,
		input,
		"Invalid stock reservation list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_RESERVATION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return deps.store.listReservations({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		warehouseId: parsed.data.warehouseId,
		itemId: parsed.data.itemId,
	});
}

export async function getStockAvailability(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockAvailability[]>> {
	const parsed = parseInventoryInput(
		getStockAvailabilityInputSchema,
		input,
		"Invalid stock availability input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const deps = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_AVAILABILITY,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return deps.store.getAvailability({
		organizationId: parsed.data.organizationId,
		warehouseId: parsed.data.warehouseId,
		itemId: parsed.data.itemId,
	});
}
