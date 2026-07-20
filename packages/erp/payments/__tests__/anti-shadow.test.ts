import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);
const FOREIGN_WRITE =
	/\b(?:insert\s+into|update|delete\s+from)\s+(?:sales_invoice(?:_line)?|sales_credit_note|customer_allocation|customer_balance_projection|supplier_invoice(?:_line)?|supplier_credit_note|supplier_allocation|supplier_balance_projection|account(?:ing)?|journal(?:_line)?|ledger(?:_entry)?)\b/i;
const PEER_IMPORT =
	/from\s+["']@afenda\/(?:receivables|payables|accounting)["']/;

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

describe("payments anti-shadow boundary", () => {
	it("does not write Receivables, Payables, or Accounting tables", () => {
		const hits = sources(ROOT).filter((file) =>
			FOREIGN_WRITE.test(readFileSync(file, "utf8")),
		);
		expect(hits).toEqual([]);
	});

	it("does not import peer financial packages", () => {
		const hits = sources(ROOT).filter((file) =>
			PEER_IMPORT.test(readFileSync(file, "utf8")),
		);
		expect(hits).toEqual([]);
	});
});
