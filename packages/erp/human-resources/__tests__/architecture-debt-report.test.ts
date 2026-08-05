import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	type ArchitectureDebtReport,
	architectureDebtCategoryKeys,
	architectureDebtRegressions,
	buildArchitectureDebtReport,
	readArchitectureDebtFixture,
} from "./helpers/architecture-debt";

const packageRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturePath = path.join(
	packageRoot,
	"__tests__/fixtures/architecture-debt.fixture.json",
);

let baseline: ArchitectureDebtReport;
let current: ArchitectureDebtReport;

describe("@afenda/human-resources reporting-only architecture debt", () => {
	beforeAll(() => {
		baseline = readArchitectureDebtFixture(fixturePath);
		current = buildArchitectureDebtReport(workspaceRoot, packageRoot);
	}, 180_000);

	it("contains current debt within the reviewed evidence baseline", () => {
		expect(current.packageName).toBe(baseline.packageName);
		expect(current.schemaVersion).toBe(baseline.schemaVersion);
		expect(architectureDebtRegressions(current, baseline)).toEqual([]);
	});

	it("keeps zero as the target invariant without treating baseline debt as allowed", () => {
		expect(current.policy).toEqual({
			baselineDisposition: "measured debt, never an allowlist",
			maximumSourceSegments: 2,
			targetInvariant: "zero architecture debt in every category",
		});
		expect(current.categories.every((category) => category.target === 0)).toBe(
			true,
		);
		expect(architectureDebtRegressions(current, baseline)).toEqual([]);
	});

	it.each(architectureDebtCategoryKeys)("rejects a new %s debt item", (key) => {
		const mutated = structuredClone(current);
		const category = mutated.categories.find((entry) => entry.key === key);
		if (category === undefined) {
			throw new Error(`Missing category ${key}`);
		}
		category.items.push({
			evidence: `synthetic regression for ${key}`,
			file: `src/features/synthetic/${key}.ts`,
		});

		expect(architectureDebtRegressions(mutated, baseline)).toEqual(
			expect.arrayContaining([
				expect.stringContaining(`${key}: new debt:`),
				expect.stringContaining(`${key}: count increased`),
			]),
		);
	});

	it("accepts deletion of reviewed debt on the path to zero", () => {
		const reduced = structuredClone(current);
		const category = reduced.categories.find((entry) => entry.items.length > 0);
		if (category === undefined) {
			throw new Error("Expected measured baseline debt");
		}
		category.items.pop();
		expect(architectureDebtRegressions(reduced, baseline)).toEqual([]);
	});
});
