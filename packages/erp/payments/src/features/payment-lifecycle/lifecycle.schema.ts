import { z } from "zod";

import {
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

export const getPaymentByIdInputSchema = z.object({ ...identity, id: uuid });

export const listPaymentsInputSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(PAYMENT_STATUSES).optional(),
	direction: z.enum(PAYMENT_DIRECTIONS).optional(),
});
