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

/** Frozen public runtime exports of "@afenda/purchasing". */
const PUBLIC_RUNTIME_EXPORTS = [
	"PURCHASE_ORDER_STATUSES",
	"PURCHASING_PERMISSION_CODES",
	"PURCHASING_PERMISSION_ORDER_CANCEL",
	"PURCHASING_PERMISSION_ORDER_CLOSE",
	"PURCHASING_PERMISSION_ORDER_CREATE",
	"PURCHASING_PERMISSION_ORDER_LIST",
	"PURCHASING_PERMISSION_ORDER_POST",
	"PURCHASING_PERMISSION_ORDER_READ",
	"PURCHASING_PERMISSION_ORDER_UPDATE",
	"addPurchaseOrderLine",
	"addPurchaseOrderLineInputSchema",
	"cancelPurchaseOrder",
	"cancelPurchaseOrderInputSchema",
	"closePurchaseOrder",
	"closePurchaseOrderInputSchema",
	"createDraftPurchaseOrder",
	"createDraftPurchaseOrderInputSchema",
	"getPurchaseOrderById",
	"getPurchaseOrderByIdInputSchema",
	"listPurchaseOrders",
	"listPurchaseOrdersInputSchema",
	"postPurchaseOrder",
	"postPurchaseOrderInputSchema",
	"purchaseOrderIdSchema",
	"purchaseOrderLineIdSchema",
];

describe("purchasing export surface", () => {
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
