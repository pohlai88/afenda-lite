import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { assertCurrencyExists } from "../src/compensation-benefits/run-operation";

const packageRoot = join(import.meta.dirname, "..");

function listTypeScriptFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) {
			return listTypeScriptFiles(path);
		}
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

describe("Human Resources currency capability boundary", () => {
	it("carries tenant and actor identity to the injected lookup", async () => {
		const calls: unknown[] = [];
		const result = await assertCurrencyExists(
			{
				exists: (input) => {
					calls.push(input);
					return Promise.resolve({ ok: true, data: true });
				},
			},
			"MYR",
			{ organizationId: "org-1", actorUserId: "user-1" },
		);

		expect(result).toEqual({ ok: true, data: undefined });
		expect(calls).toEqual([
			{
				actorUserId: "user-1",
				currencyCode: "MYR",
				organizationId: "org-1",
			},
		]);
	});

	it("keeps master-data adaptation outside the package", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { dependencies: Record<string, string> };
		const imports = listTypeScriptFiles(join(packageRoot, "src")).flatMap(
			(file) => {
				const source = readFileSync(file, "utf8");
				return source.includes('from "@afenda/master-data') ? [file] : [];
			},
		);

		expect(packageJson.dependencies).not.toHaveProperty("@afenda/master-data");
		expect(imports).toEqual([]);
		expect(
			readFileSync(join(packageRoot, "src/index.ts"), "utf8"),
		).not.toContain('export * from "./compensation-benefits/currency-lookup"');
	});
});
