import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SHADOW =
	/ca_shareholding|ca_share_allotment|ca_bank_account[^_]|ca_group_link|ca_statutory_filing|ca_beneficial_owner[^_]|ca_import_batch/;

const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);

const PRODUCT_ROOTS = [path.join(ROOT, "packages"), path.join(ROOT, "apps")];

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			entry === "node_modules" ||
			entry === "dist" ||
			entry === ".next" ||
			entry === "coverage" ||
			entry === "__tests__" ||
			entry === "shadcn-studio"
		) {
			continue;
		}
		const full = path.join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) {
			walk(full, out);
			continue;
		}
		if (!/\.(ts|tsx|sql)$/.test(entry)) {
			continue;
		}
		out.push(full);
	}
	return out;
}

describe("corporate-administration anti-shadow boundary", () => {
	it("has zero product hits for forbidden shadow table names", () => {
		const hits: string[] = [];
		for (const root of PRODUCT_ROOTS) {
			for (const file of walk(root)) {
				const relative = path.relative(ROOT, file).replaceAll("\\", "/");
				const text = readFileSync(file, "utf8");
				if (SHADOW.test(text)) {
					hits.push(relative);
				}
			}
		}
		expect(hits).toEqual([]);
	});
});
