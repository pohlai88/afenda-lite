import { beforeEach, describe, expect, it, vi } from "vitest";

const memberSession = {
	userId: "user-ca-lifecycle",
	orgId: "org-ca-lifecycle",
	role: "member" as const,
	email: "member@example.com",
};

const authMocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const corporateAdministrationMocks = vi.hoisted(() => ({
	activateLegalCompany: vi.fn(),
	archiveLegalCompany: vi.fn(),
	dissolveLegalCompany: vi.fn(),
	enterLiquidation: vi.fn(),
	markCompanyStruckOff: vi.fn(),
	restoreLegalCompany: vi.fn(),
	suspendLegalCompany: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: authMocks.getSession, requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-lifecycle-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	activateLegalCompany: corporateAdministrationMocks.activateLegalCompany,
	archiveLegalCompany: corporateAdministrationMocks.archiveLegalCompany,
	dissolveLegalCompany: corporateAdministrationMocks.dissolveLegalCompany,
	enterLiquidation: corporateAdministrationMocks.enterLiquidation,
	markCompanyStruckOff: corporateAdministrationMocks.markCompanyStruckOff,
	restoreLegalCompany: corporateAdministrationMocks.restoreLegalCompany,
	suspendLegalCompany: corporateAdministrationMocks.suspendLegalCompany,
}));

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions:
		compositionMocks.createCorporateAdministrationCommandOptions,
	createCorporateAdministrationCompanyDependencies:
		compositionMocks.createCorporateAdministrationCompanyDependencies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: cacheMocks.revalidatePath,
}));

import {
	activateLegalCompanyAction,
	enterLiquidationAction,
} from "../../app/actions/legal-company-lifecycle-actions";

const legalCompanyId = "33333333-3333-4333-8333-333333333333";
const statusHistoryId = "44444444-4444-4444-8444-444444444444";

describe("Corporate Administration legal-company lifecycle Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{
				store: "ca-store",
				establishmentStore: "ca-establishment-store",
			},
		);
	});

	it("rejects browser-controlled tenant fields before calling the package", async () => {
		const result = await activateLegalCompanyAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-activate",
				expectedCompanyVersion: "4",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(
			corporateAdministrationMocks.activateLegalCompany,
		).not.toHaveBeenCalled();
	});

	it("stamps session facts and maps activation status history", async () => {
		corporateAdministrationMocks.activateLegalCompany.mockResolvedValue({
			ok: true,
			data: {
				id: statusHistoryId,
				legalCompanyId,
				status: "active",
				version: 5,
			},
		});

		const result = await activateLegalCompanyAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-activate",
				expectedCompanyVersion: "4",
				idempotencyKey: "idem-ca-activate",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyStatusHistoryId: statusHistoryId,
				legalCompanyId,
				status: "active",
				version: 5,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-lifecycle-action-test",
			idempotencyKey: "idem-ca-activate",
		});
		expect(
			corporateAdministrationMocks.activateLegalCompany,
		).toHaveBeenCalledWith(
			{
				legalCompanyId,
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-activate",
				expectedCompanyVersion: 4,
			},
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({
				establishmentStore: "ca-establishment-store",
			}),
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/client/corporate-administration",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			"/admin/corporate-administration",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledWith(
			`/o/afenda/corporate/companies/${legalCompanyId}/overview`,
		);
	});

	it("passes approval coordinates for high-risk lifecycle changes", async () => {
		corporateAdministrationMocks.enterLiquidation.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Corporate Administration approval decision is invalid",
			details: { reason: "CORPORATE_ADMINISTRATION_APPROVAL_INVALID" },
		});

		const result = await enterLiquidationAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId,
				effectiveFrom: "2026-08-01",
				reason: "Members approved liquidation",
				sourceDocumentId: "doc-liquidation",
				expectedCompanyVersion: "5",
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "FORBIDDEN" }),
		);
		expect(corporateAdministrationMocks.enterLiquidation).toHaveBeenCalledWith(
			expect.objectContaining({
				reason: "Members approved liquidation",
				expectedCompanyVersion: 5,
			}),
			expect.objectContaining({
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
			}),
			expect.any(Object),
		);
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});
});

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}
