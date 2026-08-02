import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	requireInventoryCommandPermission,
	requireInventoryQueryPermission,
} from "./authorization";
import {
	type InventoryCommandOptions,
	resolveCommandDeps,
} from "./command-options";
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
	INVENTORY_QUERY_AVAILABILITY,
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_LIST,
	INVENTORY_QUERY_RESERVATION_LIST,
	type InventoryCommandId,
} from "./operation-registry";
import { parseInventoryInput } from "./parse-input";
import { INVENTORY_PERMISSION_ADJUSTMENT_POST } from "./permissions";
import { runSequentiallyUntil } from "./resolve-async";
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

type ResolvedDeps = ReturnType<typeof resolveCommandDeps>;
type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

interface WarehouseSnapshot {
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}

interface ItemSnapshot {
	baseUomCode: string;
	baseUomId: string;
	itemCode: string;
	itemId: string;
	itemName: string;
}

function annotateCreateMovementFailure(
	result: Result<StockMovement>,
): Result<StockMovement> {
	return result;
}

function annotateAvailabilityFailure<T>(result: Result<T>): Result<T> {
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

function idempotencyConflict(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

function sameQuantity(left: string, right: string): boolean {
	return parseQuantity(left) === parseQuantity(right);
}

interface CreateReplayVariant {
	adjustmentNote: string | null;
	adjustmentReasonCode: string | null;
	fromWarehouseId: string | null;
	reservationId: string | null;
	toWarehouseId: string | null;
	warehouseId: string | null;
}

function inputCreateReplayVariant(
	input: CreateStockMovementInput,
): CreateReplayVariant {
	if ("fromWarehouseId" in input) {
		return {
			adjustmentNote: null,
			adjustmentReasonCode: null,
			fromWarehouseId: input.fromWarehouseId ?? null,
			reservationId: null,
			toWarehouseId: input.toWarehouseId ?? null,
			warehouseId: null,
		};
	}
	return {
		adjustmentNote:
			"adjustmentNote" in input ? (input.adjustmentNote ?? null) : null,
		adjustmentReasonCode:
			"adjustmentReasonCode" in input
				? (input.adjustmentReasonCode ?? null)
				: null,
		fromWarehouseId: null,
		reservationId:
			"reservationId" in input ? (input.reservationId ?? null) : null,
		toWarehouseId: null,
		warehouseId: input.warehouseId ?? null,
	};
}

function movementCreateReplayVariant(
	existing: StockMovement,
): CreateReplayVariant {
	return {
		adjustmentNote: existing.adjustmentNote,
		adjustmentReasonCode: existing.adjustmentReasonCode,
		fromWarehouseId: existing.fromWarehouseId,
		reservationId: existing.reservationId,
		toWarehouseId: existing.toWarehouseId,
		warehouseId: existing.warehouseId,
	};
}

function matchesCreateReplayVariant(
	existing: CreateReplayVariant,
	expected: CreateReplayVariant,
): boolean {
	return (
		existing.adjustmentNote === expected.adjustmentNote &&
		existing.adjustmentReasonCode === expected.adjustmentReasonCode &&
		existing.fromWarehouseId === expected.fromWarehouseId &&
		existing.reservationId === expected.reservationId &&
		existing.toWarehouseId === expected.toWarehouseId &&
		existing.warehouseId === expected.warehouseId
	);
}

function assertMatchingCreateReplay(
	existing: StockMovement,
	input: CreateStockMovementInput,
): Result<void> {
	const matchesCommonFields =
		existing.movementType === input.movementType &&
		existing.organizationId === input.organizationId &&
		existing.createdBy === input.actorUserId &&
		existing.code === input.code &&
		existing.source === input.source &&
		existing.createIdempotencyKey === input.idempotencyKey &&
		existing.sourceModule === (input.sourceModule ?? null) &&
		existing.sourceAggregateId === (input.sourceAggregateId ?? null) &&
		existing.sourceEventId === (input.sourceEventId ?? null) &&
		existing.sourceEventVersion === (input.sourceEventVersion ?? null) &&
		existing.sourceLineId === (input.sourceLineId ?? null);
	const matchesVariant = matchesCreateReplayVariant(
		movementCreateReplayVariant(existing),
		inputCreateReplayVariant(input),
	);
	if (!(matchesCommonFields && matchesVariant)) {
		return idempotencyConflict(
			"Stock movement idempotency key was reused with different payload",
		);
	}
	return errorResult.ok(undefined);
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
		return errorResult.ok(undefined);
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
		return errorResult.ok(undefined);
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Invalid stock movement line quantity",
		});
	}
	return errorResult.ok(parsed.data);
}

