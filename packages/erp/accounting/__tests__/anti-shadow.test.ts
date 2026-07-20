import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);
const PEER_IMPORT =
	/from\s+["']@afenda\/(?:sales|purchasing|inventory|receivables|payables|payments)["']/;
const FOREIGN_WRITE =
	/\b(?:insert\s+into|update|delete\s+from)\s+(?:sales_order|purchase_order|stock_|sales_invoice|supplier_invoice|payment)\b/i;

function sources(directory: string): string[] {
	const result: string[] = [];
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			result.push(...sources(full));
		} else if (entry.endsWith(".ts")) {
			result.push(full);
		}
	}
	return result;
}

describe("accounting anti-shadow boundary", () => {
	it("integrates with transaction packages through events only", () => {
		const files = sources(ROOT);
		expect(
			files.filter((file) => PEER_IMPORT.test(readFileSync(file, "utf8"))),
		).toEqual([]);
		expect(
			files.filter((file) => FOREIGN_WRITE.test(readFileSync(file, "utf8"))),
		).toEqual([]);
	});
});
