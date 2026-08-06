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
];

/** Frozen public runtime exports of "@afenda/receivables". */
const PUBLIC_RUNTIME_EXPORTS = [
	"DrizzleReceivablesStore",
	"MemoryReceivablesStore",
	"addSalesInvoiceLine",
	"applyCustomerReceipt",
	"cancelDraftSalesInvoice",
	"closeSalesInvoice",
	"createDraftSalesInvoice",
	"createDrizzleReceivablesStore",
	"createMemoryReceivablesStore",
	"expectedOpenBalance",
	"getCustomerAging",
	"getCustomerBalance",
	"getSalesInvoiceById",
	"issueCreditNote",
	"listSalesInvoices",
	"postSalesInvoice",
	"reconcileReceivables",
	"requireReceivablesCommandPermission",
	"requireReceivablesQueryPermission",
	"reverseCustomerAllocationsByPayment",
	"reverseCustomerReceiptApplication",
];

describe("receivables export surface", () => {
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
