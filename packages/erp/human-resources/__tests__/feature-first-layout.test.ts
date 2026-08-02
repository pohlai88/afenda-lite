import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src",
);

/**
 * Feature-first root allowlist (ERP-SCAFFOLDING §3).
 * Replaces the retired scripts/feature-first-layout.mjs check mode — the
 * generator doctor is the layout authority; this test is the local guard.
 */
const ALLOWED_ROOTS = [
	"composition",
	"facade",
	"features",
	"index.ts",
	"kernel",
	"testing",
];

describe("human-resources feature-first layout", () => {
	it("keeps src/ root on the feature-first allowlist", () => {
		const entries = readdirSync(srcRoot).sort();
		expect(entries).toEqual([...ALLOWED_ROOTS].sort());
	});
});
