/**
 * Payroll assignment Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-assign-operator",
	orgId: "org-payroll-assign-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const payrollMocks = vi.hoisted(() => ({
	createPayrollEmployeeAssignment: vi.fn(),
	getPayrollEmployeeAssignment: vi.fn(),
	createPayrollRecurringEarning: vi.fn(),
	createPayrollRecurringDeduction: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: {
		session: {
			requireRole: authMocks.requireRole,
			get: authMocks.getSession,
		},
	},
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-payroll-assign-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		createPayrollEmployeeAssignment:
			payrollMocks.createPayrollEmployeeAssignment,
		getPayrollEmployeeAssignment: payrollMocks.getPayrollEmployeeAssignment,
		createPayrollRecurringEarning: payrollMocks.createPayrollRecurringEarning,
		createPayrollRecurringDeduction:
			payrollMocks.createPayrollRecurringDeduction,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	createPayrollEmployeeAssignmentAction,
	createPayrollRecurringDeductionAction,
	createPayrollRecurringEarningAction,
	getPayrollEmployeeAssignmentAction,
} from "../app/actions/payroll-assignments";

const payGroupId = "11111111-1111-4111-8111-111111111111";
const assignmentId = "22222222-2222-4222-8222-222222222222";
const earningRuleId = "33333333-3333-4333-8333-333333333333";
const deductionRuleId = "44444444-4444-4444-8444-444444444444";
const employeeId = "emp-assign-001";

describe("Payroll assignment Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.createPayrollEmployeeAssignment.mockResolvedValue({
			ok: true,
			data: { id: assignmentId },
		});
		payrollMocks.getPayrollEmployeeAssignment.mockResolvedValue({
			ok: true,
			data: { id: assignmentId },
		});
		payrollMocks.createPayrollRecurringEarning.mockResolvedValue({
			ok: true,
			data: { id: "re-1" },
		});
		payrollMocks.createPayrollRecurringDeduction.mockResolvedValue({
			ok: true,
			data: { id: "rd-1" },
		});
	});

	it("denies createPayrollEmployeeAssignmentAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollEmployeeAssignmentAction({
			effectiveFrom: "2026-01-01",
			employeeId,
			idempotencyKey: "idem-assign-1",
			payGroupId,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollEmployeeAssignment).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.setup.manage",
		);
	});

	it("stamps session on createPayrollEmployeeAssignmentAction", async () => {
		const result = await createPayrollEmployeeAssignmentAction({
			effectiveFrom: "2026-01-01",
			employeeId,
			idempotencyKey: "idem-assign-1",
			payGroupId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollEmployeeAssignment).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-assign-test",
				effectiveFrom: "2026-01-01",
				employeeId,
				idempotencyKey: "idem-assign-1",
				payGroupId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("reads an assignment with payroll.setup.manage", async () => {
		const result = await getPayrollEmployeeAssignmentAction({ assignmentId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getPayrollEmployeeAssignment).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-assign-test",
				assignmentId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("creates recurring earning and deduction with session stamps", async () => {
		const earning = await createPayrollRecurringEarningAction({
			amount: "100.00",
			assignmentId,
			currencyCode: "MYR",
			earningRuleId,
			effectiveFrom: "2026-01-01",
			employeeId,
			idempotencyKey: "idem-re-1",
		});
		const deduction = await createPayrollRecurringDeductionAction({
			amount: "10.00",
			assignmentId,
			currencyCode: "MYR",
			deductionRuleId,
			effectiveFrom: "2026-01-01",
			employeeId,
			idempotencyKey: "idem-rd-1",
		});

		expect(earning.ok).toBe(true);
		expect(deduction.ok).toBe(true);
		expect(payrollMocks.createPayrollRecurringEarning).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-assign-test",
				earningRuleId,
			}),
			{ kind: "payroll-options" },
		);
		expect(payrollMocks.createPayrollRecurringDeduction).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-assign-test",
				deductionRuleId,
			}),
			{ kind: "payroll-options" },
		);
	});
});
