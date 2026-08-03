import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

/** Feature-first root allowlist (ERP-SCAFFOLDING §3). */
const ALLOWED_ROOTS = [
	"composition",
	"facade",
	"features",
	"index.ts",
	"kernel",
	"testing",
];

/** Frozen public runtime exports of "@afenda/sales" (spot-checked spine). */
const PUBLIC_RUNTIME_EXPORTS = [
	"SALES_COMMAND_IDS",
	"SALES_COMMAND_PERMISSION",
	"SALES_COMPLETION_COMMANDS",
	"SALES_DATABASE_CONSTRAINT_REQUIREMENTS",
	"SALES_PERMISSION_CODES",
	"SALES_QUERY_IDS",
	"SALES_QUERY_PERMISSION",
	"SALES_REQUIRED_TEST_EVIDENCE",
	"acceptSalesQuotation",
	"activatePriceBook",
	"addPriceBookEntry",
	"addReturnAuthorizationLine",
	"addSalesOrderLine",
	"addSalesQuotationLine",
	"approveReturnAuthorization",
	"approveSalesOrder",
	"approveSalesQuotation",
	"calculateSalesPrice",
	"cancelReturnAuthorization",
	"cancelSalesOrder",
	"cancelSalesQuotation",
	"closeReturnAuthorization",
	"closeSalesOrder",
	"convertSalesQuotationToOrder",
	"createDraftSalesOrder",
	"createDraftSalesQuotation",
	"createPriceBook",
	"createReturnAuthorization",
	"expireSalesQuotation",
	"getFulfillableSalesOrder",
	"getPriceBook",
	"getReturnAuthorization",
	"getSalesOrderById",
	"getSalesQuotation",
	"listPriceBooks",
	"listReturnAuthorizations",
	"listSalesOrders",
	"listSalesQuotations",
	"placeSalesOrderHold",
	"postSalesOrder",
	"recordSalesOrderFulfillment",
	"rejectReturnAuthorization",
	"rejectSalesQuotation",
	"requireSalesCommandPermission",
	"requireSalesQueryPermission",
	"resolveSalesDeps",
	"resolveSalesOrderHold",
	"sendSalesQuotation",
	"submitReturnAuthorization",
	"submitSalesOrder",
	"submitSalesQuotation",
];

describe("sales export surface", () => {
	it("keeps src/ root on the feature-first allowlist", () => {
		const entries = readdirSync(srcRoot).sort();
		expect(entries).toEqual([...ALLOWED_ROOTS].sort());
	});

	it("keeps every frozen public runtime export available", {
		timeout: 30_000,
	}, async () => {
		const module = await import("../src/index");
		const actual = Object.keys(module).sort();
		const missing = PUBLIC_RUNTIME_EXPORTS.filter(
			(name) => !actual.includes(name),
		);
		expect(missing).toEqual([]);
	});
});
