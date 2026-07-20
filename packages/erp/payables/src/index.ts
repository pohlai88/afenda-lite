import "server-only";

import { fail, ok, type Result } from "@afenda/errors/result";
import { createEventPublisher } from "@afenda/events";
import { z } from "zod";

import {
	type PayablesAuthorizationPort,
	type PayablesPermission,
	requirePayablesPermission,
} from "./authorization";
import { createDrizzlePayablesStore } from "./drizzle-store";
import { evaluateThreeWayMatch } from "./match-validation";
import type {
	PayablesCommandOptions,
	PayablesEffects,
	PayablesStore,
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceLine,
} from "./model";

export {
	type PayablesAuthorizationPort,
	type PayablesPermission,
	requirePayablesPermission,
} from "./authorization";
export {
	createDrizzlePayablesStore,
	DrizzlePayablesStore,
} from "./drizzle-store";
export { createMemoryPayablesStore, MemoryPayablesStore } from "./memory-store";
export type {
	GoodsReceiptMatchBasis,
	GoodsReceiptMatchQueryPort,
	PayablesCommandOptions,
	PayablesEffects,
	PayablesStore,
	PostedPaymentBasis,
	PostedPaymentQueryPort,
	PurchaseOrderMatchBasis,
	PurchaseOrderMatchQueryPort,
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
	ThreeWayMatchResult,
	ThreeWayMatchStatus,
} from "./model";
export {
	SUPPLIER_INVOICE_STATUSES,
	THREE_WAY_MATCH_STATUSES,
} from "./model";

const identity = {
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
};
const correlated = { ...identity, correlationId: z.string().trim().min(1) };
const uuid = z.string().uuid();
const positiveDecimal = z
	.union([z.number().positive(), z.string().trim().min(1)])
	.transform((value, ctx) => {
		const number = typeof value === "number" ? value : Number(value);
		if (!Number.isFinite(number) || number <= 0) {
			ctx.addIssue({ code: "custom", message: "Amount must be positive" });
			return z.NEVER;
		}
		return String(number);
	});
const createSchema = z.object({
	...correlated,
	code: z.string().trim().min(1).max(64),
	supplierId: uuid,
	supplierCode: z.string().trim().min(1).max(64),
	supplierName: z.string().trim().min(1).max(256),
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase()),
});
const addLineSchema = z.object({
	...correlated,
	invoiceId: uuid,
	itemId: uuid,
	description: z.string().trim().min(1).max(512),
	quantity: positiveDecimal,
	unitPrice: positiveDecimal,
});
const matchSchema = z.object({
	...correlated,
	invoiceId: uuid,
	purchaseOrderId: uuid,
	goodsReceiptId: uuid,
	expectedVersion: z.number().int().positive(),
});
const versionedSchema = z.object({
	...correlated,
	invoiceId: uuid,
	expectedVersion: z.number().int().positive(),
});
const creditSchema = createSchema.extend({
	amount: positiveDecimal,
	itemId: uuid,
	description: z.string().trim().min(1).max(512).default("Supplier credit"),
});
const applySchema = z.object({
	...correlated,
	invoiceId: uuid,
	amount: positiveDecimal,
	paymentId: uuid,
	paymentApplicationInstructionId: uuid,
	idempotencyKey: z.string().trim().min(1).max(128),
});
const applyCreditSchema = z.object({
	...correlated,
	invoiceId: uuid,
	creditNoteId: uuid,
	amount: positiveDecimal,
	idempotencyKey: z.string().trim().min(1).max(128),
});
const reversePaymentApplicationSchema = z.object({
	...correlated,
	paymentId: uuid,
	idempotencyKey: z.string().trim().min(1).max(128),
});
const getSchema = z.object({ ...identity, id: uuid });
const listSchema = z.object({
	...identity,
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(50),
	status: z.enum(["draft", "matched", "posted", "cancelled"]).optional(),
	supplierId: uuid.optional(),
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase())
		.optional(),
	documentType: z.enum(["invoice", "credit_note"]).optional(),
});
const creditLineSchema = z.object({
	...correlated,
	creditNoteId: uuid,
	itemId: uuid,
	description: z.string().trim().min(1).max(512),
	quantity: positiveDecimal,
	unitPrice: positiveDecimal,
});
const creditPostSchema = z.object({
	...correlated,
	creditNoteId: uuid,
	expectedVersion: z.number().int().positive(),
});
const balanceSchema = z.object({
	...identity,
	supplierId: uuid,
	currencyCode: z
		.string()
		.trim()
		.length(3)
		.transform((value) => value.toUpperCase())
		.optional(),
});

let productionStore: PayablesStore | undefined;

function resolveStore(store?: PayablesStore): PayablesStore {
	if (store !== undefined) return store;
	if (productionStore === undefined) {
		productionStore = createDrizzlePayablesStore();
	}
	return productionStore;
}

