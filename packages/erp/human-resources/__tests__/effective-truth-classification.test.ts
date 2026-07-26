import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION } from "../src/effective-truth-adoption";
import {
	adoptionDecisionToClassificationCategory,
	HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION,
	summarizeEffectiveTruthClassificationByCategory,
	validateEffectiveTruthClassificationRegister,
} from "../src/effective-truth-classification";
import { HUMAN_RESOURCES_MUTATION_TABLES } from "../src/mutation-tables";

const EXPECTED_CATEGORY_TOTALS = {
	"effective-definition": 20,
	"bounded-assignment": 15,
	"versioned-current-fact": 29,
	"append-only-operational-fact": 18,
	"transactional-state-machine": 40,
	"derived-projection": 2,
	"explicit-exclusion": 1,
} as const;

describe("HR effective-truth classification register", () => {
	it("classifies every inventoried mutation table with zero validator issues", () => {
		expect(validateEffectiveTruthClassificationRegister()).toEqual([]);
		expect(HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION.length).toBe(
			HUMAN_RESOURCES_MUTATION_TABLES.length,
		);
	});

	it("assigns exactly the committed category histogram", () => {
		const totals = summarizeEffectiveTruthClassificationByCategory();
		expect(totals).toEqual(EXPECTED_CATEGORY_TOTALS);
		expect(Object.values(totals).reduce((sum, count) => sum + count, 0)).toBe(
			125,
		);
	});

	it("bridges every Phase 3 adoption row to the matching classification category", () => {
		for (const adoption of HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION) {
			const classification =
				HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION.find(
					(entry) => entry.table === adoption.table,
				);
			expect(classification).toBeDefined();
			expect(classification?.category).toBe(
				adoptionDecisionToClassificationCategory(adoption.decision),
			);
		}
	});

	it("requires non-empty rationale on every row", () => {
		for (const row of HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION) {
			expect(row.rationale.trim().length).toBeGreaterThan(0);
		}
	});

	it("reports missing classification when a mutation table is absent", () => {
		const [removed, ...remaining] =
			HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION;
		expect(removed).toBeDefined();
		if (removed === undefined) return;

		expect(
			validateEffectiveTruthClassificationRegister(remaining),
		).toContainEqual({
			kind: "missing-classification",
			table: removed.table,
		});
	});

	it("reports duplicate table classification", () => {
		const [first] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION;
		expect(first).toBeDefined();
		if (first === undefined) return;

		const duplicated = [
			first,
			...HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION,
		];
		expect(
			validateEffectiveTruthClassificationRegister(duplicated),
		).toContainEqual({
			kind: "duplicate-table",
			table: first.table,
		});
	});

	it("reports unknown mutation table", () => {
		const withUnknown = [
			...HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION,
			{
				table:
					"hr_unknown_table" as (typeof HUMAN_RESOURCES_MUTATION_TABLES)[number],
				category: "explicit-exclusion" as const,
				domain: "time" as const,
				cluster: "B" as const,
				rationale: "test unknown table",
			},
		];
		expect(
			validateEffectiveTruthClassificationRegister(withUnknown),
		).toContainEqual({
			kind: "unknown-mutation-table",
			table: "hr_unknown_table",
		});
	});

	it("reports missing rationale", () => {
		const [first] = HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION;
		expect(first).toBeDefined();
		if (first === undefined) return;

		const withEmptyRationale =
			HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION.map((row) =>
				row.table === first.table ? { ...row, rationale: "   " } : row,
			);
		expect(
			validateEffectiveTruthClassificationRegister(withEmptyRationale),
		).toContainEqual({
			kind: "missing-rationale",
			table: first.table,
		});
	});

	it("reports adoption bridge mismatch", () => {
		const adoption = HUMAN_RESOURCES_EFFECTIVE_TRUTH_ADOPTION[0];
		expect(adoption).toBeDefined();
		if (adoption === undefined) return;

		const expected = adoptionDecisionToClassificationCategory(
			adoption.decision,
		);
		const mismatchedCategory =
			expected === "explicit-exclusion"
				? ("versioned-current-fact" as const)
				: ("explicit-exclusion" as const);

		const withMismatch = HUMAN_RESOURCES_EFFECTIVE_TRUTH_CLASSIFICATION.map(
			(row) =>
				row.table === adoption.table
					? { ...row, category: mismatchedCategory }
					: row,
		);
		expect(
			validateEffectiveTruthClassificationRegister(withMismatch),
		).toContainEqual({
			kind: "adoption-bridge-mismatch",
			table: adoption.table,
			expected,
			actual: mismatchedCategory,
		});
	});
});
