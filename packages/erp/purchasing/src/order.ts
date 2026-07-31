import { errorResult, type Result } from "@afenda/errors";

import {
	requirePurchasingCommandPermission,
	requirePurchasingQueryPermission,
} from "./authorization";
import {
	type PurchasingCommandOptions,
	resolveCommandDeps,
} from "./command-options";
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
import { runSequentiallyUntil } from "./resolve-async";
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
		return errorResult.fail("CONFLICT", {
			publicMessage: "Party must have an active supplier role",
		});
	}
	return errorResult.ok(undefined);
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
		return errorResult.ok({
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
	return errorResult.ok({
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
		return errorResult.ok(existingByKey.data);
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
		({ netDays } = termResult.data);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Purchase order not found",
		});
	}
	const existingLine = orderResult.data.lines.find(
		(line) => line.lineIdempotencyKey === parsed.data.idempotencyKey,
	);
	if (existingLine !== undefined) {
		return errorResult.ok(existingLine);
	}
	if (orderResult.data.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot add lines to a posted, cancelled, or closed order",
		});
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
		return errorResult.fail("CONFLICT", {
			publicMessage: "Item must be active and purchasable",
		});
	}

	const uomResult = requireMaster(
		await masters.getRefUomById(
			parsed.data.organizationId,
			item.baseUomId,
			parsed.data.actorUserId,
		),
		"Base UoM not found for item",
	);
	if (!uomResult.ok) {
		return uomResult;
	}

	const { unitPrice } = parsed.data;
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

interface PostLineSnapshot {
	baseUomCode: string;
	baseUomId: string;
	discountAmount: string;
	itemCode: string;
	itemName: string;
	lineAmount: string;
	lineId: string;
	taxClassification: string | null;
	unitPrice: string;
}

interface NullableTermSnapshot {
	netDays: number | null;
	paymentTermCode: string | null;
	paymentTermId: string | null;
	paymentTermName: string | null;
}

interface NullableWarehouseSnapshot {
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}

function requirePostableOrder(
	order: PurchaseOrder,
	idempotencyKey: string,
): Result<PurchaseOrder> {
	if (order.status === "posted") {
		return order.postIdempotencyKey === idempotencyKey
			? errorResult.ok(order)
			: errorResult.fail("CONFLICT", {
					publicMessage: "Purchase order is already posted",
				});
	}
	if (order.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Purchase order cannot be posted",
		});
	}
	if (order.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post purchase order without lines",
		});
	}
	return errorResult.ok(order);
}

async function requirePostableSupplier(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	partyId: string,
	actorUserId: string,
): Promise<Result<{ code: string; name: string }>> {
	const partyResult = requireMaster(
		await masters.getPartyById(organizationId, partyId, actorUserId),
		"Party not found in organization",
	);
	if (!partyResult.ok) {
		return partyResult;
	}
	if (partyResult.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post order unless party is active",
		});
	}
	const supplierCheck = await requireActiveSupplierRole(
		masters,
		organizationId,
		partyId,
		actorUserId,
	);
	if (!supplierCheck.ok) {
		return supplierCheck;
	}
	return errorResult.ok({
		code: partyResult.data.code,
		name: partyResult.data.name,
	});
}

async function resolvePostPaymentTerm(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	paymentTermId: string | null,
	actorUserId: string,
): Promise<Result<NullableTermSnapshot>> {
	if (paymentTermId === null) {
		return errorResult.ok({
			paymentTermId: null,
			paymentTermCode: null,
			paymentTermName: null,
			netDays: null,
		});
	}
	const termResult = requireMaster(
		await masters.getPaymentTermById(
			organizationId,
			paymentTermId,
			actorUserId,
		),
		"Payment term not found in organization",
	);
	if (!termResult.ok) {
		return termResult;
	}
	if (termResult.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post order unless payment term is active",
		});
	}
	return errorResult.ok({
		paymentTermId: termResult.data.id,
		paymentTermCode: termResult.data.code,
		paymentTermName: termResult.data.name,
		netDays: termResult.data.netDays,
	});
}

