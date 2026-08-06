import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	type ArchitectureDebtReport,
	architectureDebtCategoryKeys,
	architectureDebtRegressions,
	buildArchitectureDebtReport,
	readArchitectureDebtFixture,
} from "./helpers/architecture-debt";
import {
	buildConsumerInventory,
	type ConsumerInventory,
	classifyConsumerDisposition,
	readConsumerInventoryFixture,
} from "./helpers/consumer-inventory";
import {
	buildPublicContract,
	buildPublicContractFixture,
	readPublicContractFixture,
} from "./helpers/public-contract";
import {
	buildRegistryProjectionContract,
	type RegistryProjectionContract,
	readRegistryProjectionFixture,
	validateRegistryProjectionContract,
} from "./helpers/registry-projection";

/**
 * Governance symmetry fixtures for @afenda/payroll (B2 of
 * docs/erp/hr-payroll-bridging.md). Mirrors, at reduced Payroll-specific
 * scope, the four fixtures + assertion styles HR carries under
 * `packages/erp/human-resources/__tests__/{public-contract-freeze,
 * registry-projection-contract,consumer-entrypoint-inventory,
 * architecture-debt-report}.test.ts`: every fixture is recomputed from
 * Payroll's own source at test time and compared, never hand-maintained.
 */

const packageRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(packageRoot, "../../..");
const fixturesDir = path.join(packageRoot, "__tests__/fixtures");

describe("@afenda/payroll public contract fixture", () => {
	it("matches the reviewed export-surface fixture", () => {
		const contract = buildPublicContract(packageRoot);
		const expected = readPublicContractFixture(
			path.join(fixturesDir, "public-contract.fixture.json"),
		);
		expect(buildPublicContractFixture(contract)).toEqual(expected);
	}, 30_000);
});

describe("@afenda/payroll registry projection fixture", () => {
	let contract: RegistryProjectionContract;

	beforeAll(() => {
		contract = buildRegistryProjectionContract(packageRoot);
	}, 60_000);

	it("matches the intentionally reviewed projection of the operation registry", () => {
		const expected = readRegistryProjectionFixture(
			path.join(fixturesDir, "registry-projection.fixture.json"),
		);
		expect(contract).toEqual(expected);
		expect(validateRegistryProjectionContract(contract)).toEqual([]);
	});

	it("rejects an operation without authorization", () => {
		const mutated = structuredClone(contract);
		const [first] = mutated.operations;
		expect(first).toBeDefined();
		if (first === undefined) {
			return;
		}
		first.permission = "";
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "missing-authorization" }),
		);
	});

	it("rejects duplicate operation identifiers", () => {
		const mutated = structuredClone(contract);
		const [first] = mutated.operations;
		expect(first).toBeDefined();
		if (first === undefined) {
			return;
		}
		mutated.operations.push(structuredClone(first));
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "duplicate-operation" }),
		);
	});

	it("rejects a divergent permission projection", () => {
		const mutated = structuredClone(contract);
		const [first] = mutated.operations;
		expect(first).toBeDefined();
		if (first === undefined) {
			return;
		}
		mutated.authorizationProjection[first.id] = "payroll.invalid.permission";
		expect(validateRegistryProjectionContract(mutated)).toContainEqual(
			expect.objectContaining({ code: "permission-projection-drift" }),
		);
	});
});

describe("@afenda/payroll consumer and entrypoint inventory fixture", () => {
	let inventory: ConsumerInventory;

	beforeAll(() => {
		inventory = buildConsumerInventory(workspaceRoot, packageRoot);
	}, 60_000);

	it("matches the reviewed resolver-backed manifest", () => {
		const expected = readConsumerInventoryFixture(
			path.join(fixturesDir, "consumer-inventory.fixture.json"),
		);
		expect(inventory).toEqual(expected);
	});

	it("contains no forbidden consumer", () => {
		expect(
			inventory.references.filter(
				(reference) => reference.disposition === "forbidden",
			),
		).toEqual([]);
	});

	it("rejects deep internal imports even from tests", () => {
		expect(
			classifyConsumerDisposition({
				consumerClass: "testing",
				entrypoint: "deep-internal",
				referenceKind: "module",
				resolution: "resolved",
			}),
		).toBe("forbidden");
	});

	it("rejects an unresolved module reference", () => {
		expect(
			classifyConsumerDisposition({
				consumerClass: "production",
				entrypoint: ".",
				referenceKind: "module",
				resolution: "unresolved",
			}),
		).toBe("forbidden");
	});

	it("allowlists every test-only entrypoint consumer by exact file", () => {
		const testingConsumers = inventory.references
			.filter((reference) => reference.entrypoint === "./testing")
			.map((reference) => reference.file);

		expect([...new Set(testingConsumers)].toSorted()).toEqual(
			inventory.approvedTestingConsumers,
		);
	});

	it("rejects production access to the testing entrypoint", () => {
		expect(
			classifyConsumerDisposition({
				consumerClass: "production",
				entrypoint: "./testing",
				referenceKind: "module",
				resolution: "resolved",
			}),
		).toBe("forbidden");
	});
});

describe("@afenda/payroll reporting-only architecture debt", () => {
	let baseline: ArchitectureDebtReport;
	let current: ArchitectureDebtReport;

	beforeAll(() => {
		baseline = readArchitectureDebtFixture(
			path.join(fixturesDir, "architecture-debt.fixture.json"),
		);
		current = buildArchitectureDebtReport(workspaceRoot, packageRoot);
	}, 60_000);

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
});
