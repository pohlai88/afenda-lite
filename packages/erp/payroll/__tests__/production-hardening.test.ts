import { describe, expect, expectTypeOf, it } from "vitest";
import type { createProductionPayrollRunCalculator } from "../src/features/calculation/production-run-calculator";
import { getPayrollPayslip } from "../src/features/payslips/payslip";
import {
	getStatutoryCalculatorReadiness,
	isStatutoryProductionReady,
} from "../src/features/statutory-rules/calculator-registry";
import type { PayrollObservabilityPort } from "../src/kernel/execution/ports";
import { buildPayrollCreateFingerprint } from "../src/kernel/identity/create-fingerprint";
import { createMemoryPayrollStore } from "../src/testing/index";

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