function validateCreateSourcePolicy(
	input: CreateStockMovementInput,
): Result<void> {
	if (!sourceRequiresEventLinkage(input.source)) {
		return errorResult.ok(undefined);
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage:
				"Source movement linkage is required for receiving and fulfillment movements",
		});
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok({
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

	return errorResult.ok({
		itemId: itemResult.data.id,
		itemCode: itemResult.data.code,
		itemName: itemResult.data.name,
		baseUomId: itemResult.data.baseUomId,
		baseUomCode: uomResult.data.code,
	});
}

type WarehouseMovementInput = Exclude<
	CreateStockMovementInput,
	{ movementType: "transfer" }
>;

function warehouseMovementVariantFields(input: WarehouseMovementInput): {
	adjustmentNote: string | null;
	adjustmentReasonCode: string | null;
	reservationId: string | null;
} {
	return {
		adjustmentNote:
			"adjustmentNote" in input ? (input.adjustmentNote ?? null) : null,
		adjustmentReasonCode:
			"adjustmentReasonCode" in input
				? (input.adjustmentReasonCode ?? null)
				: null,
		reservationId:
			"reservationId" in input ? (input.reservationId ?? null) : null,
	};
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

		return errorResult.ok({
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
	const variantFields = warehouseMovementVariantFields(input);

	return errorResult.ok({
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
		reservationId: variantFields.reservationId,
		reversesMovementId: null,
		adjustmentReasonCode: variantFields.adjustmentReasonCode,
		adjustmentNote: variantFields.adjustmentNote,
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
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement has already been posted",
		});
	}
	if (movement.status === "cancelled") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement has already been cancelled",
		});
	}
	if (movement.version !== expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement version conflict",
		});
	}
	return errorResult.ok(undefined);
}

function requirePostedMovementForReversal(
	movement: StockMovement,
	expectedVersion: number,
): Result<void> {
	if (movement.status === "cancelled") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cancelled stock movements cannot be reversed",
		});
	}
	if (movement.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Only posted stock movements can be reversed",
		});
	}
	if (movement.version !== expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement version conflict",
		});
	}
	if (movement.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot reverse a stock movement without lines",
		});
	}
	return errorResult.ok(undefined);
}

async function requireAdjustmentPermission(
	deps: ResolvedDeps,
	organizationId: string,
	actorUserId: string,
): Promise<Result<void>> {
	if (deps.authorization === undefined) {
		return errorResult.fail("UNAUTHORIZED");
	}
	const allowed = await deps.authorization.can({
		organizationId,
		actorUserId,
		permission: INVENTORY_PERMISSION_ADJUSTMENT_POST,
	});
	if (!allowed) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
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
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Receipt movement is missing warehouse data required for reversal",
				});
			}
			return errorResult.ok({
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
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Issue movement is missing warehouse data required for reversal",
				});
			}
			return errorResult.ok({
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
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Transfer movement is missing warehouse data required for reversal",
				});
			}
			return errorResult.ok({
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
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Adjustment movement is missing warehouse data required for reversal",
				});
			}
			return errorResult.ok({
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
			const _exhaustive: never = movement.movementType;
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			});
		}
	}
}

