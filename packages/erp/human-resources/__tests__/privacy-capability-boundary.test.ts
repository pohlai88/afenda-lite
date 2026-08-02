import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");

describe("Privacy capability boundary", () => {
	it("keeps broad storage knowledge in its single projection boundary", () => {
		for (const file of ["operations.ts", "subject-data-collector.ts"]) {
			const body = source(`src/features/privacy/${file}`);
			expect(body, file).not.toContain("HumanResourcesStore");
		}
		expect(source("src/features/privacy/store.ts")).toContain(
			"HumanResourcesPrivacyExportStore",
		);
	});
});
