/**
 * Payroll variable-input Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-input-operator",
	orgId: "org-payroll-input-active",
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
	createPayrollVariableInput: vi.fn(),
	getPayrollVariableInput: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-input-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		createPayrollVariableInput: payrollMocks.createPayrollVariableInput,
		getPayrollVariableInput: payrollMocks.getPayrollVariableInput,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	createPayrollVariableInputAction,
	getPayrollVariableInputAction,
} from "../app/actions/payroll-variable-inputs";

const payGroupId = "11111111-1111-4111-8111-111111111111";
const periodId = "22222222-2222-4222-8222-222222222222";
const earningRuleId = "33333333-3333-4333-8333-333333333333";
const variableInputId = "44444444-4444-4444-8444-444444444444";
const employeeId = "emp-input-001";

const createInput = {
	amount: "250.00",
	currencyCode: "MYR",
	earningRuleId,
	effectiveFrom: "2026-01-01",
	employeeId,
	idempotencyKey: "idem-input-1",
	payGroupId,
	periodId,
	sourceId: "timesheet-1",
	sourceType: "timesheet",
};

describe("Payroll variable-input Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.createPayrollVariableInput.mockResolvedValue({
			ok: true,
			data: { id: variableInputId },
		});
		payrollMocks.getPayrollVariableInput.mockResolvedValue({
			ok: true,
			data: { id: variableInputId },
		});
	});

	it("denies createPayrollVariableInputAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollVariableInputAction(createInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollVariableInput).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.input.manage",
		);
	});

	it("rejects invalid createPayrollVariableInputAction input before calling the domain", async () => {
		const result = await createPayrollVariableInputAction({
			...createInput,
			currencyCode: "MY",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.createPayrollVariableInput).not.toHaveBeenCalled();
	});

	it("stamps session on createPayrollVariableInputAction", async () => {
		const result = await createPayrollVariableInputAction(createInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.createPayrollVariableInput).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-input-test",
				...createInput,
			},
			{ kind: "payroll-options" },
		);
	});

	it("reads a variable input with payroll.input.manage", async () => {
		const result = await getPayrollVariableInputAction({ variableInputId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getPayrollVariableInput).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-input-test",
				variableInputId,
			},
			{ kind: "payroll-options" },
		);
	});
});
