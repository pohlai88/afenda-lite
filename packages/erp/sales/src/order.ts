import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "./authorization";
import {
	resolveCommandDeps,
	type SalesCommandOptions,
} from "./command-options";
import {
	SALES_ERROR_CUSTOMER_NOT_ELIGIBLE,
	SALES_ERROR_ITEM_NOT_SELLABLE,
	SALES_ERROR_ORDER_ALREADY_CANCELLED,
	SALES_ERROR_ORDER_ALREADY_POSTED,
	SALES_ERROR_ORDER_EMPTY_LINES,
	SALES_ERROR_ORDER_NOT_DRAFT,
	SALES_ERROR_ORDER_NOT_FOUND,
	SALES_ERROR_ORDER_VERSION_CONFLICT,
	SALES_ERROR_PARTY_INACTIVE,
	SALES_ERROR_PAYMENT_TERM_INACTIVE,
	salesErrorDetails,
} from "./error-codes";
import { requireMaster } from "./master-lookup";
import {
	SALES_COMMAND_CANCEL,
	SALES_COMMAND_CREATE,
	SALES_COMMAND_LINE_ADD,
	SALES_COMMAND_POST,
	SALES_QUERY_GET,
	SALES_QUERY_LIST,
} from "./module-ids";
import { parseSalesInput } from "./parse-input";
import {
	addSalesOrderLineInputSchema,
	cancelSalesOrderInputSchema,
	createDraftSalesOrderInputSchema,
	getSalesOrderByIdInputSchema,
	listSalesOrdersInputSchema,
	postSalesOrderInputSchema,
} from "./schemas";
import { normalizeOrderCode } from "./shared/code";
import { computeLineAmount, sumLineAmounts } from "./shared/money";
import type { SalesOrder, SalesOrderLine } from "./types";

async function requireActiveCustomerRole(
	masters: ReturnType<typeof resolveCommandDeps>["masters"],
	organizationId: string,
	partyId: string,
	actorUserId: string,
): Promise<Result<void>> {
	const customerResult = await masters.hasActiveCustomerRole(
		organizationId,
		partyId,
		actorUserId,
	);
	if (!customerResult.ok) {
		return customerResult;
	}
	if (!customerResult.data) {
		return fail(
			"CONFLICT",
			"Party must have an active customer role",
			salesErrorDetails(SALES_ERROR_CUSTOMER_NOT_ELIGIBLE),
		);
	}
	return ok(undefined);
}

export async function createDraftSalesOrder(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = parseSalesInput(
		createDraftSalesOrderInputSchema,
		input,
		"Invalid sales order create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: SALES_COMMAND_CREATE,
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
	if (party.status !== "active") {
		return fail(
			"CONFLICT",
			"Party must be active",
			salesErrorDetails(SALES_ERROR_PARTY_INACTIVE),
		);
	}
	const customerRole = await requireActiveCustomerRole(
		masters,
		parsed.data.organizationId,
		party.id,
		parsed.data.actorUserId,
	);
	if (!customerRole.ok) {
		return customerRole;
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
		if (termResult.data.status !== "active") {
			return fail(
				"CONFLICT",
				"Payment term must be active",
				salesErrorDetails(SALES_ERROR_PAYMENT_TERM_INACTIVE),
			);
		}
		paymentTermId = termResult.data.id;
		paymentTermCode = termResult.data.code;
		paymentTermName = termResult.data.name;
		netDays = termResult.data.netDays;
	}

	return store.createOrder(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			partyId: party.id,
			partyCode: party.code,
			partyName: party.name,
			billToAddressSnapshot: parsed.data.billToAddressSnapshot ?? null,
			shipToAddressSnapshot: parsed.data.shipToAddressSnapshot ?? null,
			paymentTermId,
			paymentTermCode,
			paymentTermName,
			netDays,
			currencyCode: parsed.data.currencyCode,
			exchangeRate: parsed.data.exchangeRate ?? null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addSalesOrderLine(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrderLine>> {
	const parsed = parseSalesInput(
		addSalesOrderLineInputSchema,
		input,
		"Invalid sales order line input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: SALES_COMMAND_LINE_ADD,
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
			"Sales order not found",
			salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
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
			"Cannot add lines to a posted or cancelled order",
			salesErrorDetails(SALES_ERROR_ORDER_NOT_DRAFT),
		);
	}
	if (orderResult.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Sales order version conflict",
			salesErrorDetails(SALES_ERROR_ORDER_VERSION_CONFLICT),
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
			"Item must be active and sellable",
			salesErrorDetails(SALES_ERROR_ITEM_NOT_SELLABLE),
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
			expectedVersion: parsed.data.expectedVersion,
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
			lineIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postSalesOrder(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = parseSalesInput(
		postSalesOrderInputSchema,
		input,
		"Invalid sales order post input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: SALES_COMMAND_POST,
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
			"Sales order not found",
			salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
		);
	}
	const order = orderResult.data;
	if (order.status === "posted") {
		if (order.postIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(order);
		}
		return fail(
			"CONFLICT",
			"Sales order is already posted",
			salesErrorDetails(SALES_ERROR_ORDER_ALREADY_POSTED),
		);
	}
	if (order.status !== "draft") {
		return fail(
			"CONFLICT",
			"Sales order cannot be posted",
			salesErrorDetails(SALES_ERROR_ORDER_NOT_DRAFT),
		);
	}
	if (order.lines.length === 0) {
		return fail(
			"CONFLICT",
			"Cannot post order without lines",
			salesErrorDetails(SALES_ERROR_ORDER_EMPTY_LINES),
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
			salesErrorDetails(SALES_ERROR_PARTY_INACTIVE),
		);
	}
	const customerRole = await requireActiveCustomerRole(
		masters,
		parsed.data.organizationId,
		partyResult.data.id,
		parsed.data.actorUserId,
	);
	if (!customerRole.ok) {
		return customerRole;
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
				salesErrorDetails(SALES_ERROR_PAYMENT_TERM_INACTIVE),
			);
		}
		paymentTermId = termResult.data.id;
		paymentTermCode = termResult.data.code;
		paymentTermName = termResult.data.name;
		netDays = termResult.data.netDays;
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
				salesErrorDetails(SALES_ERROR_ITEM_NOT_SELLABLE),
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

export async function cancelSalesOrder(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = parseSalesInput(
		cancelSalesOrderInputSchema,
		input,
		"Invalid sales order cancel input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: SALES_COMMAND_CANCEL,
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
			"Sales order not found",
			salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
		);
	}
	if (orderResult.data.status === "cancelled") {
		if (orderResult.data.cancelIdempotencyKey === parsed.data.idempotencyKey) {
			return ok(orderResult.data);
		}
		return fail(
			"CONFLICT",
			"Sales order is already cancelled",
			salesErrorDetails(SALES_ERROR_ORDER_ALREADY_CANCELLED),
		);
	}
	if (
		orderResult.data.status !== "draft" &&
		orderResult.data.status !== "posted"
	) {
		return fail("CONFLICT", "Sales order cannot be cancelled");
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

export async function getSalesOrderById(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder | null>> {
	const parsed = parseSalesInput(
		getSalesOrderByIdInputSchema,
		input,
		"Invalid sales order get input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: SALES_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getOrderById(parsed.data.organizationId, parsed.data.id);
}

export async function listSalesOrders(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder[]>> {
	const parsed = parseSalesInput(
		listSalesOrdersInputSchema,
		input,
		"Invalid sales order list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireSalesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: SALES_QUERY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listOrders({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		sort: parsed.data.sort,
	});
}
