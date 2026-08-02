import { z } from "zod";

import {
	currencyCode,
	identity,
	money,
	mutation,
	uuid,
} from "../../kernel/validation/common.schema";

export const addPaymentApplicationInstructionInputSchema = z.object({
	...mutation,
	paymentId: uuid,
	targetModule: z.enum(["receivables", "payables"]),
	/** V1: invoice targets only — credit-document apply is out of v1. */
	targetDocumentType: z.enum(["customer_invoice", "supplier_invoice"]),
	targetDocumentId: uuid,
	intendedAmount: money,
	currencyCode,
});

const rate = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d{1,6})?$/);

export const applicationFxContextSchema = z.object({
	documentCurrency: currencyCode,
	appliedDocumentAmount: money,
	documentBookedRate: rate,
	appliedFunctionalAmount: money,
});

export const markApplicationInstructionAppliedInputSchema = z.object({
	...mutation,
	instructionId: uuid,
	appliedAmount: money,
	fx: applicationFxContextSchema.nullable().optional(),
});

export const markApplicationInstructionRejectedInputSchema = z.object({
	...mutation,
	instructionId: uuid,
	rejectionCode: z.string().trim().min(1).max(64),
});

export const getPaymentApplicationAvailabilityInputSchema = z.object({
	...identity,
	paymentId: uuid,
});