function resolveEffects(effects?: PayablesEffects): PayablesEffects {
	if (effects !== undefined) return effects;
	const publisher = createEventPublisher();
	return {
		async emit(event) {
			const result = await publisher.publish({
				type: event.type,
				sourceModule: "payables",
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				payload: event.payload,
			});
			return result.ok ? ok(undefined) : result;
		},
	};
}

function parse<T>(
	schema: z.ZodType<T>,
	input: unknown,
	message: string,
): Result<T> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? ok(parsed.data)
		: fail("BAD_REQUEST", message, {
				fieldErrors: parsed.error.flatten().fieldErrors,
			});
}

async function authorize(
	authorization: PayablesAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string },
	permission: PayablesPermission,
): Promise<Result<void>> {
	return requirePayablesPermission(authorization, { ...input, permission });
}

function normalizedCode(code: string): string {
	return code.trim().toUpperCase();
}

export async function createDraftSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		createSchema,
		input,
		"Invalid supplier invoice create input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).createInvoice({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		documentType: "invoice",
		effects: resolveEffects(options.effects),
	});
}

export async function addSupplierInvoiceLine(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoiceLine>> {
	const parsed = parse(
		addLineSchema,
		input,
		"Invalid supplier invoice line input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).addLine(parsed.data);
}

export async function matchSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		matchSchema,
		input,
		"Invalid supplier invoice match input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;

	if (
		options.purchaseOrderMatch === undefined ||
		options.goodsReceiptMatch === undefined
	) {
		return fail(
			"UNAUTHORIZED",
			"Purchase order and goods receipt match ports are required",
		);
	}

	const store = resolveStore(options.store);
	const invoiceResult = await store.getById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!invoiceResult.ok) return invoiceResult;
	if (invoiceResult.data === null) {
		return fail("NOT_FOUND", "Supplier invoice not found");
	}
	const invoice = invoiceResult.data;
	if (invoice.version !== parsed.data.expectedVersion) {
		return fail("CONFLICT", "Supplier invoice version conflict");
	}
	if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
		return fail("CONFLICT", "Only draft supplier invoices can be matched");
	}
	if (invoice.lines.length === 0) {
		return fail("CONFLICT", "Cannot match an invoice without lines");
	}
	if (Number(invoice.totalAmount) <= 0) {
		return fail("CONFLICT", "Cannot match an invoice without a positive total");
	}

	const poBasis = await options.purchaseOrderMatch.getPurchaseOrderMatchBasis({
		organizationId: parsed.data.organizationId,
		purchaseOrderId: parsed.data.purchaseOrderId,
	});
	if (!poBasis.ok) return poBasis;
	if (poBasis.data === null) {
		return fail("NOT_FOUND", "Purchase order not found for matching");
	}

	const grBasis = await options.goodsReceiptMatch.getGoodsReceiptMatchBasis({
		organizationId: parsed.data.organizationId,
		goodsReceiptId: parsed.data.goodsReceiptId,
	});
	if (!grBasis.ok) return grBasis;
	if (grBasis.data === null) {
		return fail("NOT_FOUND", "Goods receipt not found for matching");
	}

	const matchEvaluation = evaluateThreeWayMatch({
		invoice,
		purchaseOrder: poBasis.data,
		goodsReceipt: grBasis.data,
	});
	if (!matchEvaluation.ok) return matchEvaluation;

	return store.matchInvoice({
		...parsed.data,
		matchStatus: matchEvaluation.data.status,
		evidence: matchEvaluation.data.evidence,
		purchaseOrderVersion: poBasis.data.version,
		goodsReceiptVersion: grBasis.data.version,
		effects: resolveEffects(options.effects),
	});
}

