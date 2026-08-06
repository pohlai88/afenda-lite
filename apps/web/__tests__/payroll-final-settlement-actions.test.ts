/**
 * Final-settlement Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-settlement-operator",
	orgId: "org-payroll-settlement-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const memberSession = {
	userId: "user-payroll-settlement-member",
	orgId: "org-payroll-settlement-active",
	role: "client" as const,
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
	initiateFinalSettlement: vi.fn(),
	calculateFinalSettlement: vi.fn(),
	finalizeFinalSettlement: vi.fn(),
	getFinalSettlementStatement: vi.fn(),
	getOwnFinalSettlementStatement: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-settlement-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		initiateFinalSettlement: payrollMocks.initiateFinalSettlement,
		calculateFinalSettlement: payrollMocks.calculateFinalSettlement,
		finalizeFinalSettlement: payrollMocks.finalizeFinalSettlement,
		getFinalSettlementStatement: payrollMocks.getFinalSettlementStatement,
		getOwnFinalSettlementStatement: payrollMocks.getOwnFinalSettlementStatement,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	calculateFinalSettlementAction,
	finalizeFinalSettlementAction,
	getFinalSettlementStatementAction,
	getOwnFinalSettlementStatementAction,
	initiateFinalSettlementAction,
} from "../app/actions/payroll-final-settlement";

const employeeId = "11111111-1111-4111-8111-111111111111";
const payGroupId = "22222222-2222-4222-8222-222222222222";
const periodId = "33333333-3333-4333-8333-333333333333";
const settlementId = "44444444-4444-4444-8444-444444444444";

const initiateInput = {
	employeeId,
	idempotencyKey: "idem-settlement-1",
	payGroupId,
	periodId,
	terminationEffectiveOn: "2026-07-15",
	terminationId: "term-1",
	noticePayAmount: "1200.00",
};

describe("Payroll final-settlement Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.initiateFinalSettlement.mockResolvedValue({
			ok: true,
			data: { id: settlementId, status: "initiated" },
		});
		payrollMocks.calculateFinalSettlement.mockResolvedValue({
			ok: true,
			data: { id: settlementId, status: "calculated" },
		});
		payrollMocks.finalizeFinalSettlement.mockResolvedValue({
			ok: true,
			data: { id: settlementId, status: "finalized" },
		});
		payrollMocks.getFinalSettlementStatement.mockResolvedValue({
			ok: true,
			data: { settlementId, status: "finalized" },
		});
		payrollMocks.getOwnFinalSettlementStatement.mockResolvedValue({
			ok: true,
			data: { settlementId, status: "finalized" },
		});
	});

	it("denies initiateFinalSettlementAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await initiateFinalSettlementAction(initiateInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.initiateFinalSettlement).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.create",
		);
	});

	it("rejects invalid initiateFinalSettlementAction input before calling the domain", async () => {
		const result = await initiateFinalSettlementAction({
			...initiateInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.initiateFinalSettlement).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation and never accepts leaveBalanceDays", async () => {
		const result = await initiateFinalSettlementAction(initiateInput);

		expect(result).toEqual({
			ok: true,
			data: { id: settlementId, status: "initiated" },
		});
		expect(payrollMocks.initiateFinalSettlement).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-settlement-test",
				employeeId,
				idempotencyKey: "idem-settlement-1",
				payGroupId,
				periodId,
				terminationEffectiveOn: "2026-07-15",
				terminationId: "term-1",
				noticePayAmount: "1200.00",
			},
			{ kind: "payroll-options" },
		);
		expect(
			payrollMocks.initiateFinalSettlement.mock.calls[0]?.[0],
		).not.toHaveProperty("leaveBalanceDays");
	});

	it("stamps calculateFinalSettlementAction from the operator session", async () => {
		const result = await calculateFinalSettlementAction({
			settlementId,
			expectedVersion: 1,
			clearanceReason: "C6 human clearance recorded",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.calculateFinalSettlement).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-settlement-test",
				settlementId,
				expectedVersion: 1,
				clearanceReason: "C6 human clearance recorded",
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.calculate",
		);
	});

	it("stamps finalizeFinalSettlementAction from the operator session", async () => {
		const result = await finalizeFinalSettlementAction({
			settlementId,
			expectedVersion: 2,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.finalizeFinalSettlement).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-settlement-test",
				settlementId,
				expectedVersion: 2,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.finalize",
		);
	});

	it("reads any subject statement with payroll.payslip.read-all", async () => {
		const result = await getFinalSettlementStatementAction({ settlementId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.getFinalSettlementStatement).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				settlementId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.payslip.read-all",
		);
	});

	it("reads own statement through the member session and payslip.read-own", async () => {
		const result = await getOwnFinalSettlementStatementAction({
			settlementId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.getOwnFinalSettlementStatement).toHaveBeenCalledWith(
			{
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
				settlementId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"payroll.payslip.read-own",
		);
	});
});
