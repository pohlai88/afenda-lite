import { fail, ok, type Result } from "@afenda/errors/result";
import {
	addStockMovementLine,
	createReversalMovement,
	createStockMovement,
	getStockMovementById,
	type InventoryCommandOptions,
	postStockMovement,
} from "@afenda/inventory";

import {
	requireReceivingCommandPermission,
	requireReceivingQueryPermission,
} from "./authorization";
import {
	type ReceivingCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL,
	receivingErrorDetails,
} from "./error-codes";
import { requireMaster } from "./master-lookup";
import {
	RECEIVING_COMMAND_CANCEL,
	RECEIVING_COMMAND_CREATE,
	RECEIVING_COMMAND_DISCREPANCY_RECORD,
	RECEIVING_COMMAND_DISCREPANCY_RESOLVE,
	RECEIVING_COMMAND_LINE_ADD,
	RECEIVING_COMMAND_POST,
	RECEIVING_COMMAND_REVERSE,
	RECEIVING_QUERY_GET,
	RECEIVING_QUERY_INVENTORY_EXCEPTIONS,
	RECEIVING_QUERY_LIST,
} from "./module-ids";
import { parseReceivingInput } from "./parse-input";
import {
	assertAcceptedWithinPoCeilings,
	assertPurchaseOrderPostedForCreate,
	buildPoConsumptionGuard,
	loadPurchaseOrderReceivingSnapshot,
} from "./po-receiving-guard";
import {
	addGoodsReceiptLineInputSchema,
	cancelGoodsReceiptInputSchema,
	createDraftGoodsReceiptInputSchema,
	getGoodsReceiptByIdInputSchema,
	listGoodsReceiptsInputSchema,
	listReceivingInventoryExceptionsInputSchema,
	postGoodsReceiptInputSchema,
	recordReceivingDiscrepancyInputSchema,
	resolveReceivingDiscrepancyInputSchema,
	reverseGoodsReceiptInputSchema,
} from "./schemas";
import { normalizeReceiptCode } from "./shared/code";
import type { PoConsumptionGuard } from "./store";
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	ReceivingDiscrepancy,
} from "./types";

async function postReceiptInventoryMovement(
	receipt: GoodsReceipt,
	actorUserId: string,
	correlationId: string,
	inventory: InventoryCommandOptions,
): Promise<Result<{ movementId: string }>> {
	const created = await createStockMovement(
		{
			organizationId: receipt.organizationId,
			actorUserId,
			correlationId,
			idempotencyKey: `rcv-post:${receipt.id}`,
			code: receipt.code,
			movementType: "receipt",
			source: "receiving",
			warehouseId: receipt.warehouseId,
			sourceModule: "receiving",
			sourceAggregateId: receipt.id,
			sourceEventId: `receiving.receipt.posted:${receipt.id}:${receipt.version}`,
			sourceEventVersion: receipt.version,
		},
		inventory,
	);
	if (!created.ok) {
		return created;
	}

	let expectedVersion = created.data.version;
	for (const line of receipt.lines) {
		const added = await addStockMovementLine(
			{
				organizationId: receipt.organizationId,
				actorUserId,
				correlationId,
				idempotencyKey: `rcv-post:${receipt.id}:line:${line.id}`,
				movementId: created.data.id,
				itemId: line.itemId,
				quantity: line.quantityAccepted,
				expectedVersion,
			},
			inventory,
		);
		if (!added.ok) {
			return added;
		}
		expectedVersion += 1;
	}

	const posted = await postStockMovement(
		{
			organizationId: receipt.organizationId,
			actorUserId,
			correlationId,
			idempotencyKey: `rcv-post-finalize:${receipt.id}`,
			movementId: created.data.id,
			expectedVersion,
		},
		inventory,
	);
	if (!posted.ok) {
		return posted;
	}

	return ok({ movementId: created.data.id });
}

