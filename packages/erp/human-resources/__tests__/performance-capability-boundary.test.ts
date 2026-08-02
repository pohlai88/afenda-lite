import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function files(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "adapters" ? [] : files(target);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [target] : [];
	});
}

describe("Performance capability boundary", () => {
	it("rejects its deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/performance-command.ts",
				),
			),
		).toBe(false);
		for (const file of files(
			path.resolve(import.meta.dirname, "../src/features/performance"),
		)) {
			const body = readFileSync(file, "utf8");
			expect(body, file).not.toContain("HumanResourcesStore");
			expect(body, file).not.toContain("runPerformanceCommand");
			expect(body, file).not.toContain("runPerformanceQuery");
			expect(body, file).not.toContain("runPerformanceEmployeeScopedQuery");
			expect(body, file).not.toContain("runPerformanceResourceScopedQuery");
			expect(body, file).not.toContain("shared/performance-command");
		}
	});
});
