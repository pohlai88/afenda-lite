/**
 * Payroll retro-pay Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-retro-operator",
	orgId: "org-payroll-retro-active",
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
	queueRetroItem: vi.fn(),
	calculateRetroDifference: vi.fn(),
	applyRetroToPeriod: vi.fn(),
	listRetroItems: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-retro-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		queueRetroItem: payrollMocks.queueRetroItem,
		calculateRetroDifference: payrollMocks.calculateRetroDifference,
		applyRetroToPeriod: payrollMocks.applyRetroToPeriod,
		listRetroItems: payrollMocks.listRetroItems,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	applyRetroToPeriodAction,
	calculateRetroDifferenceAction,
	listRetroItemsAction,
	queueRetroItemAction,
} from "../app/actions/payroll-retro-pay";

const periodId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const retroItemId = "33333333-3333-4333-8333-333333333333";
const employeeId = "emp-retro-001";

const queueInput = {
	correction: { amount: "500.00", kind: "base_compensation" as const },
	employeeId,
	idempotencyKey: "idem-retro-1",
	originPeriodId: periodId,
	reason: "Salary correction for March",
};

describe("Payroll retro-pay Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.queueRetroItem.mockResolvedValue({
			ok: true,
			data: { id: retroItemId, status: "pending" },
		});
		payrollMocks.calculateRetroDifference.mockResolvedValue({
			ok: true,
			data: { retroItemId, lines: [] },
		});
		payrollMocks.applyRetroToPeriod.mockResolvedValue({
			ok: true,
			data: { retroItemId, status: "applied" },
		});
		payrollMocks.listRetroItems.mockResolvedValue({
			ok: true,
			data: [{ id: retroItemId, status: "pending" }],
		});
	});

	it("denies queueRetroItemAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await queueRetroItemAction(queueInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.queueRetroItem).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.input.manage",
		);
	});

	it("rejects invalid queueRetroItemAction input before calling the domain", async () => {
		const result = await queueRetroItemAction({
			...queueInput,
			reason: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.queueRetroItem).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on queueRetroItemAction", async () => {
		const result = await queueRetroItemAction(queueInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.queueRetroItem).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-retro-test",
				correction: { amount: "500.00", kind: "base_compensation" },
				employeeId,
				idempotencyKey: "idem-retro-1",
				originPeriodId: periodId,
				reason: "Salary correction for March",
			},
			{ kind: "payroll-options" },
		);
	});

	it("denies calculateRetroDifferenceAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await calculateRetroDifferenceAction({
			originRunId: runId,
			retroItemId,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.calculateRetroDifference).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("stamps session on calculateRetroDifferenceAction", async () => {
		const result = await calculateRetroDifferenceAction({
			originRunId: runId,
			retroItemId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.calculateRetroDifference).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-retro-test",
				originRunId: runId,
				retroItemId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on applyRetroToPeriodAction with payroll.input.manage", async () => {
		const result = await applyRetroToPeriodAction({
			retroItemId,
			targetPeriodId: periodId,
			targetRunId: runId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.applyRetroToPeriod).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-retro-test",
				retroItemId,
				targetPeriodId: periodId,
				targetRunId: runId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.input.manage",
		);
	});

	it("lists retro items with payroll.run.review", async () => {
		const result = await listRetroItemsAction({
			employeeId,
			status: "pending",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.listRetroItems).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				employeeId,
				status: "pending",
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("rejects invalid applyRetroToPeriodAction input", async () => {
		const result = await applyRetroToPeriodAction({
			retroItemId: "not-a-uuid",
			targetPeriodId: periodId,
			targetRunId: runId,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.applyRetroToPeriod).not.toHaveBeenCalled();
	});
});
