import { z } from "zod";

import {
	INSTRUMENT_CLEARANCE_STATUSES,
	PAYMENT_DEDUCTION_EFFECTS,
	PAYMENT_DEDUCTION_KINDS,
	PAYMENT_DIRECTIONS,
	PAYMENT_PURPOSES,
	PAYMENT_STATUSES,
} from "../../kernel/contracts/domain";
import {
	code,
	currencyCode,
	identity,
	money,
	mutation,
	uuid,
} from "../../kernel/validation/common.schema";

const purpose = z.enum(PAYMENT_PURPOSES);

const rate = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d{1,6})?$/);

export const paymentInstrumentSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("check"),
		number: z.string().trim().min(1).max(64),
		issuedOn: z.string().date(),
		clearanceDate: z.string().date().optional(),
		bankReference: z.string().trim().max(128).optional(),
	}),
	z.object({
		kind: z.literal("bank-transfer"),
		bankReference: z.string().trim().min(1).max(128),
		valueDate: z.string().date().optional(),
	}),
	z.object({
		kind: z.literal("card"),
		authorizationReference: z.string().trim().max(128).optional(),
		settlementReference: z.string().trim().max(128).optional(),
	}),
	z.object({
		kind: z.literal("gateway"),
		providerReference: z.string().trim().min(1).max(128),
	}),
	z.object({
		kind: z.literal("other"),
		reference: z.string().trim().max(128).optional(),
	}),
]);

export const fxContextSchema = z.object({
	transactionCurrency: currencyCode,
	functionalCurrency: currencyCode,
	exchangeRate: rate,
	rateDate: z.string().date(),
	rateSource: z.string().trim().max(128).nullable().default(null),
});

export const deductionLineSchema = z.object({
	kind: z.enum(PAYMENT_DEDUCTION_KINDS),
	effect: z.enum(PAYMENT_DEDUCTION_EFFECTS).optional(),
	amount: money,
	accountingPurposeCode: z.string().trim().min(1).max(64),
	description: z.string().trim().max(256).nullable().optional(),
});

export const updateInstrumentClearanceInputSchema = z
	.object({
		...mutation,
		paymentId: uuid,
		expectedVersion: z.number().int().positive(),
		status: z.enum(INSTRUMENT_CLEARANCE_STATUSES),
		clearanceDate: z.string().date().nullable().optional(),
		settlementReference: z.string().trim().max(128).nullable().optional(),
		reason: z.string().trim().max(512).nullable().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.status === "cleared" && !value.clearanceDate) {
			ctx.addIssue({
				code: "custom",
				path: ["clearanceDate"],
				message: "clearanceDate is required when status is cleared",
			});
		}
		if (value.status === "pending" && value.clearanceDate) {
			ctx.addIssue({
				code: "custom",
				path: ["clearanceDate"],
				message: "clearanceDate is forbidden when status is pending",
			});
		}
	});

export const createDraftPaymentInputSchema = z
	.object({
		...mutation,
		code,
		paymentAccountId: uuid,
		paymentMethodId: uuid,
		instrument: paymentInstrumentSchema.nullable().optional(),
		fxContext: fxContextSchema.nullable().optional(),
		deductions: z.array(deductionLineSchema).max(20).default([]),
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
		paymentMethodId: uuid,
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
	paymentMethodId: uuid,
	instrument: paymentInstrumentSchema.nullable().optional(),
	fxContext: fxContextSchema.nullable().optional(),
	deductions: z.array(deductionLineSchema).max(20).default([]),
	refundSource: z.enum(["customer_payment", "customer_credit", "manual"]),
	amount: money,
	reference: z.string().trim().max(256).nullable().optional(),
});

export const getPaymentByIdInputSchema = z.object({ ...identity, id: uuid });

export const listPaymentsInputSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(PAYMENT_STATUSES).optional(),
	direction: z.enum(PAYMENT_DIRECTIONS).optional(),
});
