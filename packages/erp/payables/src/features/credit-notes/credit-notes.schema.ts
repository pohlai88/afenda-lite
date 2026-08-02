import { z } from "zod";

import {
	correlated,
	documentCreateSchema,
	positiveDecimal,
	uuid,
} from "../../kernel/validation/common.schema";

export const createCreditNoteInputSchema = documentCreateSchema;

export const issueCreditNoteInputSchema = documentCreateSchema.extend({
	amount: positiveDecimal,
	description: z.string().trim().min(1).max(512).default("Supplier credit"),
	itemId: uuid,
});

export const addCreditNoteLineInputSchema = z.object({
	...correlated,
	creditNoteId: uuid,
	description: z.string().trim().min(1).max(512),
	itemId: uuid,
	quantity: positiveDecimal,
	unitPrice: positiveDecimal,
});

export const postCreditNoteInputSchema = z.object({
	...correlated,
	creditNoteId: uuid,
	expectedVersion: z.number().int().positive(),
});
