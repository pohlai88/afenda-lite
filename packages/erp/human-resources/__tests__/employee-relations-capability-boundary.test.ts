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

const employeeRelationsDirectory = path.resolve(
	import.meta.dirname,
	"../src/employee-relations",
);

describe("Employee Relations capability boundary", () => {
	it("rejects the deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(
					import.meta.dirname,
					"../src/shared/employee-relations-command.ts",
				),
			),
		).toBe(false);

		for (const file of typescriptFiles(employeeRelationsDirectory)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("runEmployeeRelationsCommand");
			expect(source, file).not.toContain("runEmployeeRelationsQuery");
			expect(source, file).not.toContain("shared/employee-relations-command");
		}
	});
});
