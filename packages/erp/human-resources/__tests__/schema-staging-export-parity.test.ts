/**
 * Schema barrel export parity.
 *
 * Verifies root compatibility barrels re-export the same symbols as `src/schemas/**`.
 */
import { describe, expect, it } from "vitest";
import * as mainBarrel from "../src/schemas";
import * as complianceTree from "../src/schemas/compliance";
import * as mainTree from "../src/schemas/index";
import * as complianceBarrel from "../src/schemas-compliance";

const EXPECTED_COMPLIANCE_EXPORT_COUNT = 29;

function runtimeExportKeys(module: Record<string, unknown>): string[] {
	return Object.keys(module).sort();
}

function diffExports(
	expected: Record<string, unknown>,
	actual: Record<string, unknown>,
) {
	const expectedKeys = new Set(runtimeExportKeys(expected));
	const actualKeys = new Set(runtimeExportKeys(actual));
	const missing = [...expectedKeys].filter((key) => !actualKeys.has(key));
	const unexpected = [...actualKeys].filter((key) => !expectedKeys.has(key));
	return { missing, unexpected, expectedKeys, actualKeys };
}

describe("schema barrel export parity", () => {
	it("root main barrel matches src/schemas/index", () => {
		const { missing, unexpected, expectedKeys, actualKeys } = diffExports(
			mainTree,
			mainBarrel,
		);

		expect(missing, `missing barrel exports: ${missing.join(", ")}`).toEqual(
			[],
		);
		expect(
			unexpected,
			`unexpected barrel exports: ${unexpected.join(", ")}`,
		).toEqual([]);
		expect(actualKeys.size).toBe(expectedKeys.size);
	});

	it("root compliance barrel matches src/schemas/compliance", () => {
		const { missing, unexpected, expectedKeys, actualKeys } = diffExports(
			complianceTree,
			complianceBarrel,
		);

		expect(missing, `missing barrel exports: ${missing.join(", ")}`).toEqual(
			[],
		);
		expect(
			unexpected,
			`unexpected barrel exports: ${unexpected.join(", ")}`,
		).toEqual([]);
		expect(actualKeys.size).toBe(expectedKeys.size);
		expect(expectedKeys.size).toBe(EXPECTED_COMPLIANCE_EXPORT_COUNT);
	});
});
