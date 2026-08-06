import { describe, expect, it } from "vitest";

import { payrollRunEmployeeRecordSchema } from "../src/features/calculation/outputs.schema";
import { payrollRunRecordSchema } from "../src/features/payroll-runs/runs.schema";
import { getPayrollPayslip } from "../src/features/payslips/payslip";
import {
	expirePayrollRetention,
	liftPayrollRestriction,
	projectPayrollFields,
	recordPayrollRetentionEvidence,
	respondToPayrollSubjectAccess,
	restrictPayrollSubject,
} from "../src/features/privacy/privacy.command";
import type { PayrollAuthorizationPort } from "../src/kernel/execution/authorization";
import {
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
} from "../src/kernel/execution/permissions";
import type { PayrollWorkforceInputPort } from "../src/kernel/execution/ports";
import { createMemoryPayrollStore } from "../src/testing/index";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { createMemoryPayrollPrivacyPort } from "./helpers/memory-privacy-port";

const ORGANIZATION_ID = "org-payroll-privacy";
const ACTOR_ID = "actor-payroll-privacy";
const OTHER_ACTOR_ID = "actor-payroll-privacy-other";
const RUN_ID = "00000000-0000-4000-8000-000000000a01";
const RUN_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000a02";
const EMPLOYEE_ID = "00000000-0000-4000-8000-000000000a03";
const OTHER_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000a04";

function authorization(
	permissions: readonly string[],
): PayrollAuthorizationPort {
	return {
		can: async ({ permission }) => permissions.includes(permission),
	};
}

function employeesPort(actorEmployeeId: string): PayrollWorkforceInputPort {
	return {
		resolveActorEmployeeId() {
			return Promise.resolve({ ok: true, data: actorEmployeeId });
		},
		getApprovedPayrollHandoff() {
			return Promise.resolve({ ok: true, data: null });
		},
	};
}

function seedFinalizedRun() {
	const store = createMemoryPayrollStore();
	const now = new Date("2025-03-01T00:00:00.000Z");
	const run = payrollRunRecordSchema.parse({
		id: RUN_ID,
		organizationId: ORGANIZATION_ID,
		payGroupId: "00000000-0000-4000-8000-000000000a05",
		periodId: "00000000-0000-4000-8000-000000000a06",
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
	store.state.runs.runs.set(run.id, run);
	store.state.outputs.runEmployees.set(employee.id, employee);
	return store;
}

describe("payroll privacy", () => {
	it("projects read-all payslip fields including employer cost", async () => {
		const store = seedFinalizedRun();
		const projected = await projectPayrollFields(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
			},
			{
				store,
				authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_ALL]),
				ports: createMemoryMutationPorts(),
			},
		);
		expect(projected.ok).toBe(true);
		if (projected.ok) {
			expect(projected.data.projectionScope).toBe("read-all");
			expect(projected.data.fields.employerCost).toBe("25");
			expect(projected.data.omittedFieldNames).toEqual([]);
		}
	});

	it("restricts payslip reads only when a privacy port is composed", async () => {
		const store = seedFinalizedRun();
		const privacy = createMemoryPayrollPrivacyPort();
		const options = {
			store,
			authorization: authorization([
				PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
				PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
			]),
			ports: createMemoryMutationPorts(),
			privacy,
			employees: employeesPort(EMPLOYEE_ID),
		};
		const unrestricted = await getPayrollPayslip(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
			},
			{ store, authorization: options.authorization },
		);
		expect(unrestricted.ok).toBe(true);

		const restricted = await restrictPayrollSubject(
			{
				organizationId: ORGANIZATION_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-restrict-1",
				restrictionReference: "dsar-hold",
				classifications: ["payslip_evidence"],
			},
			options,
		);
		expect(restricted.ok).toBe(true);

		const blocked = await getPayrollPayslip(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) {
			expect(blocked.code).toBe("CONFLICT");
		}

		if (restricted.ok) {
			const lifted = await liftPayrollRestriction(
				{
					organizationId: ORGANIZATION_ID,
					restrictionId: restricted.data.restrictionId,
					actorUserId: ACTOR_ID,
					correlationId: "corr-lift-1",
					reason: "Counsel released the hold",
				},
				options,
			);
			expect(lifted.ok).toBe(true);
		}

		const restored = await getPayrollPayslip(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
			},
			options,
		);
		expect(restored.ok).toBe(true);
	});

	it("marks retention eligible without erasing evidence", async () => {
		const store = seedFinalizedRun();
		const options = {
			store,
			authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_ALL]),
			ports: createMemoryMutationPorts(),
			privacy: createMemoryPayrollPrivacyPort(),
		};
		const recorded = await recordPayrollRetentionEvidence(
			{
				organizationId: ORGANIZATION_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-retention-1",
				legalBasis: "statutory_payslip_retention",
				classifications: ["payslip_evidence", "statutory_identifier"],
				clockStartedAt: "2018-01-01T00:00:00.000Z",
				minimumRetentionMonths: 84,
			},
			options,
		);
		expect(recorded.ok).toBe(true);
		if (!recorded.ok) {
			return;
		}
		expect(recorded.data.eligibleForErasure).toBe(false);

		const tooSoon = await expirePayrollRetention(
			{
				organizationId: ORGANIZATION_ID,
				evidenceId: recorded.data.evidenceId,
				actorUserId: ACTOR_ID,
				correlationId: "corr-retention-early",
				expiredAt: "2020-01-01T00:00:00.000Z",
			},
			options,
		);
		expect(tooSoon.ok).toBe(false);

		const expired = await expirePayrollRetention(
			{
				organizationId: ORGANIZATION_ID,
				evidenceId: recorded.data.evidenceId,
				actorUserId: ACTOR_ID,
				correlationId: "corr-retention-due",
				expiredAt: "2025-01-01T00:00:00.000Z",
			},
			options,
		);
		expect(expired.ok).toBe(true);
		if (expired.ok) {
			expect(expired.data.eligibleForErasure).toBe(true);
			expect(expired.data.evidenceId).toBe(recorded.data.evidenceId);
		}
	});

	it("keeps subject-access on read-own and rejects other employees", async () => {
		const store = seedFinalizedRun();
		const privacy = createMemoryPayrollPrivacyPort();
		const own = await respondToPayrollSubjectAccess(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: EMPLOYEE_ID,
				actorUserId: ACTOR_ID,
				correlationId: "corr-dsar-own",
			},
			{
				store,
				authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_OWN]),
				ports: createMemoryMutationPorts(),
				privacy,
				employees: employeesPort(EMPLOYEE_ID),
			},
		);
		expect(own.ok).toBe(true);
		if (own.ok) {
			expect(own.data.projectionScope).toBe("read-own");
			expect(own.data.records[0]?.fields.employerCost).toBeUndefined();
			expect(own.data.records[0]?.fields.net).toBe("850");
		}

		const foreign = await respondToPayrollSubjectAccess(
			{
				organizationId: ORGANIZATION_ID,
				runId: RUN_ID,
				employeeId: OTHER_EMPLOYEE_ID,
				actorUserId: OTHER_ACTOR_ID,
				correlationId: "corr-dsar-foreign",
			},
			{
				store,
				authorization: authorization([PAYROLL_PERMISSION_PAYSLIP_READ_OWN]),
				ports: createMemoryMutationPorts(),
				privacy,
				employees: employeesPort(EMPLOYEE_ID),
			},
		);
		expect(foreign.ok).toBe(false);
		if (!foreign.ok) {
			expect(foreign.code).toBe("FORBIDDEN");
		}
	});
});
