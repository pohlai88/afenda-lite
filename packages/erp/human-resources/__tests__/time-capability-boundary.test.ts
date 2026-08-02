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

const timeDirectory = path.resolve(import.meta.dirname, "../src/time");

describe("Time capability boundary", () => {
	it("rejects the deleted broad runner and unrestricted store access", () => {
		expect(
			existsSync(
				path.resolve(import.meta.dirname, "../src/shared/time-command.ts"),
			),
		).toBe(false);

		for (const file of typescriptFiles(timeDirectory)) {
			const source = readFileSync(file, "utf8");
			expect(source, file).not.toContain("HumanResourcesStore");
			expect(source, file).not.toContain("runTimeCommand");
			expect(source, file).not.toContain("runTimeQuery");
			expect(source, file).not.toContain("shared/time-command");
		}
	});
});
