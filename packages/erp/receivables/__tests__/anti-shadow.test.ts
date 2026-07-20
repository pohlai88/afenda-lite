import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const FOREIGN_WRITE =
	/\b(?:insert\s+into|update|delete\s+from)\s+(?:sales_order|delivery|proof_of_delivery|payment|account|ledger|journal)\b/i;

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

describe("receivables anti-shadow boundary", () => {
	it("writes only receivables-owned business tables", () => {
		const hits = sources(ROOT).filter((file) =>
			FOREIGN_WRITE.test(readFileSync(file, "utf8")),
		);
		expect(hits).toEqual([]);
	});
});
