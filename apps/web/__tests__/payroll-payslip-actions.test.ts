/**
 * Payroll payslip Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-payslip-operator",
	orgId: "org-payroll-payslip-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const memberSession = {
	userId: "user-payroll-payslip-member",
	orgId: "org-payroll-payslip-active",
	role: "member" as const,
	email: "member@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const payrollMocks = vi.hoisted(() => ({
	getOwnPayrollPayslip: vi.fn(),
	getPayrollPayslip: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-payslip-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		getOwnPayrollPayslip: payrollMocks.getOwnPayrollPayslip,
		getPayrollPayslip: payrollMocks.getPayrollPayslip,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	getOwnPayrollPayslipAction,
	getPayrollPayslipAction,
} from "../app/actions/payroll-payslip";

const runId = "11111111-1111-4111-8111-111111111111";
const employeeId = "emp-payslip-001";

describe("Payroll payslip Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getSession.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.getOwnPayrollPayslip.mockResolvedValue({
			ok: true,
			data: { runId },
		});
		payrollMocks.getPayrollPayslip.mockResolvedValue({
			ok: true,
			data: { runId, employeeId },
		});
	});

	it("denies getPayrollPayslipAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await getPayrollPayslipAction({ employeeId, runId });

		expect(result.ok).toBe(false);
		expect(payrollMocks.getPayrollPayslip).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.payslip.read-all",
		);
	});

	it("rejects invalid getPayrollPayslipAction input before calling the domain", async () => {
		const result = await getPayrollPayslipAction({
			employeeId,
			runId: "not-a-uuid",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.getPayrollPayslip).not.toHaveBeenCalled();
	});

	it("stamps session on getPayrollPayslipAction with payroll.payslip.read-all", async () => {
		const result = await getPayrollPayslipAction({ employeeId, runId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getPayrollPayslip).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				employeeId,
				runId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("reads own payslip with payroll.payslip.read-own as a member", async () => {
		authMocks.requireRole.mockResolvedValue(memberSession);
		authMocks.getSession.mockResolvedValue(memberSession);

		const result = await getOwnPayrollPayslipAction({ runId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getOwnPayrollPayslip).toHaveBeenCalledWith(
			{
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
				runId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"payroll.payslip.read-own",
		);
	});
});
