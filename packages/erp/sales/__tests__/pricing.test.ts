import { describe, expect, it } from "vitest";
import {
	activatePriceBook,
	addPriceBookEntry,
	calculateSalesPrice,
	createPriceBook,
	getPriceBook,
	listPriceBooks,
} from "../src";
import {
	ACTOR_USER_ID,
	createHarness,
	ITEM_ID,
	mutationContext,
	ORGANIZATION_ID,
	UOM_ID,
} from "./helpers/harness";

describe("commercial pricing", () => {
	it("applies effective, currency, UoM and quantity conditions with trace", async () => {
		const options = createHarness();
		const book = await createPriceBook(
			{
				...mutationContext("book"),
				code: "STANDARD-USD",
				name: "Standard USD",
				currencyCode: "USD",
				validFrom: new Date("2026-01-01"),
				priority: 10,
			},
			options,
		);
		if (!book.ok) throw new Error(book.message);
		const fetched = await getPriceBook(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:book-get",
				id: book.data.id,
			},
			options,
		);
		expect(fetched.ok && fetched.data?.id).toBe(book.data.id);
		const listed = await listPriceBooks(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:book-list",
				pageSize: 1,
			},
			options,
		);
		expect(listed.ok && listed.data.items).toHaveLength(1);
		const entry = await addPriceBookEntry(
			{
				...mutationContext("entry"),
				priceBookId: book.data.id,
				itemId: ITEM_ID,
				uomId: UOM_ID,
				minimumQuantity: "10",
				unitPrice: "25",
				discountPercent: "10",
				validFrom: new Date("2026-01-01"),
			},
			options,
		);
		expect(entry.ok).toBe(true);
		const active = await activatePriceBook(
			{
				...mutationContext("activate"),
				priceBookId: book.data.id,
				expectedVersion: book.data.version,
			},
			options,
		);
		expect(active.ok).toBe(true);
		const directMatches = await options.store.findPriceEntries({
			organizationId: ORGANIZATION_ID,
			itemId: ITEM_ID,
			uomId: UOM_ID,
			currencyCode: "USD",
			quantity: "12",
			at: new Date("2026-07-28"),
		});
		if (!directMatches.ok || directMatches.data.length === 0)
			throw new Error(JSON.stringify(directMatches));
		const trace = await calculateSalesPrice(
			{
				organizationId: ORGANIZATION_ID,
				actorUserId: ACTOR_USER_ID,
				correlationId: "test:calculate",
				itemId: ITEM_ID,
				uomId: UOM_ID,
				currencyCode: "USD",
				quantity: "12",
				at: new Date("2026-07-28"),
			},
			options,
		);
		if (!trace.ok) throw new Error(JSON.stringify(trace));
		expect(trace.ok && trace.data.netUnitPrice).toBe("22.5");
		expect(trace.ok && trace.data.lineNetAmount).toBe("270");
	});
});
