import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requirePurchasingCommandPermission,
	requirePurchasingQueryPermission,
} from "./authorization";
import {
	type PurchasingCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	PURCHASING_ERROR_COMMITMENT_PORT_REQUIRED,
	PURCHASING_ERROR_ITEM_NOT_PURCHASABLE,
	PURCHASING_ERROR_ORDER_ALREADY_CANCELLED,
	PURCHASING_ERROR_ORDER_ALREADY_CLOSED,
	PURCHASING_ERROR_ORDER_ALREADY_POSTED,
	PURCHASING_ERROR_ORDER_EMPTY_LINES,
	PURCHASING_ERROR_ORDER_NOT_DRAFT,
	PURCHASING_ERROR_ORDER_NOT_FOUND,
	PURCHASING_ERROR_ORDER_NOT_POSTED,
	PURCHASING_ERROR_SUPPLIER_NOT_ELIGIBLE,
	purchasingErrorDetails,
} from "./error-codes";
import { requireMaster } from "./master-lookup";
import {
	PURCHASING_COMMAND_CANCEL,
	PURCHASING_COMMAND_CLOSE,
	PURCHASING_COMMAND_CREATE,
	PURCHASING_COMMAND_LINE_ADD,
	PURCHASING_COMMAND_POST,
	PURCHASING_QUERY_GET,
	PURCHASING_QUERY_LIST,
} from "./module-ids";
import { parsePurchasingInput } from "./parse-input";
import {
	addPurchaseOrderLineInputSchema,
	cancelPurchaseOrderInputSchema,
	closePurchaseOrderInputSchema,
	createDraftPurchaseOrderInputSchema,
	getPurchaseOrderByIdInputSchema,
	listPurchaseOrdersInputSchema,
	postPurchaseOrderInputSchema,
} from "./schemas";
import { normalizeOrderCode } from "./shared/code";
import { computeLineAmount, sumLineAmounts } from "./shared/money";
import type { PurchaseOrder, PurchaseOrderLine } from "./types";

async function requireActiveSupplierRole(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	partyId: string,
	actorUserId: string,
): Promise<Result<void>> {
	const supplierResult = await masters.hasActiveSupplierRole(
		organizationId,
		partyId,
		actorUserId,
	);
	if (!supplierResult.ok) {
		return supplierResult;
	}
	if (!supplierResult.data) {
		return fail(
			"CONFLICT",
			"Party must have an active supplier role",
			purchasingErrorDetails(PURCHASING_ERROR_SUPPLIER_NOT_ELIGIBLE),
		);
	}
	return ok(undefined);
}

async function resolveWarehouseSnapshots(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	warehouseId: string | undefined,
	actorUserId: string,
): Promise<
	Result<{
		warehouseId: string | null;
		warehouseCode: string | null;
		warehouseName: string | null;
	}>
