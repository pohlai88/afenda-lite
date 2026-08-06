/**
 * Payroll statutory filings Server Actions — permission deny, validation, session stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-payroll-filings-operator",
	orgId: "org-payroll-filings-active",
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
	generateStatutoryFiling: vi.fn(),
	generateAnnualStatement: vi.fn(),
	listFilingObligations: vi.fn(),
	sealFilingEvidence: vi.fn(),
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
	http: { correlation: { create: () => "corr-payroll-filings-test" } },
}));

vi.mock("@afenda/payroll", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/payroll")>();
	return {
		...actual,
		generateStatutoryFiling: payrollMocks.generateStatutoryFiling,
		generateAnnualStatement: payrollMocks.generateAnnualStatement,
		listFilingObligations: payrollMocks.listFilingObligations,
		sealFilingEvidence: payrollMocks.sealFilingEvidence,
	};
});

vi.mock("@/lib/erp/payroll-command-options", () => ({
	createPayrollCommandOptions: () => ({ kind: "payroll-options" }),
}));

import {
	generateAnnualStatementAction,
	generateStatutoryFilingAction,
	listFilingObligationsAction,
	sealFilingEvidenceAction,
} from "../app/actions/payroll-statutory-filings";

const periodId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const filingId = "33333333-3333-4333-8333-333333333333";
const employeeId = "emp-filings-001";

const generateFilingInput = {
	idempotencyKey: "idem-filing-1",
	instrumentCode: "EPF",
	jurisdictionCode: "MY",
	periodId,
	runIds: [runId],
};

const generateAnnualInput = {
	employeeId,
	idempotencyKey: "idem-annual-1",
	instrumentCode: "EA",
	jurisdictionCode: "MY",
	runIds: [runId],
	taxYear: 2026,
};

describe("Payroll statutory filings Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		payrollMocks.generateStatutoryFiling.mockResolvedValue({
			ok: true,
			data: { id: filingId, status: "generated" },
		});
		payrollMocks.generateAnnualStatement.mockResolvedValue({
			ok: true,
			data: { id: filingId, taxYear: 2026 },
		});
		payrollMocks.listFilingObligations.mockResolvedValue({
			ok: true,
			data: [{ id: filingId, status: "pending" }],
		});
		payrollMocks.sealFilingEvidence.mockResolvedValue({
			ok: true,
			data: { id: filingId, status: "sealed" },
		});
	});

	it("denies generateStatutoryFilingAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await generateStatutoryFilingAction(generateFilingInput);

		expect(result.ok).toBe(false);
		expect(payrollMocks.generateStatutoryFiling).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("rejects invalid generateStatutoryFilingAction input before calling the domain", async () => {
		const result = await generateStatutoryFilingAction({
			...generateFilingInput,
			runIds: [],
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.generateStatutoryFiling).not.toHaveBeenCalled();
	});

	it("stamps session org, actor, and correlation on generateStatutoryFilingAction", async () => {
		const result = await generateStatutoryFilingAction(generateFilingInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.generateStatutoryFiling).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-filings-test",
				idempotencyKey: "idem-filing-1",
				instrumentCode: "EPF",
				jurisdictionCode: "MY",
				periodId,
				runIds: [runId],
			},
			{ kind: "payroll-options" },
		);
	});

	it("stamps session on generateAnnualStatementAction with payroll.run.review", async () => {
		const result = await generateAnnualStatementAction(generateAnnualInput);

		expect(result.ok).toBe(true);
		expect(payrollMocks.generateAnnualStatement).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-filings-test",
				employeeId,
				idempotencyKey: "idem-annual-1",
				instrumentCode: "EA",
				jurisdictionCode: "MY",
				runIds: [runId],
				taxYear: 2026,
			},
			{ kind: "payroll-options" },
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.review",
		);
	});

	it("lists filing obligations with payroll.run.review", async () => {
		const result = await listFilingObligationsAction({
			jurisdictionCode: "MY",
			taxYear: 2026,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.listFilingObligations).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-filings-test",
				jurisdictionCode: "MY",
				taxYear: 2026,
			},
			{ kind: "payroll-options" },
		);
	});

	it("denies sealFilingEvidenceAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await sealFilingEvidenceAction({
			filingId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(false);
		expect(payrollMocks.sealFilingEvidence).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"payroll.run.finalize",
		);
	});

	it("stamps session on sealFilingEvidenceAction with payroll.run.finalize", async () => {
		const result = await sealFilingEvidenceAction({
			filingId,
			expectedVersion: 1,
		});

		expect(result.ok).toBe(true);
		expect(payrollMocks.sealFilingEvidence).toHaveBeenCalledWith(
			{
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-payroll-filings-test",
				expectedVersion: 1,
				filingId,
			},
			{ kind: "payroll-options" },
		);
	});

	it("rejects annual statement with empty runIds", async () => {
		const result = await generateAnnualStatementAction({
			...generateAnnualInput,
			runIds: [],
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(payrollMocks.generateAnnualStatement).not.toHaveBeenCalled();
	});
});
