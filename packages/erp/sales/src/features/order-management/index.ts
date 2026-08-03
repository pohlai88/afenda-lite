import { errorResult, type Result } from "@afenda/errors";
import {
	itemIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
} from "@afenda/master-data";
import { z } from "zod";
import {
	resolveSalesDeps,
	type SalesCommandOptions,
	type SalesQueryOptions,
} from "../../facade/contracts";
import {
	salesMutationContextSchema,
	salesQueryContextSchema,
	salesVersionedMutationContextSchema,
} from "../../kernel/contracts/context";
import type {
	FulfillableSalesOrder,
	SalesOrder,
	SalesOrderLine,
	SalesOrderStatus,
} from "../../kernel/contracts/domain";
import {
	addDecimals,
	currencyCodeSchema,
	multiplyDecimal,
	nonNegativeDecimalAmountSchema,
} from "../../kernel/contracts/money";
import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "../../kernel/execution/authorization";
import {
	salesOrderIdSchema,
	salesOrderLineIdSchema,
} from "../../kernel/identity/brands";
import { salesEvidence } from "../integration-projections/evidence";

const ZERO_DECIMAL_PATTERN = /^0(?:\.0+)?$/u;
const positiveDecimal = nonNegativeDecimalAmountSchema.refine(
	(value) => value !== "0" && !ZERO_DECIMAL_PATTERN.test(value),
);
export const createSalesOrderInputSchema = salesMutationContextSchema.extend({
	code: z.string().trim().min(1).max(64),
	partyId: partyIdSchema,
	paymentTermId: paymentTermIdSchema.optional(),
	currencyCode: currencyCodeSchema,
	exchangeRate: positiveDecimal.optional(),
	billToAddressSnapshot: z.string().trim().min(1).max(4000).optional(),
	shipToAddressSnapshot: z.string().trim().min(1).max(4000).optional(),
	sourceQuotationId: z.string().uuid().optional(),
});
export const addSalesOrderLineInputSchema =
	salesVersionedMutationContextSchema.extend({
		orderId: salesOrderIdSchema,
		itemId: itemIdSchema,
		requestedUomId: z.string().uuid().optional(),
		quantity: z.coerce.string().pipe(positiveDecimal),
		unitPrice: z.coerce.string().pipe(nonNegativeDecimalAmountSchema),
		discountAmount: z.coerce
			.string()
			.pipe(nonNegativeDecimalAmountSchema)
			.optional(),
		taxAmount: z.coerce
			.string()
			.pipe(nonNegativeDecimalAmountSchema)
			.optional(),
		requestedDate: z.coerce.date().optional(),
	});
export const orderTransitionInputSchema =
	salesVersionedMutationContextSchema.extend({ orderId: salesOrderIdSchema });
export const postSalesOrderInputSchema = orderTransitionInputSchema.extend({
	taxTotal: z.coerce.string().pipe(nonNegativeDecimalAmountSchema).optional(),
});
export const recordSalesFulfillmentInputSchema =
	salesVersionedMutationContextSchema.extend({
		orderId: salesOrderIdSchema,
		lineId: salesOrderLineIdSchema,
		fulfilledQuantity: z.coerce.string().pipe(positiveDecimal),
	});
export const getSalesOrderInputSchema = salesQueryContextSchema.extend({
	id: salesOrderIdSchema,
});
export const listSalesOrdersInputSchema = salesQueryContextSchema
	.extend({
		cursor: z.string().trim().min(1).max(512).optional(),
		pageSize: z.number().int().min(1).max(100).optional(),
		status: z
			.enum([
				"draft",
				"submitted",
				"approved",
				"confirmed",
				"released",
				"partially_fulfilled",
				"fulfilled",
				"cancelled",
				"closed",
			])
			.optional(),
		page: z.number().int().positive().optional(),
	})
	.transform((value) => ({ ...value, pageSize: value.pageSize ?? 25 }));

function requireMaster<T>(value: T | undefined, _name: string): Result<T> {
	return value ? { ok: true, data: value } : errorResult.fail("INTERNAL_ERROR");
}

export async function createDraftSalesOrder(
	input: z.input<typeof createSalesOrderInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = createSalesOrderInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales order",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.create",
	});
	if (!auth.ok) {
		return auth;
	}
	const master = requireMaster(deps.masterData, "Master-data snapshot");
	if (!master.ok) {
		return master;
	}
	const customer = await master.data.resolveCustomer({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.partyId,
		paymentTermId: parsed.data.paymentTermId,
	});
	if (!customer.ok) {
		return customer;
	}
	return deps.store.createOrder(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: parsed.data.code,
			normalizedCode: parsed.data.code.toUpperCase(),
			status: "draft",
			customer: {
				...customer.data,
				billToAddress:
					parsed.data.billToAddressSnapshot ?? customer.data.billToAddress,
				shipToAddress:
					parsed.data.shipToAddressSnapshot ?? customer.data.shipToAddress,
			},
			currencyCode: parsed.data.currencyCode,
			exchangeRate: parsed.data.exchangeRate,
			subtotalAmount: "0",
			discountTotal: "0",
			taxTotal: "0",
			documentTotal: "0",
			sourceQuotationId: parsed.data.sourceQuotationId
				? z
						.string()
						.uuid()
						.brand<"SalesQuotationId">()
						.parse(parsed.data.sourceQuotationId)
				: undefined,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.created.v1",
			entityType: "sales_order",
			code: parsed.data.code,
			action: "CREATE",
		}),
	);
}

