import { fail, ok, type Result } from "@afenda/errors/result";

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
	INVENTORY_COMMAND_CREATE,
	INVENTORY_COMMAND_LINE_ADD,
	INVENTORY_COMMAND_POST,
	INVENTORY_COMMAND_RELEASE,
	INVENTORY_COMMAND_RESERVE,
	INVENTORY_QUERY_AVAILABILITY,
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_LIST,
} from "./module-ids";
import { parseInventoryInput } from "./parse-input";
import {
	addStockMovementLineInputSchema,
	createStockMovementInputSchema,
	getStockAvailabilityInputSchema,
	getStockMovementByIdInputSchema,
	listStockMovementsInputSchema,
	positiveQuantitySchema,
	postStockMovementInputSchema,
	releaseReservationInputSchema,
	reserveStockInputSchema,
	signedNonZeroQuantitySchema,
} from "./schemas";
import { normalizeMovementCode } from "./shared/code";
import type { StockBalance, StockMovement, StockMovementLine } from "./types";

async function resolveWarehouseSnapshot(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	warehouseId: string,
	actorUserId: string,
): Promise<
	Result<{ warehouseId: string; warehouseCode: string; warehouseName: string }>
> {
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
		return fail("BAD_REQUEST", "Invalid stock movement line quantity", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return ok(parsed.data);
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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: INVENTORY_COMMAND_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMovementCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}

	let warehouseId: string | null = null;
	let warehouseCode: string | null = null;
	let warehouseName: string | null = null;
	let fromWarehouseId: string | null = null;
	let fromWarehouseCode: string | null = null;
	let fromWarehouseName: string | null = null;
	let toWarehouseId: string | null = null;
	let toWarehouseCode: string | null = null;
	let toWarehouseName: string | null = null;

	if (parsed.data.movementType === "transfer") {
		const fromId = parsed.data.fromWarehouseId;
		const toId = parsed.data.toWarehouseId;
		if (fromId === undefined || toId === undefined) {
			return fail("BAD_REQUEST", "Transfer requires from and to warehouses");
		}
		const fromSnap = await resolveWarehouseSnapshot(
			masters,
			parsed.data.organizationId,
			fromId,
			parsed.data.actorUserId,
		);
		if (!fromSnap.ok) {
			return fromSnap;
		}
		const toSnap = await resolveWarehouseSnapshot(
			masters,
			parsed.data.organizationId,
			toId,
			parsed.data.actorUserId,
		);
		if (!toSnap.ok) {
			return toSnap;
		}
		fromWarehouseId = fromSnap.data.warehouseId;
		fromWarehouseCode = fromSnap.data.warehouseCode;
		fromWarehouseName = fromSnap.data.warehouseName;
		toWarehouseId = toSnap.data.warehouseId;
		toWarehouseCode = toSnap.data.warehouseCode;
		toWarehouseName = toSnap.data.warehouseName;
	} else {
		const whId = parsed.data.warehouseId;
		if (whId === undefined) {
			return fail("BAD_REQUEST", "warehouseId is required");
		}
		const snap = await resolveWarehouseSnapshot(
			masters,
			parsed.data.organizationId,
			whId,
			parsed.data.actorUserId,
		);
		if (!snap.ok) {
			return snap;
		}
		warehouseId = snap.data.warehouseId;
		warehouseCode = snap.data.warehouseCode;
		warehouseName = snap.data.warehouseName;
	}

	if (
		parsed.data.movementType === "reservation_release" &&
		parsed.data.reservationId !== undefined
	) {
		const reservation = await store.getReservationById(
			parsed.data.organizationId,
			parsed.data.reservationId,
		);
		if (!reservation.ok) {
			return reservation;
		}
		if (reservation.data === null) {
			return fail("NOT_FOUND", "Stock reservation not found");
		}
	}

	return store.createMovement(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			movementType: parsed.data.movementType,
			warehouseId,
			warehouseCode,
			warehouseName,
			fromWarehouseId,
			fromWarehouseCode,
			fromWarehouseName,
			toWarehouseId,
			toWarehouseCode,
			toWarehouseName,
			reservationId: parsed.data.reservationId ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: INVENTORY_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const movementResult = await store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!movementResult.ok) {
		return movementResult;
	}
	if (movementResult.data === null) {
		return fail("NOT_FOUND", "Stock movement not found");
	}
	if (movementResult.data.status !== "draft") {
		return fail("CONFLICT", "Cannot add lines to a non-draft stock movement");
	}

	const quantityResult = parseLineQuantity(
		movementResult.data.movementType,
		parsed.data.quantity,
	);
	if (!quantityResult.ok) {
		return quantityResult;
	}

	const itemResult = requireMaster(
		await masters.getItemById(
			parsed.data.organizationId,
			parsed.data.itemId,
			parsed.data.actorUserId,
		),
		"Item not found in organization",
	);
	if (!itemResult.ok) {
		return itemResult;
	}
	const item = itemResult.data;

	const uomResult = requireMaster(
		await masters.getRefUomById(item.baseUomId),
		"Base UoM not found for item",
	);
	if (!uomResult.ok) {
		return uomResult;
	}

	return store.addLine(
		{
			organizationId: parsed.data.organizationId,
			movementId: parsed.data.movementId,
			itemId: item.id,
			itemCode: item.code,
			itemName: item.name,
			baseUomId: item.baseUomId,
			baseUomCode: uomResult.data.code,
			quantity: quantityResult.data,
			createdBy: parsed.data.actorUserId,
		},
		ports,
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
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: INVENTORY_COMMAND_POST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const movementResult = await store.getMovementById(
		parsed.data.organizationId,
		parsed.data.movementId,
	);
	if (!movementResult.ok) {
		return movementResult;
	}
	if (movementResult.data === null) {
		return fail("NOT_FOUND", "Stock movement not found");
	}
	if (movementResult.data.status !== "draft") {
		return fail("CONFLICT", "Stock movement is not in draft status");
	}
	if (movementResult.data.lines.length === 0) {
		return fail("CONFLICT", "Cannot post stock movement without lines");
	}

	return store.postMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: parsed.data.movementId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function reserveStock(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		reserveStockInputSchema,
		input,
		"Invalid reserve stock input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: INVENTORY_COMMAND_RESERVE,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const created = await createStockMovement(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
			code: parsed.data.code,
			movementType: "reservation",
			warehouseId: parsed.data.warehouseId,
		},
		{ store, ports, masters, authorization },
	);
	if (!created.ok) {
		return created;
	}

	const line = await addStockMovementLine(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
			movementId: created.data.id,
			itemId: parsed.data.itemId,
			quantity: parsed.data.quantity,
		},
		{ store, ports, masters, authorization },
	);
	if (!line.ok) {
		return line;
	}

	const reloaded = await store.getMovementById(
		parsed.data.organizationId,
		created.data.id,
	);
	if (!reloaded.ok) {
		return reloaded;
	}
	if (reloaded.data === null) {
		return fail("INTERNAL_ERROR", "Reservation movement missing after create");
	}

	return store.postMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: created.data.id,
			expectedVersion: reloaded.data.version,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function releaseReservation(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockMovement>> {
	const parsed = parseInventoryInput(
		releaseReservationInputSchema,
		input,
		"Invalid release reservation input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: INVENTORY_COMMAND_RELEASE,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const reservationResult = await store.getReservationById(
		parsed.data.organizationId,
		parsed.data.reservationId,
	);
	if (!reservationResult.ok) {
		return reservationResult;
	}
	if (reservationResult.data === null) {
		return fail("NOT_FOUND", "Stock reservation not found");
	}
	const reservation = reservationResult.data;
	if (reservation.status !== "active") {
		return fail("CONFLICT", "Stock reservation is not active");
	}
	if (reservation.version !== parsed.data.expectedVersion) {
		return fail("CONFLICT", "Stock reservation version conflict");
	}

	const created = await createStockMovement(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
			code: parsed.data.code,
			movementType: "reservation_release",
			warehouseId: reservation.warehouseId,
			reservationId: reservation.id,
		},
		{ store, ports, masters, authorization },
	);
	if (!created.ok) {
		return created;
	}

	const line = await addStockMovementLine(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
			movementId: created.data.id,
			itemId: reservation.itemId,
			quantity: reservation.quantity,
		},
		{ store, ports, masters, authorization },
	);
	if (!line.ok) {
		return line;
	}

	const reloaded = await store.getMovementById(
		parsed.data.organizationId,
		created.data.id,
	);
	if (!reloaded.ok) {
		return reloaded;
	}
	if (reloaded.data === null) {
		return fail(
			"INTERNAL_ERROR",
			"Reservation release movement missing after create",
		);
	}

	return store.postMovement(
		{
			organizationId: parsed.data.organizationId,
			movementId: created.data.id,
			expectedVersion: reloaded.data.version,
			actorUserId: parsed.data.actorUserId,
			reservationExpectedVersion: parsed.data.expectedVersion,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getMovementById(parsed.data.organizationId, parsed.data.id);
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
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listMovements({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		movementType: parsed.data.movementType,
	});
}

export async function getStockAvailability(
	input: unknown,
	options: InventoryCommandOptions = {},
): Promise<Result<StockBalance[]>> {
	const parsed = parseInventoryInput(
		getStockAvailabilityInputSchema,
		input,
		"Invalid stock availability input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireInventoryQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: INVENTORY_QUERY_AVAILABILITY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getAvailability({
		organizationId: parsed.data.organizationId,
		warehouseId: parsed.data.warehouseId,
		itemId: parsed.data.itemId,
	});
}