> {
	if (warehouseId === undefined) {
		return ok({
			warehouseId: null,
			warehouseCode: null,
			warehouseName: null,
		});
	}
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

export async function createDraftPurchaseOrder(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder>> {
	const parsed = parsePurchasingInput(
		createDraftPurchaseOrderInputSchema,
		input,
		"Invalid purchase order create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: PURCHASING_COMMAND_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const existingByKey = await store.getOrderByCreateIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existingByKey.ok) {
		return existingByKey;
	}
	if (existingByKey.data !== null) {
		return ok(existingByKey.data);
	}

	const codeResult = normalizeOrderCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}

	const partyResult = requireMaster(
		await masters.getPartyById(
			parsed.data.organizationId,
			parsed.data.partyId,
			parsed.data.actorUserId,
		),
		"Party not found in organization",
	);
	if (!partyResult.ok) {
		return partyResult;
	}
	const party = partyResult.data;

	const supplierCheck = await requireActiveSupplierRole(
		masters,
		parsed.data.organizationId,
		party.id,
		parsed.data.actorUserId,
	);
	if (!supplierCheck.ok) {
		return supplierCheck;
	}

	let paymentTermId: string | null = null;
	let paymentTermCode: string | null = null;
	let paymentTermName: string | null = null;
	let netDays: number | null = null;
	if (parsed.data.paymentTermId !== undefined) {
		const termResult = requireMaster(
			await masters.getPaymentTermById(
				parsed.data.organizationId,
				parsed.data.paymentTermId,
				parsed.data.actorUserId,
			),
			"Payment term not found in organization",
		);
		if (!termResult.ok) {
			return termResult;
		}
		paymentTermId = termResult.data.id;
		paymentTermCode = termResult.data.code;
		paymentTermName = termResult.data.name;
		netDays = termResult.data.netDays;
	}

	const warehouseSnapshots = await resolveWarehouseSnapshots(
		masters,
		parsed.data.organizationId,
		parsed.data.warehouseId,
		parsed.data.actorUserId,
	);
	if (!warehouseSnapshots.ok) {
		return warehouseSnapshots;
	}

	return store.createOrder(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			partyId: party.id,
			partyCode: party.code,
			partyName: party.name,
			paymentTermId,
			paymentTermCode,
			paymentTermName,
			netDays,
			warehouseId: warehouseSnapshots.data.warehouseId,
			warehouseCode: warehouseSnapshots.data.warehouseCode,
			warehouseName: warehouseSnapshots.data.warehouseName,
			currencyCode: parsed.data.currencyCode,
			exchangeRate: parsed.data.exchangeRate ?? null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addPurchaseOrderLine(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrderLine>> {
	const parsed = parsePurchasingInput(
		addPurchaseOrderLineInputSchema,
		input,
		"Invalid purchase order line input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: PURCHASING_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const orderResult = await store.getOrderById(
		parsed.data.organizationId,
		parsed.data.orderId,
	);
	if (!orderResult.ok) {
		return orderResult;
	}
	if (orderResult.data === null) {
		return fail(
			"NOT_FOUND",
			"Purchase order not found",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
		);
	}
	const existingLine = orderResult.data.lines.find(
		(line) => line.lineIdempotencyKey === parsed.data.idempotencyKey,
	);
	if (existingLine !== undefined) {
		return ok(existingLine);
	}
	if (orderResult.data.status !== "draft") {
		return fail(
			"CONFLICT",
			"Cannot add lines to a posted, cancelled, or closed order",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
		);
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
	if (item.status !== "active") {
		return fail(
			"CONFLICT",
			"Item must be active and purchasable",
			purchasingErrorDetails(PURCHASING_ERROR_ITEM_NOT_PURCHASABLE),
		);
	}

	const uomResult = requireMaster(
		await masters.getRefUomById(item.baseUomId),
		"Base UoM not found for item",
	);
	if (!uomResult.ok) {
		return uomResult;
	}

	const unitPrice = parsed.data.unitPrice;
	const discountAmount = parsed.data.discountAmount ?? "0";
	const lineAmount = computeLineAmount(
		parsed.data.quantity,
		unitPrice,
		discountAmount,
	);

	return store.addLine(
		{
			organizationId: parsed.data.organizationId,
			orderId: parsed.data.orderId,
			itemId: item.id,
			itemCode: item.code,
			itemName: item.name,
			baseUomId: item.baseUomId,
			baseUomCode: uomResult.data.code,
			quantity: parsed.data.quantity,
			unitPrice,
			discountAmount,
			taxClassification: parsed.data.taxClassification ?? null,
			lineAmount,
			overReceiptPercent: parsed.data.overReceiptPercent ?? "0",
			underReceiptPercent: parsed.data.underReceiptPercent ?? "0",
			invoiceQuantityTolerancePercent:
				parsed.data.invoiceQuantityTolerancePercent ?? "0",
			invoicePriceTolerancePercent:
				parsed.data.invoicePriceTolerancePercent ?? "0",
			lineIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postPurchaseOrder(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder>> {
	const parsed = parsePurchasingInput(
		postPurchaseOrderInputSchema,
		input,
		"Invalid purchase order post input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: PURCHASING_COMMAND_POST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const orderResult = await store.getOrderById(
		parsed.data.organizationId,
		parsed.data.orderId,
	);
	if (!orderResult.ok) {
		return orderResult;
	}
	if (orderResult.data === null) {
		return fail(
			"NOT_FOUND",
			"Purchase order not found",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
		);
	}
	const order = orderResult.data;
	if (order.status === "posted") {
		if (order.postIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(order);
		}
		return fail(
			"CONFLICT",
			"Purchase order is already posted",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_POSTED),
		);
	}
	if (order.status !== "draft") {
		return fail(
			"CONFLICT",
			"Purchase order cannot be posted",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
		);
	}
	if (order.lines.length === 0) {
		return fail(
			"CONFLICT",
			"Cannot post purchase order without lines",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_EMPTY_LINES),
		);
	}

	const partyResult = requireMaster(
		await masters.getPartyById(
			parsed.data.organizationId,
			order.partyId,
			parsed.data.actorUserId,
		),
		"Party not found in organization",
	);
	if (!partyResult.ok) {
		return partyResult;
	}
	if (partyResult.data.status !== "active") {
		return fail(
			"CONFLICT",
			"Cannot post order unless party is active",
			purchasingErrorDetails(PURCHASING_ERROR_SUPPLIER_NOT_ELIGIBLE),
		);
	}

	const supplierCheck = await requireActiveSupplierRole(
		masters,
		parsed.data.organizationId,
		order.partyId,
		parsed.data.actorUserId,
	);
	if (!supplierCheck.ok) {
		return supplierCheck;
	}

	let paymentTermId: string | null = order.paymentTermId;
	let paymentTermCode: string | null = null;
	let paymentTermName: string | null = null;
	let netDays: number | null = null;
	if (order.paymentTermId !== null) {
		const termResult = requireMaster(
			await masters.getPaymentTermById(
				parsed.data.organizationId,
				order.paymentTermId,
				parsed.data.actorUserId,
			),
			"Payment term not found in organization",
		);
		if (!termResult.ok) {
			return termResult;
		}
		if (termResult.data.status !== "active") {
			return fail(
				"CONFLICT",
				"Cannot post order unless payment term is active",
			);
		}
		paymentTermId = termResult.data.id;
		paymentTermCode = termResult.data.code;
		paymentTermName = termResult.data.name;
		netDays = termResult.data.netDays;
	}

	let warehouseId: string | null = order.warehouseId;
	let warehouseCode: string | null = order.warehouseCode;
	let warehouseName: string | null = order.warehouseName;
	if (order.warehouseId !== null) {
		const warehouseResult = requireMaster(
			await masters.getWarehouseById(
				parsed.data.organizationId,
				order.warehouseId,
				parsed.data.actorUserId,
			),
			"Warehouse not found in organization",
		);
		if (!warehouseResult.ok) {
			return warehouseResult;
		}
		if (warehouseResult.data.status !== "active") {
			return fail("CONFLICT", "Cannot post order unless warehouse is active");
		}
		warehouseId = warehouseResult.data.id;
		warehouseCode = warehouseResult.data.code;
		warehouseName = warehouseResult.data.name;
	}

	const lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
		unitPrice: string;
		discountAmount: string;
		taxClassification: string | null;
		lineAmount: string;
	}> = [];
	for (const line of order.lines) {
		const itemResult = requireMaster(
			await masters.getItemById(
				parsed.data.organizationId,
				line.itemId,
				parsed.data.actorUserId,
			),
			"Item not found in organization",
		);
		if (!itemResult.ok) {
			return itemResult;
		}
		if (itemResult.data.status !== "active") {
			return fail(
				"CONFLICT",
				"Cannot post order unless every line item is active",
				purchasingErrorDetails(PURCHASING_ERROR_ITEM_NOT_PURCHASABLE),
			);
		}
		const uomResult = requireMaster(
			await masters.getRefUomById(itemResult.data.baseUomId),
			"Base UoM not found for item",
		);
		if (!uomResult.ok) {
			return uomResult;
		}
		lineSnapshots.push({
			lineId: line.id,
			itemCode: itemResult.data.code,
			itemName: itemResult.data.name,
			baseUomId: itemResult.data.baseUomId,
			baseUomCode: uomResult.data.code,
			unitPrice: line.unitPrice,
			discountAmount: line.discountAmount,
			taxClassification: line.taxClassification,
			lineAmount: line.lineAmount,
		});
	}

	const totals = sumLineAmounts(lineSnapshots);
	const taxTotal = parsed.data.taxTotal ?? "0";
	const documentTotal = String(
		Number(totals.subtotalAmount) + Number(taxTotal),
	);

	return store.postOrder(
		{
			organizationId: parsed.data.organizationId,
			orderId: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			postIdempotencyKey: parsed.data.idempotencyKey,
			partyCode: partyResult.data.code,
			partyName: partyResult.data.name,
			paymentTermId,
			paymentTermCode,
			paymentTermName,
			netDays,
			warehouseId,
			warehouseCode,
			warehouseName,
			subtotalAmount: totals.subtotalAmount,
			discountTotal: totals.discountTotal,
			taxTotal,
			documentTotal,
			lineSnapshots,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function cancelPurchaseOrder(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder>> {
	const parsed = parsePurchasingInput(
		cancelPurchaseOrderInputSchema,
		input,
		"Invalid purchase order cancel input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: PURCHASING_COMMAND_CANCEL,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const orderResult = await store.getOrderById(
		parsed.data.organizationId,
		parsed.data.orderId,
	);
	if (!orderResult.ok) {
		return orderResult;
	}
	if (orderResult.data === null) {
		return fail(
			"NOT_FOUND",
			"Purchase order not found",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
		);
	}
	if (orderResult.data.status === "cancelled") {
		if (orderResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(orderResult.data);
		}
		return fail(
			"CONFLICT",
			"Purchase order is already cancelled",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_CANCELLED),
		);
	}
	if (orderResult.data.status !== "draft") {
		return fail(
			"CONFLICT",
			"Only draft purchase orders can be cancelled; use close for posted orders",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
		);
	}

	return store.cancelOrder(
		{
			organizationId: parsed.data.organizationId,
			orderId: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			cancelIdempotencyKey: parsed.data.idempotencyKey,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function closePurchaseOrder(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder>> {
	const parsed = parsePurchasingInput(
		closePurchaseOrderInputSchema,
		input,
		"Invalid purchase order close input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization, commitmentQuery } =
		resolveCommandDeps(options);
	const authorized = await requirePurchasingCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: PURCHASING_COMMAND_CLOSE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	if (commitmentQuery === undefined) {
		return fail(
			"INTERNAL_ERROR",
			"Purchase order commitment query port is required to close",
			purchasingErrorDetails(PURCHASING_ERROR_COMMITMENT_PORT_REQUIRED),
		);
	}

	const orderResult = await store.getOrderById(
		parsed.data.organizationId,
		parsed.data.orderId,
	);
	if (!orderResult.ok) {
		return orderResult;
	}
	if (orderResult.data === null) {
		return fail(
			"NOT_FOUND",
			"Purchase order not found",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
		);
	}
	const order = orderResult.data;
	if (order.status === "closed") {
		if (order.closeIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(order);
		}
		return fail(
			"CONFLICT",
			"Purchase order is already closed",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_CLOSED),
		);
	}
	if (order.status !== "posted") {
		return fail(
			"CONFLICT",
			"Only posted purchase orders can be closed",
			purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_POSTED),
		);
	}

	const commitment = await commitmentQuery.getCommitmentStatus({
		organizationId: parsed.data.organizationId,
		purchaseOrderId: parsed.data.orderId,
	});
	if (!commitment.ok) {
		return commitment;
	}
	// Commitment is informational for close — partial fulfilment is allowed;
	// remaining commitment is terminated by closing the order.

	return store.closeOrder(
		{
			organizationId: parsed.data.organizationId,
			orderId: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			closeIdempotencyKey: parsed.data.idempotencyKey,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getPurchaseOrderById(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder | null>> {
	const parsed = parsePurchasingInput(
		getPurchaseOrderByIdInputSchema,
		input,
		"Invalid purchase order get input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: PURCHASING_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getOrderById(parsed.data.organizationId, parsed.data.id);
}

export async function listPurchaseOrders(
	input: unknown,
	options: PurchasingCommandOptions = {},
): Promise<Result<PurchaseOrder[]>> {
	const parsed = parsePurchasingInput(
		listPurchaseOrdersInputSchema,
		input,
		"Invalid purchase order list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requirePurchasingQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: PURCHASING_QUERY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listOrders({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
	});
}
