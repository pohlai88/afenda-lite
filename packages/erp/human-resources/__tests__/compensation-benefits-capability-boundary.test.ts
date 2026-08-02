import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function typescriptFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return typescriptFiles(target);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [target] : [];
	});
}

describe("Compensation & Benefits capability boundary", () => {
	it("rejects the deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/compensation-command.ts",
				),
			),
		).toBe(false);

		for (const file of typescriptFiles(
			path.resolve(import.meta.dirname, "../src/compensation-benefits"),
		)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("runCompensationCommand");
			expect(source, file).not.toContain("runCompensationQuery");
			expect(source, file).not.toContain("shared/compensation-command");
		}
	});
});