export async function addSalesOrderLine(
	input: z.input<typeof addSalesOrderLineInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrderLine>> {
	const parsed = addSalesOrderLineInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order line",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.line.add",
	});
	if (!auth.ok) {
		return auth;
	}
	const master = requireMaster(deps.masterData, "Master-data snapshot");
	if (!master.ok) {
		return master;
	}
	const item = await master.data.resolveItem({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		itemId: parsed.data.itemId,
		requestedUomId: parsed.data.requestedUomId,
	});
	if (!item.ok) {
		return item;
	}
	const discount = parsed.data.discountAmount ?? "0";
	const tax = parsed.data.taxAmount ?? "0";
	const gross = multiplyDecimal(parsed.data.quantity, parsed.data.unitPrice);
	if (!gross.ok) {
		return gross;
	}
	const total = addDecimals([gross.data, `-${discount}`, tax]);
	if (!total.ok) {
		return total;
	}
	return deps.store.addOrderLine(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			expectedVersion: parsed.data.expectedVersion,
			orderId: parsed.data.orderId,
			item: item.data,
			quantity: parsed.data.quantity,
			fulfilledQuantity: "0",
			unitPrice: parsed.data.unitPrice,
			discountAmount: discount,
			taxAmount: tax,
			lineAmount: total.data,
		},
		{ requestedDate: parsed.data.requestedDate ?? deps.clock.now() },
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.line_added.v1",
			entityType: "sales_order_line",
			code: parsed.data.orderId,
			action: "CREATE",
		}),
	);
}

async function transitionOrder(
	command:
		| "sales.order.submit"
		| "sales.order.approve"
		| "sales.order.cancel"
		| "sales.order.close",
	status: SalesOrderStatus,
	input: z.input<typeof orderTransitionInputSchema>,
	options: SalesCommandOptions,
): Promise<Result<SalesOrder>> {
	const parsed = orderTransitionInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order transition",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.transitionOrder(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			status,
			actorUserId: parsed.data.actorUserId,
			at: deps.clock.now(),
		},
		salesEvidence({
			...parsed.data,
			eventType: `sales.order.${status}.v1`,
			entityType: "sales_order",
			code: parsed.data.orderId,
			action: "UPDATE",
		}),
	);
}
export const submitSalesOrder = (
	input: z.input<typeof orderTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transitionOrder("sales.order.submit", "submitted", input, options);
export const approveSalesOrder = (
	input: z.input<typeof orderTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transitionOrder("sales.order.approve", "approved", input, options);
export const cancelSalesOrder = (
	input: z.input<typeof orderTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transitionOrder("sales.order.cancel", "cancelled", input, options);
export const closeSalesOrder = (
	input: z.input<typeof orderTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transitionOrder("sales.order.close", "closed", input, options);

type SalesDeps = ReturnType<typeof resolveSalesDeps>;

function validateOrderPostingState(order: SalesOrder): Result<true> {
	if (!(order.status === "approved" || order.status === "confirmed")) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order requires approval before release",
		});
	}
	return errorResult.ok(true);
}

async function checkOrderCredit(
	deps: SalesDeps,
	order: SalesOrder,
): Promise<Result<string | undefined>> {
	if (deps.credit === undefined) {
		return errorResult.ok(undefined);
	}
	const creditResult = await deps.credit.check({
		organizationId: order.organizationId,
		customerId: order.customer.partyId,
		currencyCode: order.currencyCode,
		amount: order.documentTotal,
	});
	if (!creditResult.ok) {
		return creditResult;
	}
	if (!creditResult.data.approved) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order failed credit approval",
		});
	}
	return errorResult.ok(creditResult.data.reference);
}

async function checkOrderAvailability(
	deps: SalesDeps,
	order: SalesOrder,
	lines: readonly SalesOrderLine[],
): Promise<Result<string | undefined>> {
	if (deps.availability === undefined) {
		return errorResult.ok(undefined);
	}
	const availabilityResult = await deps.availability.check({
		organizationId: order.organizationId,
		lines: lines.map((line) => ({
			itemId: line.item.itemId,
			quantity: line.quantity,
			requestedDate: deps.clock.now(),
		})),
	});
	if (!availabilityResult.ok) {
		return availabilityResult;
	}
	if (!availabilityResult.data.available) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order has unavailable quantities",
		});
	}
	return errorResult.ok(availabilityResult.data.reference);
}

