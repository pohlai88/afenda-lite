import { fail, type Result } from "@afenda/errors/result";

import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "./authorization";
import {
	resolveCommandDeps,
	type SalesCommandOptions,
} from "./command-options";
import { requireMaster } from "./master-lookup";
import {
	SALES_COMMAND_CREATE,
	SALES_COMMAND_LINE_ADD,
	SALES_COMMAND_POST,
	SALES_QUERY_GET,
	SALES_QUERY_LIST,
} from "./module-ids";
import { parseSalesInput } from "./parse-input";
import {
	addOrderLineInputSchema,
	createDraftOrderInputSchema,
	getOrderByIdInputSchema,
	listOrdersInputSchema,
	postOrderInputSchema,
} from "./schemas";
import { normalizeOrderCode } from "./shared/code";
import type { SalesOrder, SalesOrderLine } from "./types";

export async function createDraftOrder(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = parseSalesInput(
		createDraftOrderInputSchema,
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

	let paymentTermId: string | null = null;
	let paymentTermCode: string | null = null;
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
			paymentTermId,
			paymentTermCode,
			netDays,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addOrderLine(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrderLine>> {
	const parsed = parseSalesInput(
		addOrderLineInputSchema,
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
		return fail("NOT_FOUND", "Sales order not found");
	}
	if (orderResult.data.status !== "draft") {
		return fail("CONFLICT", "Cannot add lines to a posted order");
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
			orderId: parsed.data.orderId,
			itemId: item.id,
			itemCode: item.code,
			itemName: item.name,
			baseUomId: item.baseUomId,
			baseUomCode: uomResult.data.code,
			quantity: parsed.data.quantity,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postOrder(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = parseSalesInput(
		postOrderInputSchema,
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
		return fail("NOT_FOUND", "Sales order not found");
	}
	const order = orderResult.data;
	if (order.status !== "draft") {
		return fail("CONFLICT", "Sales order is already posted");
	}
	if (order.lines.length === 0) {
		return fail("CONFLICT", "Cannot post order without lines");
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
		return fail("CONFLICT", "Cannot post order unless party is active");
	}

	let paymentTermId: string | null = order.paymentTermId;
	let paymentTermCode: string | null = null;
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
		netDays = termResult.data.netDays;
	}

	const lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
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
		});
	}

	return store.postOrder(
		{
			organizationId: parsed.data.organizationId,
			orderId: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			partyCode: partyResult.data.code,
			partyName: partyResult.data.name,
			paymentTermId,
			paymentTermCode,
			netDays,
			lineSnapshots,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getOrderById(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder | null>> {
	const parsed = parseSalesInput(
		getOrderByIdInputSchema,
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

export async function listOrders(
	input: unknown,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder[]>> {
	const parsed = parseSalesInput(
		listOrdersInputSchema,
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
	});
}
