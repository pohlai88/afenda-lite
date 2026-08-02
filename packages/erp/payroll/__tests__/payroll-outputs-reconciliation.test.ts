import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import {
	payrollResultLineRecordSchema,
	payrollRunEmployeeRecordSchema,
} from "../src/features/calculation/outputs.schema";
import { payrollRunRecordSchema } from "../src/features/payroll-runs/runs.schema";
import {
	getOwnPayrollPayslip,
	getPayrollPayslip,
} from "../src/features/payslips/payslip";
import {
	listPayrollReconciliationsForRun,
	recordPayrollReconciliation,
	resolvePayrollReconciliation,
} from "../src/features/reconciliation/reconciliation.command";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
} from "../src/kernel/execution/permissions";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORGANIZATION_ID = "org-payroll-outputs";
const ACTOR_ID = "actor-payroll-outputs";
const EMPLOYEE_ID = "employee-payroll-outputs";
const RUN_ID = "00000000-0000-4000-8000-000000000801";
const RUN_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000802";

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function seedFinalizedRun() {
	const store = createMemoryPayrollStore();
	const now = new Date("2025-02-01T00:00:00.000Z");
	const run = payrollRunRecordSchema.parse({
		id: RUN_ID,
		organizationId: ORGANIZATION_ID,
		payGroupId: "00000000-0000-4000-8000-000000000803",
		periodId: "00000000-0000-4000-8000-000000000804",
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
		employeeId: EMPLOYEE_ID,
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
	const line = payrollResultLineRecordSchema.parse({
		id: "00000000-0000-4000-8000-000000000805",
		organizationId: ORGANIZATION_ID,
		runId: RUN_ID,
		runEmployeeId: RUN_EMPLOYEE_ID,
		employeeId: EMPLOYEE_ID,
		lineKind: "earning",
		code: "BASE",
		ruleCode: "BASE",
		ruleVersion: "1",
		ruleKind: "earning",
		amount: "1000",
		currencyCode: "USD",
		sourceType: null,
		sourceId: null,
		sequence: 1,
		traceRef: "trace-base",
		createdAt: now,
		updatedAt: now,
	});
	store.state.runs.runs.set(run.id, run);
	store.state.outputs.runEmployees.set(employee.id, employee);
	store.state.outputs.resultLines.set(line.id, line);
	return store;
}

describe("payroll outputs and reconciliation", () => {
	it("derives a deterministic payslip for self-service without accepting an employee selector", async () => {
		const store = seedFinalizedRun();
		const options = {
			store,
			authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_OWN]),
			employees: {
				getApprovedPayrollHandoff: async () => errorResult.ok(null),
				resolveActorEmployeeId: async () => errorResult.ok(EMPLOYEE_ID),
			},
		};
		const first = await getOwnPayrollPayslip(
			{ organizationId: ORGANIZATION_ID, runId: RUN_ID, actorUserId: ACTOR_ID },
			options,
		);
		const second = await getOwnPayrollPayslip(
			{ organizationId: ORGANIZATION_ID, runId: RUN_ID, actorUserId: ACTOR_ID },
			options,
		);
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!(first.ok && second.ok)) {
			return;
		}
		expect(first.data.employeeId).toBe(EMPLOYEE_ID);
		expect(first.data.contentHash).toBe(second.data.contentHash);
		expect(first.data.lines).toHaveLength(1);
		const storedRun = store.state.runs.runs.get(RUN_ID);
		if (storedRun === undefined) {
			return;
		}
		store.state.runs.runs.set(RUN_ID, {
			...storedRun,
			status: "reversed",
			reversedAt: new Date("2025-02-02T00:00:00.000Z"),
			reversedBy: ACTOR_ID,
		});
		const reversed = await getOwnPayrollPayslip(
			{ organizationId: ORGANIZATION_ID, runId: RUN_ID, actorUserId: ACTOR_ID },
			options,
		);
		expect(reversed.ok).toBe(true);
		if (reversed.ok) {
			expect(reversed.data.status).toBe("reversed");
			expect(reversed.data.contentHash).toBe(first.data.contentHash);
		}
		const [lineId, line] =
			[...store.state.outputs.resultLines.entries()][0] ?? [];
		if (lineId === undefined || line === undefined) {
			return;
		}
		store.state.outputs.resultLines.set(lineId, { ...line, amount: "999" });
		const tampered = await getOwnPayrollPayslip(
			{ organizationId: ORGANIZATION_ID, runId: RUN_ID, actorUserId: ACTOR_ID },
			options,
		);
		expect(tampered.ok).toBe(true);
		if (tampered.ok) {
			expect(tampered.data.contentHash).not.toBe(first.data.contentHash);
		}
	});

	it("keeps all-employee access behind its distinct permission", async () => {
		const denied = await getPayrollPayslip(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
			},
			{
				store: seedFinalizedRun(),
				authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_OWN]),
			},
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("FORBIDDEN");
		}
	});

	it("derives expected totals and tolerance policy with idempotent replay", async () => {
		const store = seedFinalizedRun();
		const options = {
			store,
			ports: createMemoryMutationPorts(),
			authorization: authorization([PAYROLL_PERMISSION_RECONCILIATION_MANAGE]),
		};
		const input = {
			organizationId: ORGANIZATION_ID,
			runId: RUN_ID,
			kind: "payment",
			downstreamReference: "payment-batch-1",
			actualAmount: "850",
			currencyCode: "USD",
			idempotencyKey: "reconciliation-payment-batch-1",
			actorUserId: ACTOR_ID,
			correlationId: "corr-reconciliation-1",
		};
		const first = await recordPayrollReconciliation(input, options);
		const replay = await recordPayrollReconciliation(input, options);
		expect(first.ok).toBe(true);
		expect(replay.ok).toBe(true);
		if (!(first.ok && replay.ok)) {
			return;
		}
		expect(first.data.status).toBe("matched");
		expect(first.data.expectedAmount).toBe("850");
		expect(first.data.toleranceAmount).toBe("0");
		expect(replay.data.id).toBe(first.data.id);
		const callerOwnedSemantics = await recordPayrollReconciliation(
			{ ...input, expectedAmount: "1" },
			options,
		);
		expect(callerOwnedSemantics.ok).toBe(false);
		if (!callerOwnedSemantics.ok) {
			expect(callerOwnedSemantics.code).toBe("VALIDATION_ERROR");
		}

		const discrepancy = await recordPayrollReconciliation(
			{
				...input,
				actualAmount: "800",
				idempotencyKey: "reconciliation-payment-batch-2",
			},
			options,
		);
		expect(discrepancy.ok).toBe(true);
		if (!discrepancy.ok) {
			return;
		}
		expect(discrepancy.data.status).toBe("discrepant");
		const resolved = await resolvePayrollReconciliation(
			{
				organizationId: ORGANIZATION_ID,
				reconciliationId: discrepancy.data.id,
				resolutionNote: "Downstream batch corrected and independently verified",
				expectedVersion: discrepancy.data.version,
				actorUserId: ACTOR_ID,
				correlationId: "corr-reconciliation-resolve",
			},
			options,
		);
		expect(resolved.ok).toBe(true);
		if (resolved.ok) {
			expect(resolved.data).toMatchObject({
				status: "resolved",
				resolvedBy: ACTOR_ID,
				version: discrepancy.data.version + 1,
			});
		}
		const accounting = await recordPayrollReconciliation(
			{
				...input,
				kind: "accounting",
				downstreamReference: "posting-batch-1",
				actualAmount: "999",
				idempotencyKey: "reconciliation-posting-batch-1",
			},
			options,
		);
		expect(accounting.ok).toBe(true);
		if (accounting.ok) {
			expect(accounting.data).toMatchObject({
				kind: "accounting",
				expectedAmount: "1000",
				status: "discrepant",
			});
		}
		const aggregateState = await listPayrollReconciliationsForRun(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				actorUserId: ACTOR_ID,
			},
			options,
		);
		expect(aggregateState.ok).toBe(true);
		if (aggregateState.ok) {
			expect(aggregateState.data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ kind: "payment", status: "matched" }),
					expect.objectContaining({
						kind: "accounting",
						status: "discrepant",
					}),
				]),
			);
		}
	});
});