export async function createDraftGoodsReceipt(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt>> {
	const parsed = parseReceivingInput(
		createDraftGoodsReceiptInputSchema,
		input,
		"Invalid goods receipt create input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, masters, authorization, purchaseOrderReceivingQuery } =
		resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_CREATE,
	});
	if (!authorized.ok) return authorized;
	const existing = await store.getReceiptByCreateIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data !== null) {
		return ok(existing.data);
	}
	const code = normalizeReceiptCode(parsed.data.code);
	if (!code.ok) return code;
	const warehouse = requireMaster(
		await masters.getWarehouseById(
			parsed.data.organizationId,
			parsed.data.warehouseId,
			parsed.data.actorUserId,
		),
		"Warehouse not found in organization",
	);
	if (!warehouse.ok) return warehouse;
	if (warehouse.data.status !== "active") {
		return fail("CONFLICT", "Warehouse must be active");
	}
	const purchaseOrderId = parsed.data.source.purchaseOrderId;
	const snapshot = await loadPurchaseOrderReceivingSnapshot(
		purchaseOrderReceivingQuery,
		{
			organizationId: parsed.data.organizationId,
			purchaseOrderId,
		},
	);
	if (!snapshot.ok) return snapshot;
	const receivable = assertPurchaseOrderPostedForCreate(snapshot.data);
	if (!receivable.ok) return receivable;
	return store.createReceipt(
		{
			organizationId: parsed.data.organizationId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			sourceType: "purchase_order",
			sourceId: purchaseOrderId,
			warehouseId: warehouse.data.id,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			notes: parsed.data.notes ?? null,
			createdBy: parsed.data.actorUserId,
			createIdempotencyKey: parsed.data.idempotencyKey,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addGoodsReceiptLine(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceiptLine>> {
	const parsed = parseReceivingInput(
		addGoodsReceiptLineInputSchema,
		input,
		"Invalid goods receipt line input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) return authorized;
	const receipt = await store.getReceiptById(
		parsed.data.organizationId,
		parsed.data.receiptId,
	);
	if (!receipt.ok) return receipt;
	if (receipt.data === null)
		return fail("NOT_FOUND", "Goods receipt not found");
	if (receipt.data.status !== "draft") {
		return fail("CONFLICT", "Cannot add lines to a non-draft goods receipt");
	}
	const item = requireMaster(
		await masters.getItemById(
			parsed.data.organizationId,
			parsed.data.itemId,
			parsed.data.actorUserId,
		),
		"Item not found in organization",
	);
	if (!item.ok) return item;
	if (item.data.status !== "active")
		return fail("CONFLICT", "Item must be active");
	const uom = requireMaster(
		await masters.getRefUomById(
			parsed.data.organizationId,
			item.data.baseUomId,
			parsed.data.actorUserId,
		),
		"Base UoM not found for item",
	);
	if (!uom.ok) return uom;
	const quantityAccepted =
		parsed.data.quantityAccepted ?? parsed.data.quantityReceived;
	const quantityRejected = parsed.data.quantityRejected ?? "0";
	const quantityDamaged = parsed.data.quantityDamaged ?? "0";
	return store.addLine(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			itemId: item.data.id,
			itemCode: item.data.code,
			itemName: item.data.name,
			baseUomId: item.data.baseUomId,
			baseUomCode: uom.data.code,
			quantityOrdered: parsed.data.quantityOrdered ?? null,
			quantityExpected:
				parsed.data.quantityExpected ?? parsed.data.quantityOrdered ?? null,
			quantityReceived: parsed.data.quantityReceived,
			quantityAccepted,
			quantityRejected,
			quantityDamaged,
			purchaseOrderLineId: parsed.data.purchaseOrderLineId ?? null,
			lineIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postGoodsReceipt(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt>> {
	const parsed = parseReceivingInput(
		postGoodsReceiptInputSchema,
		input,
		"Invalid goods receipt post input",
	);
	if (!parsed.ok) return parsed;
	const {
		store,
		ports,
		masters,
		authorization,
		inventory,
		purchaseOrderReceivingQuery,
	} = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_POST,
	});
	if (!authorized.ok) return authorized;
	const receipt = await store.getReceiptById(
		parsed.data.organizationId,
		parsed.data.receiptId,
	);
	if (!receipt.ok) return receipt;
	if (receipt.data === null)
		return fail("NOT_FOUND", "Goods receipt not found");
	if (receipt.data.postIdempotencyKey === parsed.data.idempotencyKey) {
		return ok(receipt.data);
	}
	if (receipt.data.status !== "draft") {
		return fail("CONFLICT", "Goods receipt is not in draft status");
	}
	if (receipt.data.lines.length === 0) {
		return fail("CONFLICT", "Cannot post goods receipt without lines");
	}
	if (!inventory) {
		return fail(
			"INTERNAL_ERROR",
			"Inventory command options are required to post goods receipt stock",
		);
	}
	let poConsumptionGuard: PoConsumptionGuard | undefined;
	if (receipt.data.sourceType === "purchase_order") {
		if (receipt.data.sourceId === null) {
			return fail(
				"CONFLICT",
				"Purchase order source id is required to post purchase_order receipts",
			);
		}
		const snapshot = await loadPurchaseOrderReceivingSnapshot(
			purchaseOrderReceivingQuery,
			{
				organizationId: parsed.data.organizationId,
				purchaseOrderId: receipt.data.sourceId,
			},
		);
		if (!snapshot.ok) return snapshot;
		const poLineIds = [
			...new Set(
				receipt.data.lines
					.map((line) => line.purchaseOrderLineId)
					.filter((id): id is string => id !== null),
			),
		];
		const owningTotals = await store.sumPostedAcceptedByPoLines(
			parsed.data.organizationId,
			receipt.data.sourceId,
			poLineIds,
			receipt.data.id,
		);
		if (!owningTotals.ok) return owningTotals;
		const alreadyAcceptedByLine = new Map(
			owningTotals.data.map((row) => [
				row.purchaseOrderLineId,
				row.acceptedQuantity,
			]),
		);
		const guard = buildPoConsumptionGuard(
			receipt.data.sourceId,
			snapshot.data,
			receipt.data.lines,
		);
		if (!guard.ok) return guard;
		const receivable = assertAcceptedWithinPoCeilings(
			guard.data,
			alreadyAcceptedByLine,
		);
		if (!receivable.ok) return receivable;
		poConsumptionGuard = guard.data;
	}
	const warehouse = requireMaster(
		await masters.getWarehouseById(
			parsed.data.organizationId,
			receipt.data.warehouseId,
			parsed.data.actorUserId,
		),
		"Warehouse not found in organization",
	);
	if (!warehouse.ok) return warehouse;
	if (warehouse.data.status !== "active") {
		return fail("CONFLICT", "Cannot post unless warehouse is active");
	}
	const lineSnapshots = [];
	for (const line of receipt.data.lines) {
		const item = requireMaster(
			await masters.getItemById(
				parsed.data.organizationId,
				line.itemId,
				parsed.data.actorUserId,
			),
			"Item not found in organization",
		);
		if (!item.ok) return item;
		if (item.data.status !== "active") {
			return fail("CONFLICT", "Cannot post unless every line item is active");
		}
		const uom = requireMaster(
			await masters.getRefUomById(
				parsed.data.organizationId,
				item.data.baseUomId,
				parsed.data.actorUserId,
			),
			"Base UoM not found for item",
		);
		if (!uom.ok) return uom;
		lineSnapshots.push({
			lineId: line.id,
			itemCode: item.data.code,
			itemName: item.data.name,
			baseUomId: item.data.baseUomId,
			baseUomCode: uom.data.code,
		});
	}
	const posted = await store.postReceipt(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			postIdempotencyKey: parsed.data.idempotencyKey,
			lineSnapshots,
			poConsumptionGuard,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	if (!posted.ok) return posted;

	const inventoryPosted = await postReceiptInventoryMovement(
		posted.data,
		parsed.data.actorUserId,
		parsed.data.correlationId,
		inventory,
	);
	if (!inventoryPosted.ok) {
		await store.setInventoryApplication({
			organizationId: parsed.data.organizationId,
			receiptId: posted.data.id,
			status: "failed",
			inventoryMovementId: null,
			errorMessage: inventoryPosted.message,
			actorUserId: parsed.data.actorUserId,
		});
		return fail(
			inventoryPosted.code === "CONFLICT" ? "CONFLICT" : "INTERNAL_ERROR",
			`Goods receipt posted but inventory stock movement failed: ${inventoryPosted.message}`,
			inventoryPosted.details,
		);
	}

	return store.setInventoryApplication({
		organizationId: parsed.data.organizationId,
		receiptId: posted.data.id,
		status: "applied",
		inventoryMovementId: inventoryPosted.data.movementId,
		errorMessage: null,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function cancelGoodsReceipt(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt>> {
	const parsed = parseReceivingInput(
		cancelGoodsReceiptInputSchema,
		input,
		"Invalid goods receipt cancel input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_CANCEL,
	});
	if (!authorized.ok) return authorized;
	const receipt = await store.getReceiptById(
		parsed.data.organizationId,
		parsed.data.receiptId,
	);
	if (!receipt.ok) return receipt;
	if (receipt.data === null)
		return fail("NOT_FOUND", "Goods receipt not found");
	if (receipt.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
		return ok(receipt.data);
	}
	if (receipt.data.status === "posted") {
		return fail(
			"CONFLICT",
			"Posted goods receipts cannot be cancelled; use reverse",
			receivingErrorDetails(RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL),
		);
	}
	if (receipt.data.status !== "draft") {
		return fail("CONFLICT", "Goods receipt cannot be cancelled");
	}
	return store.cancelReceipt(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			cancelIdempotencyKey: parsed.data.idempotencyKey,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function reverseGoodsReceipt(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt>> {
	const parsed = parseReceivingInput(
		reverseGoodsReceiptInputSchema,
		input,
		"Invalid goods receipt reverse input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, authorization, inventory } =
		resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_REVERSE,
	});
	if (!authorized.ok) return authorized;
	const original = await store.getReceiptById(
		parsed.data.organizationId,
		parsed.data.receiptId,
	);
	if (!original.ok) return original;
	if (original.data === null)
		return fail("NOT_FOUND", "Goods receipt not found");
	if (!inventory) {
		return fail(
			"INTERNAL_ERROR",
			"Inventory command options are required to reverse goods receipt stock",
		);
	}
	const reverseCode = normalizeReceiptCode(`${original.data.code}-REV`);
	if (!reverseCode.ok) return reverseCode;
	const reversed = await store.reverseReceipt(
		{
			organizationId: parsed.data.organizationId,
			originalReceiptId: parsed.data.receiptId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			reason: parsed.data.reason,
			reverseIdempotencyKey: parsed.data.idempotencyKey,
			code: reverseCode.data.code,
			normalizedCode: reverseCode.data.normalizedCode,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	if (!reversed.ok) return reversed;

	const movementId = original.data.inventoryMovementId;
	if (movementId === null) {
		await store.setInventoryApplication({
			organizationId: parsed.data.organizationId,
			receiptId: reversed.data.id,
			status: "not_applicable",
			inventoryMovementId: null,
			errorMessage: null,
			actorUserId: parsed.data.actorUserId,
		});
		return reversed;
	}

	const movement = await getStockMovementById(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			id: movementId,
		},
		inventory,
	);
	if (!movement.ok || movement.data === null) {
		await store.setInventoryApplication({
			organizationId: parsed.data.organizationId,
			receiptId: reversed.data.id,
			status: "failed",
			inventoryMovementId: null,
			errorMessage: "Original inventory movement not found for reverse",
			actorUserId: parsed.data.actorUserId,
		});
		return fail(
			"CONFLICT",
			"Goods receipt reversed but inventory movement was not found",
		);
	}

	const inventoryReversed = await createReversalMovement(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
			idempotencyKey: `rcv-reverse:${reversed.data.id}`,
			movementId,
			code: reverseCode.data.code,
			expectedVersion: movement.data.version,
		},
		inventory,
	);
	if (!inventoryReversed.ok) {
		await store.setInventoryApplication({
			organizationId: parsed.data.organizationId,
			receiptId: reversed.data.id,
			status: "failed",
			inventoryMovementId: null,
			errorMessage: inventoryReversed.message,
			actorUserId: parsed.data.actorUserId,
		});
		return fail(
			inventoryReversed.code === "CONFLICT" ? "CONFLICT" : "INTERNAL_ERROR",
			`Goods receipt reversed but inventory compensation failed: ${inventoryReversed.message}`,
			inventoryReversed.details,
		);
	}

	return store.setInventoryApplication({
		organizationId: parsed.data.organizationId,
		receiptId: reversed.data.id,
		status: "applied",
		inventoryMovementId: inventoryReversed.data.id,
		errorMessage: null,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function recordReceivingDiscrepancy(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<ReceivingDiscrepancy>> {
	const parsed = parseReceivingInput(
		recordReceivingDiscrepancyInputSchema,
		input,
		"Invalid receiving discrepancy input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_DISCREPANCY_RECORD,
	});
	if (!authorized.ok) return authorized;
	const receipt = await store.getReceiptById(
		parsed.data.organizationId,
		parsed.data.receiptId,
	);
	if (!receipt.ok) return receipt;
	if (receipt.data === null)
		return fail("NOT_FOUND", "Goods receipt not found");
	if (receipt.data.status !== "draft" && receipt.data.status !== "posted") {
		return fail("CONFLICT", "Discrepancy requires a draft or posted receipt");
	}
	if (
		parsed.data.receiptLineId !== undefined &&
		!receipt.data.lines.some((line) => line.id === parsed.data.receiptLineId)
	) {
		return fail("NOT_FOUND", "Goods receipt line not found");
	}
	return store.recordDiscrepancy(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			receiptLineId: parsed.data.receiptLineId ?? null,
			discrepancyType: parsed.data.discrepancyType,
			quantity: parsed.data.quantity,
			notes: parsed.data.notes ?? null,
			recordIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function resolveReceivingDiscrepancy(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<ReceivingDiscrepancy>> {
	const parsed = parseReceivingInput(
		resolveReceivingDiscrepancyInputSchema,
		input,
		"Invalid receiving discrepancy resolve input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_DISCREPANCY_RESOLVE,
	});
	if (!authorized.ok) return authorized;
	return store.resolveDiscrepancy(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			discrepancyId: parsed.data.discrepancyId,
			expectedVersion: parsed.data.expectedVersion,
			resolution: parsed.data.resolution,
			resolveIdempotencyKey: parsed.data.idempotencyKey,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getGoodsReceiptById(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt | null>> {
	const parsed = parseReceivingInput(
		getGoodsReceiptByIdInputSchema,
		input,
		"Invalid goods receipt get input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVING_QUERY_GET,
	});
	if (!authorized.ok) return authorized;
	return store.getReceiptById(parsed.data.organizationId, parsed.data.id);
}

export async function listGoodsReceipts(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt[]>> {
	const parsed = parseReceivingInput(
		listGoodsReceiptsInputSchema,
		input,
		"Invalid goods receipt list input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVING_QUERY_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listReceipts(parsed.data);
}

export async function listReceivingInventoryExceptions(
	input: unknown,
	options: ReceivingCommandOptions = {},
): Promise<Result<GoodsReceipt[]>> {
	const parsed = parseReceivingInput(
		listReceivingInventoryExceptionsInputSchema,
		input,
		"Invalid inventory exceptions list input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVING_QUERY_INVENTORY_EXCEPTIONS,
	});
	if (!authorized.ok) return authorized;
	return store.listInventoryExceptions(parsed.data);
}
