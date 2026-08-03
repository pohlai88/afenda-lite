import { defineSalesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "commercial-pricing" as const;

export const SALES_PRICING_COMMANDS = defineSalesOperationRegistry({
	createPriceBook: {
		id: "sales.pricing.price_book.create",
		kind: "command",
		owner: OWNER,
		permission: "sales.pricing.manage",
		publicName: "createPriceBook",
	},
	addPriceBookEntry: {
		id: "sales.pricing.price_book.entry.add",
		kind: "command",
		owner: OWNER,
		permission: "sales.pricing.manage",
		publicName: "addPriceBookEntry",
	},
	activatePriceBook: {
		id: "sales.pricing.price_book.activate",
		kind: "command",
		owner: OWNER,
		permission: "sales.pricing.manage",
		publicName: "activatePriceBook",
	},
});

export const SALES_PRICING_QUERIES = defineSalesOperationRegistry({
	calculateSalesPrice: {
		id: "sales.pricing.calculate",
		kind: "query",
		owner: OWNER,
		permission: "sales.pricing.read",
		publicName: "calculateSalesPrice",
	},
	getPriceBook: {
		id: "sales.pricing.price_book.get",
		kind: "query",
		owner: OWNER,
		permission: "sales.pricing.read",
		publicName: "getPriceBook",
	},
	listPriceBooks: {
		id: "sales.pricing.price_book.list",
		kind: "query",
		owner: OWNER,
		permission: "sales.pricing.read",
		publicName: "listPriceBooks",
	},
});