export async function postSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		versionedSchema,
		input,
		"Invalid supplier invoice post input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	const store = resolveStore(options.store);
	const current = await store.getById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!current.ok) return current;
	if (current.data === null)
		return fail("NOT_FOUND", "Supplier invoice not found");
	const match = current.data.matchResult;
	if (match === null || match.result === "exception") {
		return fail(
			"CONFLICT",
			"Supplier invoice requires a successful three-way match",
		);
	}
	if (
		options.purchaseOrderMatch === undefined ||
		options.goodsReceiptMatch === undefined
	) {
		return fail("UNAUTHORIZED", "Match ports are required before posting");
	}
	const [purchaseOrder, goodsReceipt] = await Promise.all([
		options.purchaseOrderMatch.getPurchaseOrderMatchBasis({
			organizationId: parsed.data.organizationId,
			purchaseOrderId: match.purchaseOrderId,
		}),
		options.goodsReceiptMatch.getGoodsReceiptMatchBasis({
			organizationId: parsed.data.organizationId,
			goodsReceiptId: match.goodsReceiptId,
		}),
	]);
	if (!purchaseOrder.ok) return purchaseOrder;
	if (!goodsReceipt.ok) return goodsReceipt;
	if (
		purchaseOrder.data === null ||
		goodsReceipt.data === null ||
		purchaseOrder.data.version !== match.purchaseOrderVersion ||
		goodsReceipt.data.version !== match.goodsReceiptVersion
	) {
		return fail(
			"CONFLICT",
			"Three-way match evidence is stale; rematch before posting",
		);
	}
	return store.postInvoice({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function issueSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		creditSchema,
		input,
		"Invalid supplier credit note input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	const created = await createDraftSupplierCreditNote(parsed.data, options);
	if (!created.ok) return created;
	const line = await addSupplierCreditNoteLine(
		{
			...parsed.data,
			creditNoteId: created.data.id,
			itemId: parsed.data.itemId,
			description: parsed.data.description,
			quantity: "1",
			unitPrice: parsed.data.amount,
		},
		options,
	);
	if (!line.ok) return line;
	return postSupplierCreditNote(
		{
			...parsed.data,
			creditNoteId: created.data.id,
			expectedVersion: created.data.version + 1,
		},
		options,
	);
}

export async function createDraftSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		createSchema,
		input,
		"Invalid supplier credit note create input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).createCredit({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		documentType: "credit_note",
		effects: resolveEffects(options.effects),
	});
}

export async function addSupplierCreditNoteLine(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoiceLine>> {
	const parsed = parse(
		creditLineSchema,
		input,
		"Invalid supplier credit note line input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).addCreditLine(parsed.data);
}

export async function postSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		creditPostSchema,
		input,
		"Invalid supplier credit note post input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).postCredit({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

/**
 * Apply a posted Payment to a posted supplier invoice.
 * Payables owns `supplier_allocation` only — never creates Payment rows.
 */
export async function applySupplierPayment(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation>> {
	const parsed = parse(
		applySchema,
		input,
		"Invalid supplier payment apply input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;

	if (options.postedPayment === undefined) {
		return fail("UNAUTHORIZED", "Posted payment query port is required");
	}

	const store = resolveStore(options.store);
	const invoiceResult = await store.getById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!invoiceResult.ok) return invoiceResult;
	if (invoiceResult.data === null) {
		return fail("NOT_FOUND", "Supplier invoice not found");
	}
	const invoice = invoiceResult.data;
	if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
		return fail(
			"CONFLICT",
			"Payment application requires a posted supplier invoice",
		);
	}

	const paymentBasis = await options.postedPayment.getPostedPayment({
		organizationId: parsed.data.organizationId,
		paymentId: parsed.data.paymentId,
	});
	if (!paymentBasis.ok) return paymentBasis;
	if (paymentBasis.data === null) {
		return fail("NOT_FOUND", "Posted payment not found for application");
	}
	if (paymentBasis.data.status !== "posted") {
		return fail("CONFLICT", "Payment must be posted before application");
	}
	if (paymentBasis.data.currencyCode !== invoice.currencyCode) {
		return fail(
			"CONFLICT",
			"Payment and invoice currencies must match for application",
			{
				paymentCurrency: paymentBasis.data.currencyCode,
				invoiceCurrency: invoice.currencyCode,
			},
		);
	}

	return store.applyPayment({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function applySupplierCredit(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation>> {
	const parsed = parse(
		applyCreditSchema,
		input,
		"Invalid supplier credit application input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).applyCredit({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function reverseSupplierPaymentApplication(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation[]>> {
	const parsed = parse(
		reversePaymentApplicationSchema,
		input,
		"Invalid supplier allocation reversal input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).reversePaymentApplication({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function cancelSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	const parsed = parse(
		versionedSchema,
		input,
		"Invalid supplier invoice cancel input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.manage",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).cancel({
		...parsed.data,
		effects: resolveEffects(options.effects),
	});
}

export async function getSupplierInvoiceById(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice | null>> {
	const parsed = parse(getSchema, input, "Invalid supplier invoice get input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getById(
		parsed.data.organizationId,
		parsed.data.id,
	);
}

export async function listSupplierInvoices(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice[]>> {
	const parsed = parse(
		listSchema,
		input,
		"Invalid supplier invoice list input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).list(parsed.data);
}

export async function getSupplierBalance(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierBalance[]>> {
	const parsed = parse(balanceSchema, input, "Invalid supplier balance input");
	if (!parsed.ok) return parsed;
	const allowed = await authorize(
		options.authorization,
		parsed.data,
		"payables.read",
	);
	if (!allowed.ok) return allowed;
	return resolveStore(options.store).getBalance(
		parsed.data.organizationId,
		parsed.data.supplierId,
		parsed.data.currencyCode,
	);
}
