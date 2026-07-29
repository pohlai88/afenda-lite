import { fail, ok, type Result } from "@afenda/errors/result";
import { itemIdSchema } from "@afenda/master-data";
import { z } from "zod";
import {
	requireSalesCommandPermission,
	requireSalesQueryPermission,
} from "../../authorization";
import { priceBookIdSchema } from "../../brands";
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
	currencyCodeSchema,
	decimalToScaled,
	multiplyDecimal,
	nonNegativeDecimalAmountSchema,
	scaledToDecimal,
} from "../../contracts/money";
import { salesPageRequestSchema } from "../../pagination";
import type {
	PriceBook,
	PriceBookEntry,
	PriceCalculationTrace,
} from "../../types";
import { salesEvidence } from "../integration-projections/evidence";

export const createPriceBookInputSchema = salesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		currencyCode: currencyCodeSchema,
		validFrom: z.coerce.date(),
		validTo: z.coerce.date().optional(),
		priority: z.number().int().min(0).max(10_000).default(100),
	})
	.refine((value) => !value.validTo || value.validTo >= value.validFrom, {
		path: ["validTo"],
		message: "validTo must not precede validFrom",
	});
export const addPriceBookEntryInputSchema = salesMutationContextSchema.extend({
	priceBookId: priceBookIdSchema,
	itemId: itemIdSchema,
	uomId: z.string().uuid(),
	minimumQuantity: nonNegativeDecimalAmountSchema,
	unitPrice: nonNegativeDecimalAmountSchema,
	discountPercent: nonNegativeDecimalAmountSchema.refine(
		(v) => Number(v) <= 100,
	),
	validFrom: z.coerce.date(),
	validTo: z.coerce.date().optional(),
});
export const activatePriceBookInputSchema =
	salesVersionedMutationContextSchema.extend({
		priceBookId: priceBookIdSchema,
	});
export const calculateSalesPriceInputSchema = salesQueryContextSchema.extend({
	itemId: itemIdSchema,
	uomId: z.string().uuid(),
	currencyCode: currencyCodeSchema,
	quantity: nonNegativeDecimalAmountSchema.refine((value) => {
		const parsed = decimalToScaled(value);
		return parsed.ok && parsed.data > 0n;
	}),
	at: z.coerce.date().optional(),
	override: z
		.object({
			unitPrice: nonNegativeDecimalAmountSchema,
			reason: z.string().trim().min(3).max(500),
			approvedBy: z.string().trim().min(1),
		})
		.optional(),
});
export const getPriceBookInputSchema = salesQueryContextSchema.extend({
	id: priceBookIdSchema,
});
export const listPriceBooksInputSchema = salesPageRequestSchema;

export async function getPriceBook(
	input: z.input<typeof getPriceBookInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = getPriceBookInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter a valid price-book ID",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.pricing.price_book.get",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.getPriceBook({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
	});
}

export async function listPriceBooks(
	input: z.input<typeof listPriceBooksInputSchema>,
	options: SalesQueryOptions = {},
) {
	const parsed = listPriceBooksInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter valid price-book filters",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.pricing.price_book.list",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.listPriceBooks(parsed.data);
}

export async function createPriceBook(
	input: z.input<typeof createPriceBookInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<PriceBook>> {
	const parsed = createPriceBookInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter a valid price book",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.pricing.price_book.create",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.createPriceBook(
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: parsed.data.code,
			normalizedCode: parsed.data.code.toUpperCase(),
			name: parsed.data.name,
			currencyCode: parsed.data.currencyCode,
			validFrom: parsed.data.validFrom,
			validTo: parsed.data.validTo,
			priority: parsed.data.priority,
			status: "draft",
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.price_book.created.v1",
			entityType: "sales_price_book",
			code: parsed.data.code,
			action: "CREATE",
		}),
	);
}
export async function addPriceBookEntry(
	input: z.input<typeof addPriceBookEntryInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<PriceBookEntry>> {
	const parsed = addPriceBookEntryInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter a valid price-book entry",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.pricing.price_book.entry.add",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.addPriceBookEntry(
		{ ...parsed.data, actorUserId: parsed.data.actorUserId },
		salesEvidence({
			...parsed.data,
			eventType: "sales.price_book.entry_added.v1",
			entityType: "sales_price_book_entry",
			code: parsed.data.priceBookId,
			action: "CREATE",
		}),
	);
}
export async function activatePriceBook(
	input: z.input<typeof activatePriceBookInputSchema>,
	options: SalesCommandOptions = {},
): Promise<Result<PriceBook>> {
	const parsed = activatePriceBookInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter a valid price-book activation",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesCommandPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: "sales.pricing.price_book.activate",
	});
	if (!auth.ok) {
		return auth;
	}
	return deps.store.updatePriceBookStatus(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.priceBookId,
			expectedVersion: parsed.data.expectedVersion,
			status: "active",
			actorUserId: parsed.data.actorUserId,
		},
		salesEvidence({
			...parsed.data,
			eventType: "sales.price_book.activated.v1",
			entityType: "sales_price_book",
			code: parsed.data.priceBookId,
			action: "UPDATE",
		}),
	);
}
export async function calculateSalesPrice(
	input: z.input<typeof calculateSalesPriceInputSchema>,
	options: SalesQueryOptions = {},
): Promise<Result<PriceCalculationTrace>> {
	const parsed = calculateSalesPriceInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Enter valid pricing inputs",
			parsed.error.flatten(),
		);
	}
	const deps = resolveSalesDeps(options);
	const auth = await requireSalesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: "sales.pricing.calculate",
	});
	if (!auth.ok) {
		return auth;
	}
	const matches = await deps.store.findPriceEntries({
		...parsed.data,
		at: parsed.data.at ?? deps.clock.now(),
	});
	if (!matches.ok) {
		return matches;
	}
	const [match] = matches.data.sort(
		(a, b) =>
			a.book.priority - b.book.priority ||
			b.entry.minimumQuantity.localeCompare(a.entry.minimumQuantity),
	);
	if (!match) {
		return fail("NOT_FOUND", "No applicable sales price was found", {
			reason: "SALES_PRICE_NOT_FOUND",
		});
	}
	const base = parsed.data.override?.unitPrice ?? match.entry.unitPrice;
	const discountScaled = decimalToScaled(match.entry.discountPercent);
	const baseScaled = decimalToScaled(base);
	if (!discountScaled.ok) {
		return discountScaled;
	}
	if (!baseScaled.ok) {
		return baseScaled;
	}
	const netScaled =
		baseScaled.data - (baseScaled.data * discountScaled.data) / 100_000_000n;
	const netUnitPrice = scaledToDecimal(netScaled);
	const amount = multiplyDecimal(netUnitPrice, parsed.data.quantity);
	if (!amount.ok) {
		return amount;
	}
	return ok({
		priceBookId: match.book.id,
		priceBookEntryId: match.entry.id,
		baseUnitPrice: match.entry.unitPrice,
		discountPercent: match.entry.discountPercent,
		netUnitPrice,
		quantity: parsed.data.quantity,
		lineNetAmount: amount.data,
		override: parsed.data.override,
	});
}