async function calculateOrderTax(
	deps: SalesDeps,
	order: SalesOrder,
	lines: readonly SalesOrderLine[],
	taxTotal: SalesOrder["taxTotal"],
): Promise<Result<SalesOrder["taxTotal"]>> {
	if (deps.tax === undefined) {
		return errorResult.ok(taxTotal);
	}
	const tax = await deps.tax.calculate({
		organizationId: order.organizationId,
		customerId: order.customer.partyId,
		currencyCode: order.currencyCode,
		lines: lines.map((line) => ({
			itemId: line.item.itemId,
			quantity: line.quantity,
			netAmount: line.lineAmount,
		})),
	});
	return tax.ok ? errorResult.ok(tax.data.totalTax) : tax;
}

export async function postSalesOrder(
	input: z.input<typeof postSalesOrderInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = postSalesOrderInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order release",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.post",
	});
	if (!auth.ok) {
		return auth;
	}
	const current = await deps.store.getOrder({
		organizationId: parsed.data.organizationId,
		id: parsed.data.orderId,
	});
	if (!current.ok) {
		return current;
	}
	if (!current.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales order not found",
		});
	}
	const stateValidation = validateOrderPostingState(current.data);
	if (!stateValidation.ok) {
		return stateValidation;
	}
	const lines = await deps.store.listOrderLines({
		organizationId: parsed.data.organizationId,
		orderId: parsed.data.orderId,
	});
	if (!lines.ok) {
		return lines;
	}
	if (lines.data.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order requires at least one line",
		});
	}
	const holds = await deps.store.listOpenHolds({
		organizationId: parsed.data.organizationId,
		orderId: parsed.data.orderId,
	});
	if (!holds.ok) {
		return holds;
	}
	if (holds.data.length > 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order has blocking holds",
		});
	}
	const credit = await checkOrderCredit(deps, current.data);
	if (!credit.ok) {
		return credit;
	}
	const availability = await checkOrderAvailability(
		deps,
		current.data,
		lines.data,
	);
	if (!availability.ok) {
		return availability;
	}
	const tax = await calculateOrderTax(
		deps,
		current.data,
		lines.data,
		parsed.data.taxTotal ?? current.data.taxTotal,
	);
	if (!tax.ok) {
		return tax;
	}
	return deps.store.releaseOrder(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			taxTotal: tax.data,
			actorUserId: parsed.data.actorUserId,
			at: deps.clock.now(),
			creditReference: credit.data,
			availabilityReference: availability.data,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.released.v1",
			entityType: "sales_order",
			code: current.data.code,
			action: "UPDATE",
		}),
	);
}

export async function recordSalesOrderFulfillment(
	input: z.input<typeof recordSalesFulfillmentInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = recordSalesFulfillmentInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter valid fulfillment progress",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.fulfillment.record",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.recordFulfillment(
		{ ...parsed.data },
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.fulfillment_recorded.v1",
			entityType: "sales_order",
			code: parsed.data.orderId,
			action: "UPDATE",
		}),
	);
}
export async function getSalesOrderById(
	input: z.input<typeof getSalesOrderInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = getSalesOrderInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales-order ID",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.order.get",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.getOrder({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}
export async function listSalesOrders(
	input: z.input<typeof listSalesOrdersInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = listSalesOrdersInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter valid sales-order filters",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.order.list",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.listOrders({
		organizationId: parsed.data.organizationId,
		cursor: parsed.data.cursor,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
	});
}
export async function getFulfillableSalesOrder(
	input: z.input<typeof getSalesOrderInputSchema>,
	options: SalesQueryOptions = {},
): Promise<Result<FulfillableSalesOrder | null>> {
	const order = await getSalesOrderById(input, options);
	if (!order.ok) {
		return order;
	}
	if (!order.data) {
		return { ok: true, data: null };
	}
	if (
		!(["released", "partially_fulfilled"] as SalesOrderStatus[]).includes(
			order.data.status,
		)
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order is not released for fulfillment",
		});
	}
	const deps = resolveSalesDeps(options);
	const lines = await deps.store.listOrderLines({
		organizationId: order.data.organizationId,
		orderId: order.data.id,
	});
	if (!lines.ok) {
		return lines;
	}
	const schedules = await deps.store.listOrderSchedules({
		organizationId: order.data.organizationId,
		orderId: order.data.id,
	});
	if (!schedules.ok) {
		return schedules;
	}
	return {
		ok: true,
		data: { order: order.data, lines: lines.data, schedules: schedules.data },
	};
}
