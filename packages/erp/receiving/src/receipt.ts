import { fail, type Result } from "@afenda/errors/result";

import {
	requireReceivingCommandPermission,
	requireReceivingQueryPermission,
} from "./authorization";
import {
	type ReceivingCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { requireMaster } from "./master-lookup";
import {
	RECEIVING_COMMAND_CANCEL,
	RECEIVING_COMMAND_CREATE,
	RECEIVING_COMMAND_DISCREPANCY_RECORD,
	RECEIVING_COMMAND_LINE_ADD,
	RECEIVING_COMMAND_POST,
	RECEIVING_QUERY_GET,
	RECEIVING_QUERY_LIST,
} from "./module-ids";
import { parseReceivingInput } from "./parse-input";
import {
	addGoodsReceiptLineInputSchema,
	cancelGoodsReceiptInputSchema,
	createDraftGoodsReceiptInputSchema,
	getGoodsReceiptByIdInputSchema,
	listGoodsReceiptsInputSchema,
	postGoodsReceiptInputSchema,
	recordReceivingDiscrepancyInputSchema,
} from "./schemas";
import { normalizeReceiptCode } from "./shared/code";
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	ReceivingDiscrepancy,
} from "./types";

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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireReceivingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: RECEIVING_COMMAND_CREATE,
	});
	if (!authorized.ok) return authorized;
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
	return store.createReceipt(
		{
			organizationId: parsed.data.organizationId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			sourceType: parsed.data.sourceType,
			sourceId: parsed.data.sourceId ?? null,
			warehouseId: warehouse.data.id,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			notes: parsed.data.notes ?? null,
			createdBy: parsed.data.actorUserId,
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
		await masters.getRefUomById(item.data.baseUomId),
		"Base UoM not found for item",
	);
	if (!uom.ok) return uom;
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
			quantityReceived: parsed.data.quantityReceived,
			purchaseOrderLineId: parsed.data.purchaseOrderLineId ?? null,
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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
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
	if (receipt.data.status !== "draft") {
		return fail("CONFLICT", "Goods receipt is not in draft status");
	}
	if (receipt.data.lines.length === 0) {
		return fail("CONFLICT", "Cannot post goods receipt without lines");
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
			await masters.getRefUomById(item.data.baseUomId),
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
	return store.postReceipt(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			lineSnapshots,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
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
	if (receipt.data.status !== "draft" && receipt.data.status !== "posted") {
		return fail("CONFLICT", "Goods receipt cannot be cancelled");
	}
	return store.cancelReceipt(
		{
			organizationId: parsed.data.organizationId,
			receiptId: parsed.data.receiptId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
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
			createdBy: parsed.data.actorUserId,
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
