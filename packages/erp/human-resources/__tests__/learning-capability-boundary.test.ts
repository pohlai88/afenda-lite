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

const learningDirectory = path.resolve(
	import.meta.dirname,
	"../src/features/learning",
);

describe("Learning capability boundary", () => {
	it("rejects the deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(import.meta.dirname, "../src/shared/learning-command.ts"),
			),
		).toBe(false);

		for (const file of typescriptFiles(learningDirectory)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("runLearningCommand");
			expect(source, file).not.toContain("runLearningQuery");
			expect(source, file).not.toContain("shared/learning-command");
		}
	});
});
