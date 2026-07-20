import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const FORBIDDEN_WRITE =
	/\b(?:insert\s+into|update|delete\s+from)\s+(?:sales_order|sales_order_line|stock_movement|stock_movement_line|stock_balance|stock_ledger_entry|stock_reservation)\b/i;

function sourceFiles(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) sourceFiles(full, out);
		else if (entry.endsWith(".ts")) out.push(full);
	}
	return out;
}

describe("@afenda/fulfillment cross-domain boundary", () => {
	it("never mutates Sales or Inventory tables", () => {
		const hits = sourceFiles(path.join(PACKAGE_ROOT, "src")).filter((file) =>
			FORBIDDEN_WRITE.test(readFileSync(file, "utf8")),
		);
		expect(hits).toEqual([]);
	});
});
