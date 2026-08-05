/**
 * Payroll run Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-run-operator",
	orgId: "org-payroll-run-active",
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
	createPayrollRun: vi.fn(),
	calculatePayrollRun: vi.fn(),
	finalizePayrollRun: vi.fn(),
	reversePayrollRun: vi.fn(),
	getPayrollRun: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-run-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		createPayrollRun: payrollMocks.createPayrollRun,
		calculatePayrollRun: payrollMocks.calculatePayrollRun,
		finalizePayrollRun: payrollMocks.finalizePayrollRun,
		reversePayrollRun: payrollMocks.reversePayrollRun,
		getPayrollRun: payrollMocks.getPayrollRun,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	calculatePayrollRunAction,
	createPayrollRunAction,
	finalizePayrollRunAction,
	getPayrollRunAction,
	reversePayrollRunAction,
} from "../app/actions/payroll-run";

const payGroupId = "22222222-2222-4222-8222-222222222222";
const periodId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";

const createInput = {
	idempotencyKey: "idem-run-1",
	payGroupId,
	periodId,
	runType: "regular" as const,
};

describe("Payroll run Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.createPayrollRun.mockResolvedValue({
			ok: true,
			data: { id: runId, status: "draft" },
		});
		payrollMocks.calculatePayrollRun.mockResolvedValue({
			ok: true,
			data: { id: runId, status: "calculated" },
		});
		payrollMocks.finalizePayrollRun.mockResolvedValue({
			ok: true,
			data: { id: runId, status: "finalized" },
		});
		payrollMocks.reversePayrollRun.mockResolvedValue({
			ok: true,
			data: { id: runId, status: "reversed" },
		});
		payrollMocks.getPayrollRun.mockResolvedValue({
			ok: true,
			data: { id: runId, status: "draft" },
		});
	});

	it("denies createPayrollRunAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createPayrollRunAction(createInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.createPayrollRun).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.create",
		);
	});

	it("rejects invalid createPayrollRunAction input before calling the domain", async () => {
		const result = await createPayrollRunAction({
			...createInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.createPayrollRun).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on createPayrollRunAction", async () => {
		const result = await createPayrollRunAction(createInput);

		expect(result).toEqual({
			ok: true,
			data: { id: runId, status: "draft" },
		});
		expect(payrollMocks.createPayrollRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-run-test",
				idempotencyKey: "idem-run-1",
				payGroupId,
				periodId,
				runType: "regular",
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps calculatePayrollRunAction from the operator session", async () => {
		const result = await calculatePayrollRunAction({
			runId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.calculatePayrollRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-run-test",
				runId,
				expectedVersion: 1,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.calculate",
		);
	});

	it("stamps finalizePayrollRunAction from the operator session", async () => {
		const result = await finalizePayrollRunAction({
			runId,
			expectedVersion: 2,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.finalizePayrollRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-run-test",
				runId,
				expectedVersion: 2,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.finalize",
		);
	});

	it("stamps reversePayrollRunAction from the operator session", async () => {
		const result = await reversePayrollRunAction({
			runId,
			expectedVersion: 3,
			idempotencyKey: "idem-reverse-1",
			reasonCode: "calculation_correction",
			reason: "Recalculate after input fix",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.reversePayrollRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-run-test",
				runId,
				expectedVersion: 3,
				idempotencyKey: "idem-reverse-1",
				reasonCode: "calculation_correction",
				reason: "Recalculate after input fix",
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.reverse",
		);
	});

	it("reads a run with payroll.run.review", async () => {
		const result = await getPayrollRunAction({ runId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getPayrollRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				runId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});
});
