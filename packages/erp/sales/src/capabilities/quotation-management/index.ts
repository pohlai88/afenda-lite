import { errorResult, type Result } from "@afenda/errors";
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
import { salesQuotationIdSchema } from "../../brands";
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
import { salesPageRequestSchema } from "../../pagination";
import type { SalesOrder, SalesQuotationStatus } from "../../types";
import { salesEvidence } from "../integration-projections/evidence";

const ZERO_DECIMAL_PATTERN = /^0(?:\.0+)?$/u;
const positiveDecimal = nonNegativeDecimalAmountSchema.refine(
	(value) => value !== "0" && !ZERO_DECIMAL_PATTERN.test(value),
);
export const createSalesQuotationInputSchema =
	salesMutationContextSchema.extend({
		code: z.string().trim().min(1).max(64),
		partyId: partyIdSchema,
		paymentTermId: paymentTermIdSchema.optional(),
		currencyCode: currencyCodeSchema,
		validUntil: z.coerce.date(),
	});
export const addSalesQuotationLineInputSchema =
	salesVersionedMutationContextSchema.extend({
		quotationId: salesQuotationIdSchema,
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
	});
export const quotationTransitionInputSchema =
	salesVersionedMutationContextSchema.extend({
		quotationId: salesQuotationIdSchema,
	});
export const getSalesQuotationInputSchema = salesQueryContextSchema.extend({
	id: salesQuotationIdSchema,
});
export const listSalesQuotationsInputSchema = salesPageRequestSchema;

function required<T>(value: T | undefined, _name: string): Result<T> {
	return value ? { ok: true, data: value } : errorResult.fail("INTERNAL_ERROR");
}
export async function createDraftSalesQuotation(
	input: z.input<typeof createSalesQuotationInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = createSalesQuotationInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid sales quotation",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.quotation.create",
	});
	if (!auth.ok) {
		return auth;
	}
	const master = required(deps.masterData, "Master-data snapshot");
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
	return deps.store.createQuotation(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: parsed.data.code,
			normalizedCode: parsed.data.code.toUpperCase(),
			revision: 1,
			status: "draft",
			customer: customer.data,
			currencyCode: parsed.data.currencyCode,
			validUntil: parsed.data.validUntil,
			subtotalAmount: "0",
			discountTotal: "0",
			taxTotal: "0",
			documentTotal: "0",
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.quotation.created.v1",
			entityType: "sales_quotation",
			code: parsed.data.code,
			action: "CREATE",
		}),
	);
}
export async function addSalesQuotationLine(
	input: z.input<typeof addSalesQuotationLineInputSchema>,
	options: SalesCommandOptions = {},
) {
	const parsed = addSalesQuotationLineInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid quotation line",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.quotation.line.add",
	});
	if (!auth.ok) {
		return auth;
	}
	const master = required(deps.masterData, "Master-data snapshot");
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
	return deps.store.addQuotationLine(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			expectedVersion: parsed.data.expectedVersion,
			quotationId: parsed.data.quotationId,
			item: item.data,
			quantity: parsed.data.quantity,
			unitPrice: parsed.data.unitPrice,
			discountAmount: discount,
			taxAmount: tax,
			lineAmount: total.data,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.quotation.line_added.v1",
			entityType: "sales_quotation_line",
			code: parsed.data.quotationId,
			action: "CREATE",
		}),
	);
}
export async function getSalesQuotation(
	input: z.input<typeof getSalesQuotationInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = getSalesQuotationInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid quotation ID",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.quotation.get",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.getQuotation({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}

export async function listSalesQuotations(
	input: z.input<typeof listSalesQuotationsInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = listSalesQuotationsInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter valid quotation filters",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.quotation.list",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.listQuotations(parsed.data);
}
async function transition(
	command:
		| "sales.quotation.submit"
		| "sales.quotation.approve"
		| "sales.quotation.send"
		| "sales.quotation.accept"
		| "sales.quotation.expire"
		| "sales.quotation.reject"
		| "sales.quotation.cancel",
	status: SalesQuotationStatus,
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions,
) {
	const parsed = quotationTransitionInputSchema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid quotation transition",
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
	return deps.store.transitionQuotation(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.quotationId,
			expectedVersion: parsed.data.expectedVersion,
			status,
			actorUserId: parsed.data.actorUserId,
		},
		salesEvidence({
			...parsed.data,
			eventType: `sales.quotation.${status}.v1`,
			entityType: "sales_quotation",
			code: parsed.data.quotationId,
			action: "UPDATE",
		}),
	);
}
export const submitSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.submit", "submitted", input, options);
export const approveSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.approve", "approved", input, options);
export const sendSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.send", "sent", input, options);
export const acceptSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.accept", "accepted", input, options);
export const expireSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.expire", "expired", input, options);
export const rejectSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.reject", "rejected", input, options);
export const cancelSalesQuotation = (
	input: z.input<typeof quotationTransitionInputSchema>,
	options: SalesCommandOptions = {},
) => transition("sales.quotation.cancel", "cancelled", input, options);

export async function convertSalesQuotationToOrder(
	input: z.input<typeof quotationTransitionInputSchema> & { orderCode: string },
	options: SalesCommandOptions = {},
): Promise<Result<SalesOrder>> {
	const parsed = quotationTransitionInputSchema
		.extend({ orderCode: z.string().trim().min(1).max(64) })
		.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Enter a valid quotation conversion",
		});
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.quotation.convert",
	});
	if (!auth.ok) {
		return auth;
	}
	const quotation = await deps.store.getQuotation({
		organizationId: parsed.data.organizationId,
		id: parsed.data.quotationId,
	});
	if (!quotation.ok) {
		return quotation;
	}
	if (!quotation.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales quotation not found",
		});
	}
	if (quotation.data.status !== "accepted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Only accepted quotations can be converted",
		});
	}
	const order = await deps.store.createOrder(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: parsed.data.orderCode,
			normalizedCode: parsed.data.orderCode.toUpperCase(),
			status: "draft",
			customer: quotation.data.customer,
			currencyCode: quotation.data.currencyCode,
			subtotalAmount: quotation.data.subtotalAmount,
			discountTotal: quotation.data.discountTotal,
			taxTotal: quotation.data.taxTotal,
			documentTotal: quotation.data.documentTotal,
			sourceQuotationId: quotation.data.id,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.order.created_from_quotation.v1",
			entityType: "sales_order",
			code: parsed.data.orderCode,
			action: "CREATE",
		}),
	);
	if (!order.ok) {
		return order;
	}
	const transitioned = await deps.store.transitionQuotation(
		{
			organizationId: parsed.data.organizationId,
			id: quotation.data.id,
			expectedVersion: quotation.data.version,
			status: "converted",
			actorUserId: parsed.data.actorUserId,
			convertedOrderId: order.data.id,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.quotation.converted.v1",
			entityType: "sales_quotation",
			code: quotation.data.code,
			action: "UPDATE",
		}),
	);
	if (!transitioned.ok) {
		return transitioned;
	}
	return order;
}
