import { readdirSync, readFileSync } from "node:fs";
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

const statutoryProfileDirectory = path.resolve(
	import.meta.dirname,
	"../src/features/statutory-profile",
);

describe("Statutory profile capability boundary", () => {
	it("keeps the composed store out of the capability surface", () => {
		for (const file of typescriptFiles(statutoryProfileDirectory)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("@afenda/payroll");
		}
	});
});