async function addReversalLines(input: {
	actorUserId: string;
	correlationId: string;
	deps: ResolvedDeps;
	idempotencyKey: string;
	movement: StockMovement;
	original: StockMovement;
}): Promise<Result<StockMovement>> {
	let currentMovement = input.movement;
	const terminal = await runSequentiallyUntil<
		StockMovementLine,
		Result<StockMovement>
	>(input.original.lines, async (line) => {
		const added = await input.deps.store.addLine(
			{
				organizationId: input.original.organizationId,
				movementId: currentMovement.id,
				itemId: line.itemId,
				itemCode: line.itemCode,
				itemName: line.itemName,
				baseUomId: line.baseUomId,
				baseUomCode: line.baseUomCode,
				quantity: getReversalQuantity(input.original.movementType, line),
				lineIdempotencyKey: deriveIdempotencyKey(
					input.idempotencyKey,
					`line-${line.lineNo}`,
				),
				expectedVersion: currentMovement.version,
				createdBy: input.actorUserId,
			},
			input.deps.ports,
			{ correlationId: input.correlationId },
		);
		if (!added.ok) {
			return added;
		}

		const reloaded = await input.deps.store.getMovementById(
			input.original.organizationId,
			currentMovement.id,
		);
		if (!reloaded.ok) {
			return reloaded;
		}
		if (reloaded.data === null) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		currentMovement = reloaded.data;
	});
	return terminal ?? errorResult.ok(currentMovement);
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
		return errorResult.ok(existing.data);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Stock movement not found",
		});
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
		return errorResult.ok(existingLine);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Stock movement not found",
		});
	}

	if (movementResult.data.status === "posted") {
		if (movementResult.data.postIdempotencyKey === parsed.data.idempotencyKey) {
			return errorResult.ok(movementResult.data);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement has already been posted",
		});
	}

	if (movementResult.data.status === "cancelled") {
		if (
			movementResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey
		) {
			return errorResult.ok(movementResult.data);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement has already been cancelled",
		});
	}

	const draftCheck = requireDraftMovement(
		movementResult.data,
		parsed.data.expectedVersion,
	);
	if (!draftCheck.ok) {
		return draftCheck;
	}
	if (movementResult.data.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post stock movement without lines",
		});
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Stock movement not found",
		});
	}

	if (movementResult.data.status === "cancelled") {
		if (
			movementResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey
		) {
			return errorResult.ok(movementResult.data);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock movement has already been cancelled",
		});
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Stock movement not found",
		});
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

	const reversalLines = await addReversalLines({
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		deps,
		idempotencyKey: parsed.data.idempotencyKey,
		movement: created.data,
		original,
	});
	if (!reversalLines.ok) {
		return reversalLines;
	}
	const currentMovement = reversalLines.data;

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

	return errorResult.ok(posted.data);
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
		return errorResult.ok(existing.data);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Stock reservation not found",
		});
	}

	const reservation = reservationResult.data;
	if (reservation.status === args.terminalStatus) {
		if (reservation.releaseIdempotencyKey === parsed.data.idempotencyKey) {
			return errorResult.ok(reservation);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock reservation has already been terminated",
		});
	}
	if (reservation.version !== parsed.data.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock reservation version conflict",
		});
	}
	if (
		reservation.status === "expired" ||
		reservation.status === "cancelled" ||
		reservation.status === "consumed" ||
		reservation.status === "released"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Stock reservation has already been terminated",
		});
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

export function releaseReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	return terminateReservationCommand(input, options, {
		invalidMessage: "Invalid release reservation input",
		command: INVENTORY_COMMAND_RELEASE,
		terminalStatus: "released",
	});
}

export function expireReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockReservation>> {
	return terminateReservationCommand(input, options, {
		invalidMessage: "Invalid expire reservation input",
		command: INVENTORY_COMMAND_EXPIRE,
		terminalStatus: "expired",
	});
}

export function cancelReservation(
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
