/**
 * Payroll period Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-period-operator",
	orgId: "org-payroll-period-active",
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
	createPayrollPeriod: vi.fn(),
	updatePayrollPeriod: vi.fn(),
	lockPayrollPeriodInputs: vi.fn(),
	closePayrollPeriod: vi.fn(),
	getPayrollPeriod: vi.fn(),
	listPayrollPeriods: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-period-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		createPayrollPeriod: payrollMocks.createPayrollPeriod,
		updatePayrollPeriod: payrollMocks.updatePayrollPeriod,
		lockPayrollPeriodInputs: payrollMocks.lockPayrollPeriodInputs,
		closePayrollPeriod: payrollMocks.closePayrollPeriod,
		getPayrollPeriod: payrollMocks.getPayrollPeriod,
		listPayrollPeriods: payrollMocks.listPayrollPeriods,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	closePayrollPeriodAction,
	createPayrollPeriodAction,
	getPayrollPeriodAction,
	listPayrollPeriodsAction,
	lockPayrollPeriodInputsAction,
	updatePayrollPeriodAction,
} from "../app/actions/payroll-period";

const payGroupId = "22222222-2222-4222-8222-222222222222";
const periodId = "33333333-3333-4333-8333-333333333333";

const createInput = {
	cutoffDate: "2026-07-25",
	idempotencyKey: "idem-period-1",
	payGroupId,
	periodEnd: "2026-07-31",
	periodStart: "2026-07-01",
};

describe("Payroll period Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.createPayrollPeriod.mockResolvedValue({
			ok: true,
			data: { id: periodId, status: "open" },
		});
		payrollMocks.updatePayrollPeriod.mockResolvedValue({
			ok: true,
			data: { id: periodId, status: "open" },
		});
		payrollMocks.lockPayrollPeriodInputs.mockResolvedValue({
			ok: true,
			data: { id: periodId, status: "inputs_locked" },
		});
		payrollMocks.closePayrollPeriod.mockResolvedValue({
			ok: true,
			data: { id: periodId, status: "closed" },
		});
		payrollMocks.getPayrollPeriod.mockResolvedValue({
			ok: true,
			data: { id: periodId, status: "open" },
		});
		payrollMocks.listPayrollPeriods.mockResolvedValue({
			ok: true,
			data: [{ id: periodId, status: "open" }],
		});
	});

	it("denies createPayrollPeriodAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollPeriodAction(createInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollPeriod).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.setup.manage",
		);
	});

	it("rejects invalid createPayrollPeriodAction input before calling the domain", async () => {
		const result = await createPayrollPeriodAction({
			...createInput,
			periodEnd: "2026-06-01",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.createPayrollPeriod).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on createPayrollPeriodAction", async () => {
		const result = await createPayrollPeriodAction(createInput);

		expect(result).toEqual({
			ok: true,
			data: { id: periodId, status: "open" },
		});
		expect(payrollMocks.createPayrollPeriod).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				cutoffDate: "2026-07-25",
				idempotencyKey: "idem-period-1",
				payGroupId,
				periodEnd: "2026-07-31",
				periodStart: "2026-07-01",
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps lockPayrollPeriodInputsAction from the operator session", async () => {
		const result = await lockPayrollPeriodInputsAction({
			periodId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.lockPayrollPeriodInputs).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				periodId,
				expectedVersion: 1,
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps closePayrollPeriodAction from the operator session", async () => {
		const result = await closePayrollPeriodAction({
			periodId,
			expectedVersion: 2,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.closePayrollPeriod).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				periodId,
				expectedVersion: 2,
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps updatePayrollPeriodAction from the operator session", async () => {
		const result = await updatePayrollPeriodAction({
			periodId,
			expectedVersion: 1,
			cutoffDate: "2026-07-28",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.updatePayrollPeriod).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				periodId,
				expectedVersion: 1,
				cutoffDate: "2026-07-28",
			},
			{ kind: "payroll-options" },
		);
	});

	it("reads and lists periods with payroll.setup.manage", async () => {
		const getResult = await getPayrollPeriodAction({ periodId });
		const listResult = await listPayrollPeriodsAction({
			payGroupId,
			status: "open",
		});

		expect(getResult.ok).toBe(true);
		expect(listResult.ok).toBe(true);
		expect(payrollMocks.getPayrollPeriod).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				periodId,
			},
			{ kind: "payroll-options" },
		);
		expect(payrollMocks.listPayrollPeriods).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-period-test",
				payGroupId,
				status: "open",
			},
			{ kind: "payroll-options" },
		);
	});
});
