import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SHADOW =
	/sales_customer|purchase_supplier|inventory_product|finance_vendor/;
const ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
);
const PRODUCT_ROOTS = [path.join(ROOT, "packages"), path.join(ROOT, "apps")];

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (
			[
				"node_modules",
				"dist",
				".next",
				"coverage",
				"__tests__",
				"shadcn-studio",
			].includes(entry)
		)
			continue;
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|tsx|sql)$/.test(entry)) out.push(full);
	}
	return out;
}

describe("ARCH-006 anti-shadow roots", () => {
	it("has zero product hits for forbidden shadow table names", () => {
		const hits: string[] = [];
		for (const root of PRODUCT_ROOTS) {
			for (const file of walk(root)) {
				if (SHADOW.test(readFileSync(file, "utf8"))) {
					hits.push(path.relative(ROOT, file).replaceAll("\\", "/"));
				}
			}
		}
		expect(hits).toEqual([]);
	});
});
