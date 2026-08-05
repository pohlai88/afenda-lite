/**
 * Payroll privacy Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-privacy-operator",
	orgId: "org-payroll-privacy-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const memberSession = {
	userId: "user-payroll-privacy-member",
	orgId: "org-payroll-privacy-active",
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
	restrictPayrollSubject: vi.fn(),
	liftPayrollRestriction: vi.fn(),
	recordPayrollRetentionEvidence: vi.fn(),
	expirePayrollRetention: vi.fn(),
	projectPayrollFields: vi.fn(),
	respondToPayrollSubjectAccess: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-privacy-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		restrictPayrollSubject: payrollMocks.restrictPayrollSubject,
		liftPayrollRestriction: payrollMocks.liftPayrollRestriction,
		recordPayrollRetentionEvidence: payrollMocks.recordPayrollRetentionEvidence,
		expirePayrollRetention: payrollMocks.expirePayrollRetention,
		projectPayrollFields: payrollMocks.projectPayrollFields,
		respondToPayrollSubjectAccess: payrollMocks.respondToPayrollSubjectAccess,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	expirePayrollRetentionAction,
	liftPayrollRestrictionAction,
	projectPayrollFieldsAction,
	recordPayrollRetentionEvidenceAction,
	respondToPayrollSubjectAccessAction,
	restrictPayrollSubjectAction,
} from "../app/actions/payroll-privacy";

const employeeId = "emp-privacy-001";
const runId = "11111111-1111-4111-8111-111111111111";
const restrictionId = "restrict-001";
const evidenceId = "evidence-001";

describe("Payroll privacy Server Actions — operator surface", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		authMocks.getSession.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.restrictPayrollSubject.mockResolvedValue({
			ok: true,
			data: { restrictionId },
		});
		payrollMocks.liftPayrollRestriction.mockResolvedValue({
			ok: true,
			data: { restrictionId },
		});
		payrollMocks.recordPayrollRetentionEvidence.mockResolvedValue({
			ok: true,
			data: { evidenceId },
		});
		payrollMocks.expirePayrollRetention.mockResolvedValue({
			ok: true,
			data: { evidenceId },
		});
		payrollMocks.projectPayrollFields.mockResolvedValue({
			ok: true,
			data: { fields: {} },
		});
		payrollMocks.respondToPayrollSubjectAccess.mockResolvedValue({
			ok: true,
			data: { export: {} },
		});
	});

	it("denies restrictPayrollSubjectAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await restrictPayrollSubjectAction({
			classifications: ["payslip"],
			employeeId,
			restrictionReference: "GDPR-001",
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.restrictPayrollSubject).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.payslip.read-all",
		);
	});

	it("rejects invalid restrictPayrollSubjectAction input before calling the domain", async () => {
		const result = await restrictPayrollSubjectAction({
			classifications: [],
			employeeId,
			restrictionReference: "GDPR-001",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.restrictPayrollSubject).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on restrictPayrollSubjectAction", async () => {
		const result = await restrictPayrollSubjectAction({
			classifications: ["payslip", "compensation"],
			employeeId,
			restrictionReference: "GDPR-001",
			legalBasis: "Article 18 GDPR",
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.restrictPayrollSubject).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-privacy-test",
				classifications: ["payslip", "compensation"],
				employeeId,
				restrictionReference: "GDPR-001",
				legalBasis: "Article 18 GDPR",
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on liftPayrollRestrictionAction with payroll.payslip.read-all", async () => {
		const result = await liftPayrollRestrictionAction({
			reason: "Restriction period ended",
			restrictionId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.liftPayrollRestriction).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-privacy-test",
				reason: "Restriction period ended",
				restrictionId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.payslip.read-all",
		);
	});

	it("stamps session on recordPayrollRetentionEvidenceAction", async () => {
		const result = await recordPayrollRetentionEvidenceAction({
			classifications: ["statutory_results"],
			clockStartedAt: "2026-01-01",
			employeeId,
			legalBasis: "Tax Act s.82",
			minimumRetentionMonths: 84,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.recordPayrollRetentionEvidence).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-privacy-test",
				classifications: ["statutory_results"],
				clockStartedAt: "2026-01-01",
				employeeId,
				legalBasis: "Tax Act s.82",
				minimumRetentionMonths: 84,
			},
			{ kind: "payroll-options" },
		);
	});

	it("rejects recordPayrollRetentionEvidenceAction with empty classifications", async () => {
		const result = await recordPayrollRetentionEvidenceAction({
			classifications: [],
			clockStartedAt: "2026-01-01",
			employeeId,
			legalBasis: "Tax Act",
			minimumRetentionMonths: 84,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.recordPayrollRetentionEvidence).not.toHaveBeenCalled();
	});

	it("stamps session on expirePayrollRetentionAction", async () => {
		const result = await expirePayrollRetentionAction({ evidenceId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.expirePayrollRetention).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-privacy-test",
				evidenceId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on projectPayrollFieldsAction (no correlationId — query only)", async () => {
		const result = await projectPayrollFieldsAction({ employeeId, runId });

		expect(result.ok).toBe(true);
		expect(payrollMocks.projectPayrollFields).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				employeeId,
				runId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.payslip.read-all",
		);
	});
});

describe("Payroll privacy Server Actions — member (DSAR) surface", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(memberSession);
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.respondToPayrollSubjectAccess.mockResolvedValue({
			ok: true,
			data: { export: {} },
		});
	});

	it("denies respondToPayrollSubjectAccessAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await respondToPayrollSubjectAccessAction({
			employeeId,
			runId,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.respondToPayrollSubjectAccess).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"payroll.payslip.read-own",
		);
	});

	it("stamps session on respondToPayrollSubjectAccessAction with payroll.payslip.read-own", async () => {
		const result = await respondToPayrollSubjectAccessAction({
			employeeId,
			runId,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.respondToPayrollSubjectAccess).toHaveBeenCalledWith(
			{
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
				correlationId: "corr-payroll-privacy-test",
				employeeId,
				runId,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			memberSession,
			"payroll.payslip.read-own",
		);
	});

	it("rejects respondToPayrollSubjectAccessAction with invalid runId", async () => {
		const result = await respondToPayrollSubjectAccessAction({
			employeeId,
			runId: "not-a-uuid",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.respondToPayrollSubjectAccess).not.toHaveBeenCalled();
	});
});
