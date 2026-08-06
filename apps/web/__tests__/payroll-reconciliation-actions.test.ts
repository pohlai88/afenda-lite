/**
 * Payroll reconciliation Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-recon-operator",
	orgId: "org-payroll-recon-active",
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
	recordPayrollReconciliation: vi.fn(),
	resolvePayrollReconciliation: vi.fn(),
	listPayrollReconciliationsForRun: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-recon-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		recordPayrollReconciliation: payrollMocks.recordPayrollReconciliation,
		resolvePayrollReconciliation: payrollMocks.resolvePayrollReconciliation,
		listPayrollReconciliationsForRun:
			payrollMocks.listPayrollReconciliationsForRun,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	listPayrollReconciliationsForRunAction,
	recordPayrollReconciliationAction,
	resolvePayrollReconciliationAction,
} from "../app/actions/payroll-reconciliation";

const runId = "11111111-1111-4111-8111-111111111111";
const reconciliationId = "22222222-2222-4222-8222-222222222222";

describe("Payroll reconciliation Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.recordPayrollReconciliation.mockResolvedValue({
			ok: true,
			data: { id: reconciliationId },
		});
		payrollMocks.resolvePayrollReconciliation.mockResolvedValue({
			ok: true,
			data: { id: reconciliationId, status: "resolved" },
		});
		payrollMocks.listPayrollReconciliationsForRun.mockResolvedValue({
			ok: true,
			data: [],
		});
	});

	it("denies recordPayrollReconciliationAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await recordPayrollReconciliationAction({
			actualAmount: "100.00",
			currencyCode: "MYR",
			downstreamReference: "pay-1",
			idempotencyKey: "idem-recon-1",
			kind: "payment",
			runId,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.recordPayrollReconciliation).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.reconciliation.manage",
		);
	});

	it("rejects invalid recordPayrollReconciliationAction input before calling the domain", async () => {
		const result = await recordPayrollReconciliationAction({
			actualAmount: "100.00",
			currencyCode: "MY",
			downstreamReference: "pay-1",
			idempotencyKey: "idem-recon-1",
			kind: "payment",
			runId,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.recordPayrollReconciliation).not.toHaveBeenCalled();
	});

	it("stamps session on recordPayrollReconciliationAction", async () => {
		const result = await recordPayrollReconciliationAction({
			actualAmount: "100.00",
			currencyCode: "MYR",
			downstreamReference: "pay-1",
			idempotencyKey: "idem-recon-1",
			kind: "payment",
			runId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.recordPayrollReconciliation).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-recon-test",
				actualAmount: "100.00",
				currencyCode: "MYR",
				downstreamReference: "pay-1",
				idempotencyKey: "idem-recon-1",
				kind: "payment",
				runId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps resolvePayrollReconciliationAction", async () => {
		const result = await resolvePayrollReconciliationAction({
			expectedVersion: 1,
			reconciliationId,
			resolutionNote: "Matched after bank correction",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.resolvePayrollReconciliation).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-recon-test",
				expectedVersion: 1,
				reconciliationId,
				resolutionNote: "Matched after bank correction",
			},
			{ kind: "payroll-options" },
		);
	});

	it("lists reconciliations for a run", async () => {
		const result = await listPayrollReconciliationsForRunAction({ runId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.listPayrollReconciliationsForRun).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				runId,
			},
			{ kind: "payroll-options" },
		);
	});
});
