import { fail, type Result } from "@afenda/errors/result";
import {
	itemIdSchema,
	partyIdSchema,
	paymentTermIdSchema,
} from "@afenda/master-data";
import { z } from "zod";
import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "../../authorization";
import { salesOrderIdSchema, salesOrderLineIdSchema } from "../../brands";
import {
	resolveSalesDeps,
	type SalesCommandOptions,
	type SalesQueryOptions,
} from "../../command-options";
import {
	salesMutationContextSchema,
	salesQueryContextSchema,
	salesVersionedMutationContextSchema,
} from "../../contracts/context";
import {
	addDecimals,
	currencyCodeSchema,
	multiplyDecimal,
	nonNegativeDecimalAmountSchema,
} from "../../contracts/money";
import type {
	FulfillableSalesOrder,
	SalesOrder,
	SalesOrderLine,
	SalesOrderStatus,
} from "../../types";
import { salesEvidence } from "../integration-projections/evidence";

const positiveDecimal = nonNegativeDecimalAmountSchema.refine(
	(value) => value !== "0" && !/^0(?:\.0+)?$/u.test(value),
);
export const createSalesOrderInputSchema = salesMutationContextSchema.extend({
	code: z.string().trim().min(1).max(64),
	partyId: partyIdSchema,
	paymentTermId: paymentTermIdSchema.optional(),
	currencyCode: currencyCodeSchema,
	exchangeRate: positiveDecimal.optional(),
	billToAddressSnapshot: z.string().trim().min(1).max(4_000).optional(),
	shipToAddressSnapshot: z.string().trim().min(1).max(4_000).optional(),
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

function requireMaster<T>(value: T | undefined, name: string): Result<T> {
	return value
		? { ok: true, data: value }
		: fail("INTERNAL_ERROR", `${name} port is required`);
}

export async function createDraftSalesOrder(
	input: z.input<typeof createSalesOrderInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = createSalesOrderInputSchema.safeParse(input);
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter a valid sales order",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.create",
	});
	if (!auth.ok) return auth;
	const master = requireMaster(deps.masterData, "Master-data snapshot");
	if (!master.ok) return master;
	const customer = await master.data.resolveCustomer({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.partyId,
		paymentTermId: parsed.data.paymentTermId,
	});
	if (!customer.ok) return customer;
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
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter a valid sales-order line",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.line.add",
	});
	if (!auth.ok) return auth;
	const master = requireMaster(deps.masterData, "Master-data snapshot");
	if (!master.ok) return master;
	const item = await master.data.resolveItem({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		itemId: parsed.data.itemId,
		requestedUomId: parsed.data.requestedUomId,
	});
	if (!item.ok) return item;
	const discount = parsed.data.discountAmount ?? "0";
	const tax = parsed.data.taxAmount ?? "0";
	const gross = multiplyDecimal(parsed.data.quantity, parsed.data.unitPrice);
	if (!gross.ok) return gross;
	const total = addDecimals([gross.data, `-${discount}`, tax]);
	if (!total.ok) return total;
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
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter a valid sales-order transition",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!auth.ok) return auth;
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

