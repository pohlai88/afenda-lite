import { describe, expect, it } from "vitest";

import { payrollRunEmployeeRecordSchema } from "../src/features/calculation/outputs.schema";
import { reversePayrollRun } from "../src/features/payroll-runs/reversal";
import { payrollRunRecordSchema } from "../src/features/payroll-runs/runs.schema";
import { recordPayrollReconciliation } from "../src/features/reconciliation/reconciliation.command";
import { parsePayrollDisbursementReference } from "../src/features/settlement-ingress/parse-payroll-disbursement-reference";
import { recordPaymentSettlement } from "../src/features/settlement-ingress/settlement.command";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
	PAYROLL_PERMISSION_RUN_REVERSE,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-settlement-ingress";
const ACTOR_ID = "actor-settlement-ingress";
const RUN_ID = "00000000-0000-4000-8000-000000000901";
const RUN_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000902";
const PAYMENT_ID = "00000000-0000-4000-8000-000000000903";

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function seedFinalizedRun() {
	const store = createMemoryPayrollStore();
	const now = new Date("2025-03-01T00:00:00.000Z");
	const run = payrollRunRecordSchema.parse({
		id: RUN_ID,
		organizationId: ORGANIZATION_ID,
		payGroupId: "00000000-0000-4000-8000-000000000904",
		periodId: "00000000-0000-4000-8000-000000000905",
		runType: "regular",
		sequence: 1,
		status: "finalized",
		finalizedAt: now.toISOString(),
		finalizedBy: ACTOR_ID,
		calculationSnapshotHash: "snapshot-hash",
		calculationVersion: "payroll.calc.v1",
		roundingPolicyJson: { mode: "half_even", scale: 2 },
		version: 3,
		createdBy: ACTOR_ID,
		updatedBy: ACTOR_ID,
		createdAt: now,
		updatedAt: now,
	});
	const employee = payrollRunEmployeeRecordSchema.parse({
		id: RUN_EMPLOYEE_ID,
		organizationId: ORGANIZATION_ID,
		runId: RUN_ID,
		employeeId: "00000000-0000-4000-8000-000000000906",
		assignmentId: null,
		currencyCode: "USD",
		gross: "1000",
		employeeDeductions: "100",
		employeeStatutory: "50",
		employerCost: "25",
		net: "850",
		snapshotJson: {},
		snapshotHash: "employee-snapshot-hash",
		calculationVersion: "payroll.calc.v1",
		status: "calculated",
		createdAt: now,
		updatedAt: now,
	});
	store.state.runs.runs.set(run.id, run);
	store.state.outputs.runEmployees.set(employee.id, employee);
	return store;
}

describe("settlement-ingress", () => {
	it("parses payroll disbursement references", () => {
		const parsed = parsePayrollDisbursementReference(
			`payroll-run:${RUN_ID}:employee:00000000-0000-4000-8000-000000000906`,
		);
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.data).toEqual({
				runId: RUN_ID,
				employeeId: "00000000-0000-4000-8000-000000000906",
			});
		}
	});

	it("records payment settlement through reconciliation", async () => {
		const store = seedFinalizedRun();
		const options = {
			store,
			authorization: authorization([PAYROLL_PERMISSION_RECONCILIATION_MANAGE]),
			ports: createMemoryMutationPorts(),
		};
		const recorded = await recordPaymentSettlement(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				paymentId: PAYMENT_ID,
				settlementStatus: "settled",
				actualAmount: "850",
				currencyCode: "USD",
				idempotencyKey: "settlement-payment-1",
				actorUserId: ACTOR_ID,
				correlationId: "corr-settlement-1",
			},
			options,
		);
		expect(recorded.ok).toBe(true);
		if (recorded.ok) {
			expect(recorded.data.kind).toBe("payment");
			expect(recorded.data.status).toBe("matched");
		}
	});

	it("blocks run reversal after matched payment settlement", async () => {
		const store = seedFinalizedRun();
		const options = {
			store,
			authorization: authorization([
				PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
				PAYROLL_PERMISSION_RUN_REVERSE,
			]),
			ports: createMemoryMutationPorts(),
		};
		const settled = await recordPayrollReconciliation(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				kind: "payment",
				downstreamReference: PAYMENT_ID,
				actualAmount: "850",
				currencyCode: "USD",
				idempotencyKey: "settlement-payment-block",
				actorUserId: ACTOR_ID,
				correlationId: "corr-settlement-block",
			},
			options,
		);
		expect(settled.ok).toBe(true);

		const reversed = await reversePayrollRun(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				expectedVersion: 3,
				reasonCode: "operational_correction",
				reason: "Attempt reversal after settlement",
				idempotencyKey: "reverse-after-settlement",
				actorUserId: ACTOR_ID,
				correlationId: "corr-reverse-block",
			},
			options,
		);
		expect(reversed.ok).toBe(false);
		if (!reversed.ok) {
			expect(reversed.code).toBe("CONFLICT");
		}
	});
});
