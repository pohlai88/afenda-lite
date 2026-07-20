import { z } from "zod";

import { SALES_INVOICE_SOURCES, SALES_INVOICE_STATUSES } from "./types";

const organizationIdSchema = z.string().trim().min(1);
const actorUserIdSchema = z.string().trim().min(1);
const correlationIdSchema = z.string().trim().min(1);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const uuid = z.string().uuid();
const money = z
	.union([z.number().positive(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const number = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(number) || number <= 0) {
			ctx.addIssue({ code: "custom", message: "Amount must be positive" });
			return z.NEVER;
		}
		return String(number);
	});

const identity = {
	organizationId: organizationIdSchema,
	actorUserId: actorUserIdSchema,
};
const mutationContext = {
	...identity,
	correlationId: correlationIdSchema,
	idempotencyKey: idempotencyKeySchema,
};

export const createDraftSalesInvoiceInputSchema = z
	.object({
		...mutationContext,
		code: z.string().trim().min(1).max(64),
		customerId: uuid,
		customerCode: z.string().trim().min(1).max(64),
		customerName: z.string().trim().min(1).max(256),
		currencyCode: z
			.string()
			.trim()
			.length(3)
			.transform((value) => value.toUpperCase()),
		invoiceSource: z.enum(SALES_INVOICE_SOURCES).default("manual"),
		salesOrderId: uuid.optional(),
		deliveryId: uuid.optional(),
		invoiceDate: z.coerce.date().optional(),
		accountingDate: z.coerce.date().optional(),
		dueDate: z.coerce.date().optional(),
		paymentTermCode: z.string().trim().min(1).max(64).optional(),
		paymentTermDescription: z.string().trim().min(1).max(256).optional(),
		manualReason: z.string().trim().min(1).max(512).optional(),
	})
	.superRefine((value, ctx) => {
		if (
			(value.invoiceSource === "manual" ||
				value.invoiceSource === "opening_balance") &&
			(value.manualReason === undefined || value.manualReason.length === 0)
		) {
			ctx.addIssue({
				code: "custom",
				message: "Manual and opening-balance invoices require a reason",
				path: ["manualReason"],
			});
		}
		if (
			value.invoiceSource === "sales_order" &&
			value.salesOrderId === undefined
		) {
			ctx.addIssue({
				code: "custom",
				message: "salesOrderId is required for sales_order source",
				path: ["salesOrderId"],
			});
		}
		if (value.invoiceSource === "delivery" && value.deliveryId === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "deliveryId is required for delivery source",
				path: ["deliveryId"],
			});
		}
	});

export const addSalesInvoiceLineInputSchema = z.object({
	...mutationContext,
	invoiceId: uuid,
	itemId: uuid,
	itemCode: z.string().trim().min(1).max(64),
	itemName: z.string().trim().min(1).max(256),
	description: z.string().trim().min(1).max(512),
	quantity: money,
	unitPrice: money,
	salesOrderLineId: uuid.optional(),
	deliveryLineId: uuid.optional(),
});

export const postSalesInvoiceInputSchema = z.object({
	...mutationContext,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});

export const issueCreditNoteInputSchema = z.object({
	...mutationContext,
	code: z.string().trim().min(1).max(64),
	salesInvoiceId: uuid,
	customerId: uuid,
	customerCode: z.string().trim().min(1).max(64),
	customerName: z.string().trim().min(1).max(256),
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase()),
	amount: money,
});

export const applyCustomerReceiptInputSchema = z.object({
	...mutationContext,
	paymentId: uuid,
	paymentApplicationInstructionId: uuid,
	salesInvoiceId: uuid,
	amount: money,
	expectedInvoiceVersion: z.number().int().positive(),
});

export const reverseCustomerReceiptApplicationInputSchema = z.object({
	...mutationContext,
	allocationId: uuid,
});

export const reverseCustomerAllocationsByPaymentInputSchema = z.object({
	...mutationContext,
	paymentId: uuid,
});

export const cancelDraftSalesInvoiceInputSchema = z.object({
	...mutationContext,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});

export const closeSalesInvoiceInputSchema = z.object({
	...mutationContext,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});

export const getSalesInvoiceByIdInputSchema = z.object({
	...identity,
	id: uuid,
});

export const listSalesInvoicesInputSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(SALES_INVOICE_STATUSES).optional(),
});

export const getCustomerBalanceInputSchema = z.object({
	...identity,
	customerId: uuid,
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase())
		.optional(),
});

export const getCustomerAgingInputSchema = z.object({
	...identity,
	customerId: uuid,
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase()),
	asOfDate: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export { money };
