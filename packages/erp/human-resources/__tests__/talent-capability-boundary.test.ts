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

describe("Talent capability boundary", () => {
	it("rejects its deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(import.meta.dirname, "../src/shared/talent-command.ts"),
			),
		).toBe(false);
		for (const file of files(
			path.resolve(import.meta.dirname, "../src/features/talent"),
		)) {
			const body = readFileSync(file, "utf8");
			expect(body, file).not.toContain("HumanResourcesStore");
			expect(body, file).not.toContain("runTalentCommand");
			expect(body, file).not.toContain("runTalentQuery");
			expect(body, file).not.toContain("runTalentEmployeeScopedQuery");
			expect(body, file).not.toContain("shared/talent-command");
		}
		const resourceBoundary = readFileSync(
			path.resolve(import.meta.dirname, "../src/features/talent/resource.ts"),
			"utf8",
		);
		expect(resourceBoundary).not.toContain("HumanResourcesStore");
		expect(resourceBoundary).not.toContain("resolveCommandDeps");
	});
});
