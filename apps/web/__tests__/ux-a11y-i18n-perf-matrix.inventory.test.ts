import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { UX_A11Y_I18N_PERF_MATRIX } from "../../../testing/ux-a11y-i18n-perf-matrix";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

const EXPECTED_IDS = [
	"UX01",
	"UX02",
	"UX03",
	"UX04",
	"UX05",
	"UX06",
	"A11Y01",
	"A11Y02",
	"A11Y03",
	"I18N01",
	"I18N02",
	"PERF01",
	"PERF02",
] as const;

/**
 * I5.4 — UX / a11y / i18n / perf criteria must have owners and disk-honest
 * evidence paths for PASS rows. Empty owners or missing PASS paths fail.
 */
describe("UX_A11Y_I18N_PERF_MATRIX inventory (I5.4)", () => {
	it("lists standing criterion ids with unique non-empty owners", () => {
		const ids = UX_A11Y_I18N_PERF_MATRIX.map((row) => row.id);
		expect(ids).toEqual([...EXPECTED_IDS]);
		expect(new Set(ids).size).toBe(ids.length);
		for (const row of UX_A11Y_I18N_PERF_MATRIX) {
			expect(row.owner.trim().length).toBeGreaterThan(0);
			expect(row.criterion.trim().length).toBeGreaterThan(0);
		}
	});

	it("resolves every PASS evidence path on disk", () => {
		for (const row of UX_A11Y_I18N_PERF_MATRIX) {
			if (row.evidenceState !== "PASS") {
				continue;
			}
			expect(
				row.evidencePaths.length,
				`${row.id} PASS requires evidencePaths`,
			).toBeGreaterThan(0);
			for (const evidencePath of row.evidencePaths) {
				const absolute = path.join(repoRoot, evidencePath);
				expect(existsSync(absolute), `${row.id} missing: ${evidencePath}`).toBe(
					true,
				);
			}
		}
	});

	it("keeps NOT_EVIDENCED / NOT_APPLICABLE / BLOCKED rows without inventing PASS paths", () => {
		const openStates = new Set([
			"NOT_EVIDENCED",
			"NOT_APPLICABLE",
			"BLOCKED",
		] as const);
		const open = UX_A11Y_I18N_PERF_MATRIX.filter((row) =>
			(openStates as ReadonlySet<string>).has(row.evidenceState),
		);
		expect(
			open
				.map((row) => row.id)
				.slice()
				.sort(),
		).toEqual(["I18N02"]);
		for (const row of open) {
			expect(row.notes.trim().length).toBeGreaterThan(0);
		}
	});

	it("keeps A11Y03 and PERF01 PASS with on-disk evidence after residual close", () => {
		const a11y = UX_A11Y_I18N_PERF_MATRIX.find((row) => row.id === "A11Y03");
		const perf = UX_A11Y_I18N_PERF_MATRIX.find((row) => row.id === "PERF01");
		expect(a11y?.evidenceState).toBe("PASS");
		expect(perf?.evidenceState).toBe("PASS");
	});

	it("declares en-only locale criterion against root layout lang=en", () => {
		const i18n = UX_A11Y_I18N_PERF_MATRIX.find((row) => row.id === "I18N01");
		expect(i18n?.evidenceState).toBe("PASS");
		const layout = path.join(repoRoot, "apps/web/app/layout.tsx");
		expect(existsSync(layout)).toBe(true);
		const source = readFileSync(layout, "utf8");
		expect(source).toContain('lang="en"');
	});
});