async function resolvePostWarehouse(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	warehouseId: string | null,
	actorUserId: string,
): Promise<Result<NullableWarehouseSnapshot>> {
	if (warehouseId === null) {
		return errorResult.ok({
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
	if (warehouseResult.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post order unless warehouse is active",
		});
	}
	return errorResult.ok({
		warehouseId: warehouseResult.data.id,
		warehouseCode: warehouseResult.data.code,
		warehouseName: warehouseResult.data.name,
	});
}

async function resolvePostLineSnapshots(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	lines: readonly PurchaseOrderLine[],
	actorUserId: string,
): Promise<Result<PostLineSnapshot[]>> {
	const snapshots: PostLineSnapshot[] = [];
	const terminal = await runSequentiallyUntil<
		PurchaseOrderLine,
		Result<PostLineSnapshot[]>
	>(lines, async (line) => {
		const itemResult = requireMaster(
			await masters.getItemById(organizationId, line.itemId, actorUserId),
			"Item not found in organization",
		);
		if (!itemResult.ok) {
			return itemResult;
		}
		if (itemResult.data.status !== "active") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot post order unless every line item is active",
			});
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
		snapshots.push({
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
	});
	return terminal ?? errorResult.ok(snapshots);
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Purchase order not found",
		});
	}
	const order = orderResult.data;
	const postable = requirePostableOrder(order, parsed.data.idempotencyKey);
	if (!postable.ok || order.status === "posted") {
		return postable;
	}

	const supplier = await requirePostableSupplier(
		masters,
		parsed.data.organizationId,
		order.partyId,
		parsed.data.actorUserId,
	);
	if (!supplier.ok) {
		return supplier;
	}

	const paymentTerm = await resolvePostPaymentTerm(
		masters,
		parsed.data.organizationId,
		order.paymentTermId,
		parsed.data.actorUserId,
	);
	if (!paymentTerm.ok) {
		return paymentTerm;
	}

	const warehouse = await resolvePostWarehouse(
		masters,
		parsed.data.organizationId,
		order.warehouseId,
		parsed.data.actorUserId,
	);
	if (!warehouse.ok) {
		return warehouse;
	}

	const lineSnapshots = await resolvePostLineSnapshots(
		masters,
		parsed.data.organizationId,
		order.lines,
		parsed.data.actorUserId,
	);
	if (!lineSnapshots.ok) {
		return lineSnapshots;
	}

	const totals = sumLineAmounts(lineSnapshots.data);
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
			partyCode: supplier.data.code,
			partyName: supplier.data.name,
			...paymentTerm.data,
			...warehouse.data,
			subtotalAmount: totals.subtotalAmount,
			discountTotal: totals.discountTotal,
			taxTotal,
			documentTotal,
			lineSnapshots: lineSnapshots.data,
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Purchase order not found",
		});
	}
	if (orderResult.data.status === "cancelled") {
		if (orderResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
			return errorResult.ok(orderResult.data);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Purchase order is already cancelled",
		});
	}
	if (orderResult.data.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Only draft purchase orders can be cancelled; use close for posted orders",
		});
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
		return errorResult.fail("INTERNAL_ERROR");
	}

	const orderResult = await store.getOrderById(
		parsed.data.organizationId,
		parsed.data.orderId,
	);
	if (!orderResult.ok) {
		return orderResult;
	}
	if (orderResult.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Purchase order not found",
		});
	}
	const order = orderResult.data;
	if (order.status === "closed") {
		if (order.closeIdempotencyKey === parsed.data.idempotencyKey) {
			return errorResult.ok(order);
		}
		return errorResult.fail("CONFLICT", {
			publicMessage: "Purchase order is already closed",
		});
	}
	if (order.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Only posted purchase orders can be closed",
		});
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