export async function postSalesOrder(
	input: z.input<typeof postSalesOrderInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = postSalesOrderInputSchema.safeParse(input);
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter a valid sales-order release",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.post",
	});
	if (!auth.ok) return auth;
	const current = await deps.store.getOrder({
		organizationId: parsed.data.organizationId,
		id: parsed.data.orderId,
	});
	if (!current.ok) return current;
	if (!current.data)
		return fail("NOT_FOUND", "Sales order not found", {
			reason: "SALES_NOT_FOUND",
		});
	if (
		!(current.data.status === "approved" || current.data.status === "confirmed")
	)
		return fail("CONFLICT", "Sales order requires approval before release", {
			reason: "SALES_INVALID_STATE",
			status: current.data.status,
		});
	const lines = await deps.store.listOrderLines({
		organizationId: parsed.data.organizationId,
		orderId: parsed.data.orderId,
	});
	if (!lines.ok) return lines;
	if (lines.data.length === 0)
		return fail("CONFLICT", "Sales order requires at least one line", {
			reason: "SALES_INVALID_STATE",
		});
	const holds = await deps.store.listOpenHolds({
		organizationId: parsed.data.organizationId,
		orderId: parsed.data.orderId,
	});
	if (!holds.ok) return holds;
	if (holds.data.length > 0)
		return fail("CONFLICT", "Sales order has blocking holds", {
			reason: "SALES_BLOCKING_HOLD",
			holds: holds.data.map((hold) => hold.kind),
		});
	let creditReference: string | undefined;
	if (deps.credit) {
		const creditResult = await deps.credit.check({
			organizationId: parsed.data.organizationId,
			customerId: current.data.customer.partyId,
			currencyCode: current.data.currencyCode,
			amount: current.data.documentTotal,
		});
		if (!creditResult.ok) return creditResult;
		if (!creditResult.data.approved)
			return fail("CONFLICT", "Sales order failed credit approval", {
				reason: "SALES_INTEGRATION_REJECTED",
				reference: creditResult.data.reference,
			});
		creditReference = creditResult.data.reference;
	}
	let availabilityReference: string | undefined;
	if (deps.availability) {
		const availabilityResult = await deps.availability.check({
			organizationId: parsed.data.organizationId,
			lines: lines.data.map((line) => ({
				itemId: line.item.itemId,
				quantity: line.quantity,
				requestedDate: deps.clock.now(),
			})),
		});
		if (!availabilityResult.ok) return availabilityResult;
		if (!availabilityResult.data.available)
			return fail("CONFLICT", "Sales order has unavailable quantities", {
				reason: "SALES_INTEGRATION_REJECTED",
				shortages: availabilityResult.data.shortages,
			});
		availabilityReference = availabilityResult.data.reference;
	}
	let taxTotal = parsed.data.taxTotal ?? current.data.taxTotal;
	if (deps.tax) {
		const tax = await deps.tax.calculate({
			organizationId: parsed.data.organizationId,
			customerId: current.data.customer.partyId,
			currencyCode: current.data.currencyCode,
			lines: lines.data.map((line) => ({
				itemId: line.item.itemId,
				quantity: line.quantity,
				netAmount: line.lineAmount,
			})),
		});
		if (!tax.ok) return tax;
		taxTotal = tax.data.totalTax;
	}
	return deps.store.releaseOrder(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.orderId,
			expectedVersion: parsed.data.expectedVersion,
			taxTotal,
			actorUserId: parsed.data.actorUserId,
			at: deps.clock.now(),
			creditReference,
			availabilityReference,
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
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter valid fulfillment progress",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.order.fulfillment.record",
	});
	if (!auth.ok) return auth;
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
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter a valid sales-order ID",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.order.get",
	});
	if (!auth.ok) return auth;
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
	if (!parsed.success)
		return fail(
			"BAD_REQUEST",
			"Enter valid sales-order filters",
			parsed.error.flatten(),
		);
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.order.list",
	});
	if (!auth.ok) return auth;
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
	if (!order.ok) return order;
	if (!order.data) return { ok: true, data: null };
	if (
		!(["released", "partially_fulfilled"] as SalesOrderStatus[]).includes(
			order.data.status,
		)
	)
		return fail("CONFLICT", "Sales order is not released for fulfillment", {
			reason: "SALES_INVALID_STATE",
			status: order.data.status,
		});
	const deps = resolveSalesDeps(options);
	const lines = await deps.store.listOrderLines({
		organizationId: order.data.organizationId,
		orderId: order.data.id,
	});
	if (!lines.ok) return lines;
	const schedules = await deps.store.listOrderSchedules({
		organizationId: order.data.organizationId,
		orderId: order.data.id,
	});
	if (!schedules.ok) return schedules;
	return {
		ok: true,
		data: { order: order.data, lines: lines.data, schedules: schedules.data },
	};
}
