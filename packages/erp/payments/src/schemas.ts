import { z } from "zod";

import {
	PAYMENT_ACCOUNT_KINDS,
	PAYMENT_DIRECTIONS,
	PAYMENT_PURPOSES,
	PAYMENT_STATUSES,
} from "./model";

const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
const mutation = {
	...identity,
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1).max(128),
};
const uuid = z.string().uuid();
const money = z
	.union([
		z.number().positive().finite(),
		z
			.string()
			.trim()
			.regex(/^\d+(?:\.\d{1,6})?$/),
	])
	.transform(String);
const currencyCode = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());
const code = z.string().trim().min(1).max(64);
const purpose = z.enum(PAYMENT_PURPOSES);

export const createPaymentAccountInputSchema = z.object({
	...mutation,
	code,
	name: z.string().trim().min(1).max(128),
	kind: z.enum(PAYMENT_ACCOUNT_KINDS).default("cash"),
	currencyCode,
	active: z.boolean().optional(),
});

export const listPaymentAccountsInputSchema = z.object({ ...identity });

export const createDraftPaymentInputSchema = z
	.object({
		...mutation,
		code,
		paymentAccountId: uuid,
		direction: z.enum(["receipt", "disbursement"]),
		purpose,
		counterpartyId: uuid.nullable().optional(),
		counterpartySnapshot: z
			.record(z.string(), z.unknown())
			.nullable()
			.optional(),
		currencyCode,
		amount: money,
		reference: z.string().trim().max(256).nullable().optional(),
	})
	.superRefine((value, ctx) => {
		if (
			(value.direction === "receipt" &&
				!["customer_receipt", "manual_receipt"].includes(value.purpose)) ||
			(value.direction === "disbursement" &&
				!["supplier_disbursement", "manual_disbursement"].includes(
					value.purpose,
				))
		) {
			ctx.addIssue({
				code: "custom",
				path: ["purpose"],
				message: "Purpose is incompatible with payment direction",
			});
		}
	});

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

export const postPaymentInputSchema = z.object({
	...mutation,
	paymentId: uuid,
	expectedVersion: z.number().int().positive(),
});

export const reversePaymentInputSchema = postPaymentInputSchema.extend({
	reason: z.string().trim().min(1).max(512),
});

export const createAndPostPaymentTransferInputSchema = z
	.object({
		...mutation,
		code,
		fromPaymentAccountId: uuid,
		toPaymentAccountId: uuid,
		amount: money,
		currencyCode,
		reference: z.string().trim().max(256).nullable().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.fromPaymentAccountId === value.toPaymentAccountId) {
			ctx.addIssue({
				code: "custom",
				path: ["toPaymentAccountId"],
				message: "Transfer accounts must differ",
			});
		}
	});

export const postRefundInputSchema = z.object({
	...mutation,
	code,
	originalPaymentId: uuid,
	paymentAccountId: uuid,
	refundSource: z.enum(["customer_payment", "customer_credit", "manual"]),
	amount: money,
	reference: z.string().trim().max(256).nullable().optional(),
});

export const markApplicationInstructionAppliedInputSchema = z.object({
	...mutation,
	instructionId: uuid,
	appliedAmount: money,
});

export const markApplicationInstructionRejectedInputSchema = z.object({
	...mutation,
	instructionId: uuid,
	rejectionCode: z.string().trim().min(1).max(64),
});

export const getPaymentByIdInputSchema = z.object({ ...identity, id: uuid });

export const listPaymentsInputSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(PAYMENT_STATUSES).optional(),
	direction: z.enum(PAYMENT_DIRECTIONS).optional(),
});

export const getPaymentApplicationAvailabilityInputSchema = z.object({
	...identity,
	paymentId: uuid,
});

export { money };
