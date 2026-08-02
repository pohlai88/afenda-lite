import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES,
	HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_AUTHORIZATION,
} from "../src/features/payroll-handoff/operation-registry";
import { HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS } from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");

describe("Approved payroll handoff operation registry", () => {
	it("owns and derives the cross-domain assembly query", () => {
		const definitions = Object.values(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERIES);
		expect(definitions).toHaveLength(1);
		expect(definitions[0]?.owner).toBe("reporting-bulk-reliability");
		expect(HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_IDS).toEqual(
			definitions.map(({ id }) => id),
		);
		expect(source("src/facade/capabilities.ts")).toMatch(
			/export const assembleApprovedPayrollHandoff\s*=/,
		);
		expect(
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(({ id }) => id),
		).toContain(definitions[0]?.id);
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_PAYROLL_HANDOFF_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				id,
				permission,
			);
		}
	});

	it("keeps authorization and execution on narrow store projections", () => {
		const handler = source(
			"src/features/payroll-handoff/approved-payroll-handoff.ts",
		);
		const runner = source("src/features/payroll-handoff/run-operation.ts");
		const store = source("src/features/payroll-handoff/store.ts");
		expect(handler.match(/storeMethods:/g)).toHaveLength(1);
		expect(handler).toContain('"getApprovedCompensationHandoff"');
		expect(handler).toContain('"findAssignmentByEmploymentAsOf"');
		expect(handler).toContain('"getApprovedLeaveHandoff"');
		expect(handler).toContain('"getApprovedTimeHandoff"');
		expect(runner).toContain('"getPrimaryManagerForEmployee"');
		expect(`${handler}\n${runner}\n${store}`).not.toContain(
			"HumanResourcesStore",
		);
	});
});
