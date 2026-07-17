import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ADVERSE_MATRIX } from "../../../testing/e2e/adverse-matrix";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

/**
 * I4 — adverse matrix inventory must point at real forward-owned evidence.
 * Missing files fail this gate; skip ≠ PASS when E2E_REQUIRE_FACTORY=1.
 */
describe("ADVERSE_MATRIX disk inventory (I4)", () => {
	it("lists standing A1–A11 rows with unique ids", () => {
		const ids = ADVERSE_MATRIX.map((row) => row.id);
		expect(ids).toEqual([
			"A1",
			"A2",
			"A3",
			"A4",
			"A5",
			"A6",
			"A7",
			"A8",
			"A9",
			"A10",
			"A11",
		]);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("resolves every matrix evidence path on disk", () => {
		for (const row of ADVERSE_MATRIX) {
			expect(row.evidence.length).toBeGreaterThan(0);
			for (const evidencePath of row.evidence) {
				const absolute = path.join(repoRoot, evidencePath);
				expect(
					existsSync(absolute),
					`${row.id} missing: ${evidencePath}`,
				).toBe(true);
			}
		}
	});
});
