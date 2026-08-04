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

/** Frozen public runtime exports of "@afenda/receiving". */
const PUBLIC_RUNTIME_EXPORTS = [
	"DrizzleReceivingStore",
	"GOODS_RECEIPT_SOURCE_TYPES",
	"GOODS_RECEIPT_STATUSES",
	"INVENTORY_APPLICATION_STATUSES",
	"MemoryReceivingStore",
	"RECEIVING_DISCREPANCY_STATUSES",
	"RECEIVING_DISCREPANCY_TYPES",
	"RECEIVING_PERMISSION_CODES",
	"addGoodsReceiptLine",
	"addGoodsReceiptLineInputSchema",
	"cancelGoodsReceipt",
	"cancelGoodsReceiptInputSchema",
	"createDraftGoodsReceipt",
	"createDraftGoodsReceiptInputSchema",
	"createDrizzleReceivingStore",
	"createMasterDataLookupPort",
	"createMemoryReceivingStore",
	"createProductionMutationPorts",
	"getGoodsReceiptById",
	"getGoodsReceiptByIdInputSchema",
	"goodsReceiptIdSchema",
	"goodsReceiptLineIdSchema",
	"listGoodsReceipts",
	"listGoodsReceiptsInputSchema",
	"listReceivingInventoryExceptions",
	"listReceivingInventoryExceptionsInputSchema",
	"postGoodsReceipt",
	"postGoodsReceiptInputSchema",
	"receivingDiscrepancyIdSchema",
	"recordReceivingDiscrepancy",
	"recordReceivingDiscrepancyInputSchema",
	"resolveReceivingDiscrepancy",
	"resolveReceivingDiscrepancyInputSchema",
	"reverseGoodsReceipt",
	"reverseGoodsReceiptInputSchema",
];

describe("receiving export surface", () => {
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
