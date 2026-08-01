import { describe, expect, expectTypeOf, it } from "vitest";
import { payrollModuleManifest } from "../src/module.manifest";
import { PAYROLL_COMMAND_IDS, PAYROLL_QUERY_IDS } from "../src/module-ids";
import { getPayrollPayslip } from "../src/outputs/payslip";
import type { PayrollObservabilityPort } from "../src/ports";
import type { createProductionPayrollRunCalculator } from "../src/runs/production-run-calculator";
import { buildPayrollCreateFingerprint } from "../src/shared/create-fingerprint";
import {
	getStatutoryCalculatorReadiness,
	isStatutoryProductionReady,
} from "../src/statutory/calculators/registry";
import { createMemoryPayrollStore } from "../src/testing";

describe("payroll production hardening", () => {
	it("uses bounded canonical digests for request fingerprints", () => {
		const detailedReason = "sensitive-detail".repeat(32);
		const first = buildPayrollCreateFingerprint({
			runId: "run-1",
			detail: detailedReason,
			context: { version: 3, code: "operational_correction" },
		});
		const reordered = buildPayrollCreateFingerprint({
			context: { code: "operational_correction", version: 3 },
			detail: detailedReason,
			runId: "run-1",
		});
		expect(first).toBe(reordered);
		expect(first).toHaveLength(64);
		expect(first).not.toContain(detailedReason);
	});

	it("maps every command and query to explicit authorization", () => {
		expect(
			Object.keys(payrollModuleManifest.authorization.commands).sort(),
		).toEqual([...PAYROLL_COMMAND_IDS].sort());
		expect(
			Object.keys(payrollModuleManifest.authorization.queries).sort(),
		).toEqual([...PAYROLL_QUERY_IDS].sort());
	});

	it("records bounded telemetry with tokenized identities and no payroll payload", async () => {
		const observations: Parameters<PayrollObservabilityPort["record"]>[0][] =
			[];
		const organizationId = "organization-sensitive-value";
		const actorUserId = "actor-sensitive-value";
		const result = await getPayrollPayslip(
			{
				organizationId,
				runId: "00000000-0000-4000-8000-000000000901",
				employeeId: "employee-sensitive-value",
				actorUserId,
			},
			{
				store: createMemoryPayrollStore(),
				authorization: { can: async () => false },
				observability: {
					record: (observation) => {
						observations.push(observation);
					},
				},
			},
		);
		expect(result.ok).toBe(false);
		expect(observations).toHaveLength(1);
		expect(observations[0]).toMatchObject({
			operation: "payroll.payslip.read-all",
			outcome: "failure",
			errorCode: "FORBIDDEN",
		});
		const serialized = JSON.stringify(observations);
		expect(serialized).not.toContain(organizationId);
		expect(serialized).not.toContain(actorUserId);
		expect(serialized).not.toContain("employee-sensitive-value");
	});

	it("fails the production-readiness claim while only synthetic statutory logic exists", () => {
		expectTypeOf<
			Parameters<typeof createProductionPayrollRunCalculator>[0]
		>().not.toHaveProperty("allowSyntheticCalculators");
		expect(getStatutoryCalculatorReadiness()).toEqual([
			{ calculatorId: "synth.v1", status: "synthetic_only" },
		]);
		expect(isStatutoryProductionReady()).toBe(false);
	});
});
