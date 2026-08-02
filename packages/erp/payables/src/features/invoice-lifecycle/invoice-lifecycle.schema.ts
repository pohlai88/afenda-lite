import { z } from "zod";

import {
	correlated,
	currencyCode,
	documentCreateSchema,
	identity,
	positiveDecimal,
	uuid,
} from "../../kernel/validation/common.schema";

export const createInvoiceInputSchema = documentCreateSchema;

export const addInvoiceLineInputSchema = z.object({
	...correlated,
	description: z.string().trim().min(1).max(512),
	invoiceId: uuid,
	itemId: uuid,
	quantity: positiveDecimal,
	unitPrice: positiveDecimal,
});

export const matchInvoiceInputSchema = z.object({
	...correlated,
	expectedVersion: z.number().int().positive(),
	goodsReceiptId: uuid,
	invoiceId: uuid,
	purchaseOrderId: uuid,
});

export const versionedInvoiceInputSchema = z.object({
	...correlated,
	expectedVersion: z.number().int().positive(),
	invoiceId: uuid,
});

export const getInvoiceInputSchema = z.object({ ...identity, id: uuid });

export const listInvoicesInputSchema = z.object({
	...identity,
	currencyCode: currencyCode.optional(),
	documentType: z.enum(["invoice", "credit_note"]).optional(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(["draft", "matched", "posted", "cancelled"]).optional(),
	supplierId: uuid.optional(),
});
