import { z } from "zod";

import {
	correlated,
	positiveDecimal,
	uuid,
} from "../../kernel/validation/common.schema";

export const applyPaymentInputSchema = z.object({
	...correlated,
	amount: positiveDecimal,
	idempotencyKey: z.string().trim().min(1).max(128),
	invoiceId: uuid,
	paymentApplicationInstructionId: uuid,
	paymentId: uuid,
});

export const applyCreditInputSchema = z.object({
	...correlated,
	amount: positiveDecimal,
	creditNoteId: uuid,
	idempotencyKey: z.string().trim().min(1).max(128),
	invoiceId: uuid,
});

export const reversePaymentApplicationInputSchema = z.object({
	...correlated,
	idempotencyKey: z.string().trim().min(1).max(128),
	paymentId: uuid,
});
