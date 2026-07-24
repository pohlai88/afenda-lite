import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION,
	validateEffectiveTruthAdoptionMatrix,
} from "../src/effective-truth-adoption";

describe("HR effective-truth adoption matrix", () => {
	it("classifies every inventoried mutable definition and assignment", () => {
		expect(validateEffectiveTruthAdoptionMatrix()).toEqual([]);
		expect(HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION.length).toBeGreaterThan(25);
		for (const row of HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION) {
			expect(existsSync(new URL(row.evidence.unit, import.meta.url))).toBe(
				true,
			);
			expect(existsSync(new URL(row.evidence.parity, import.meta.url))).toBe(
				true,
			);
		}
	});

	it("requires fail-closed rejection for every temporal row", () => {
		const temporalRows = HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION.filter(
			(row) => row.decision !== "versioned-current",
		);
		expect(temporalRows.length).toBeGreaterThan(15);
		for (const row of temporalRows) {
			expect(row.rejection).not.toBe("not-applicable");
			expect(row.concurrency).toBe("version");
			expect(row.provenance).toMatch(/audit-outbox/);
		}
	});

	it("reserves branch rejection for aggregates with predecessor identity", () => {
		const lineageRows = HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION.filter(
			(row) =>
				row.decision === "effective-lineage" ||
				row.decision === "period-lineage" ||
				row.decision === "point-lineage",
		);
		expect(lineageRows.length).toBeGreaterThan(5);
		for (const row of lineageRows) {
			expect(row.predecessorField.length).toBeGreaterThan(0);
			expect(row.rejection).toMatch(/branch/);
		}
	});

	it("reports a missing canonical adoption row", () => {
		const [removed, ...remaining] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION;
		expect(removed).toBeDefined();
		if (removed === undefined) return;

		expect(validateEffectiveTruthAdoptionMatrix(remaining)).toContainEqual({
			kind: "missing-adoption",
			table: removed.table,
		});
	});
});
