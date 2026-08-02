import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function typescriptFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "adapters" ? [] : typescriptFiles(target);
		}
		return entry.isFile() && entry.name.endsWith(".ts") ? [target] : [];
	});
}

const workforcePlanningDirectory = path.resolve(
	import.meta.dirname,
	"../src/features/workforce-planning",
);

describe("Workforce Planning capability boundary", () => {
	it("rejects the deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/workforce-planning-command.ts",
				),
			),
		).toBe(false);

		for (const file of typescriptFiles(workforcePlanningDirectory)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("runWorkforcePlanningCommand");
			expect(source, file).not.toContain("runWorkforcePlanningQuery");
			expect(source, file).not.toContain("shared/workforce-planning-command");
		}
	});
});
