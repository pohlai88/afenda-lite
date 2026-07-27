import { beforeEach, describe, expect, it, vi } from "vitest";

const memberSession = {
	userId: "user-ca-member",
	orgId: "org-ca-active",
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
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyLegalForm: vi.fn(),
}));

const compositionMocks = vi.hoisted(() => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getSession: authMocks.getSession,
	requireRole: vi.fn(),
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-ca-legal-form-action-test",
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", () => ({
	addCompanyName: vi.fn(),
	retireCompanyName: vi.fn(),
	supersedeCompanyName: vi.fn(),
	setCompanyLegalForm: corporateAdministrationMocks.setCompanyLegalForm,
	supersedeCompanyLegalForm:
		corporateAdministrationMocks.supersedeCompanyLegalForm,
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
	setCompanyLegalFormAction,
	supersedeCompanyLegalFormAction,
} from "../../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company legal-form actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store", legalFormStore: "ca-legal-form-store" },
		);
	});

	it("stamps session facts and normalizes jurisdiction input", async () => {
		corporateAdministrationMocks.setCompanyLegalForm.mockResolvedValue({
			ok: true,
			data: {
				id: "44444444-4444-4444-8444-444444444444",
				version: 2,
			},
		});

		const result = await setCompanyLegalFormAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				legalFormCode: "private_limited_company",
				jurisdictionCode: "my",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-legal-form-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-legal-form-set",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				legalFormHistoryId: "44444444-4444-4444-8444-444444444444",
				version: 2,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-legal-form-action-test",
			idempotencyKey: "idem-legal-form-set",
		});
		expect(
			corporateAdministrationMocks.setCompanyLegalForm,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				jurisdictionCode: "MY",
				legalFormCode: "private_limited_company",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.objectContaining({ legalFormStore: "ca-legal-form-store" }),
		);
	});

	it("maps overlap feedback without revalidating routes", async () => {
		corporateAdministrationMocks.setCompanyLegalForm.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration legal form overlaps an existing legal form.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});

		const result = await setCompanyLegalFormAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				legalFormCode: "public_limited_company",
				jurisdictionCode: "MY",
				entityTypeCode: "public_limited_company",
				effectiveFrom: "2026-06-01",
				sourceDocumentId: "doc-legal-form-2",
				expectedCompanyVersion: "2",
				idempotencyKey: "idem-legal-form-overlap",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration legal form overlaps an existing legal form.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("passes approval metadata for legal-form supersession", async () => {
		corporateAdministrationMocks.supersedeCompanyLegalForm.mockResolvedValue({
			ok: true,
			data: {
				id: "55555555-5555-4555-8555-555555555555",
				version: 1,
			},
		});

		const result = await supersedeCompanyLegalFormAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyLegalFormHistoryId: "44444444-4444-4444-8444-444444444444",
				expectedLegalFormVersion: "2",
				"replacement.legalFormCode": "public_limited_company",
				"replacement.jurisdictionCode": "MY",
				"replacement.entityTypeCode": "public_limited_company",
				"replacement.effectiveFrom": "2027-01-01",
				"replacement.sourceDocumentId": "doc-legal-form-3",
				"replacement.correctionReason": "Regulatory conversion.",
				idempotencyKey: "idem-legal-form-supersede",
				approvalRequestId: "66666666-6666-4666-8666-666666666666",
				approvalDecisionId: "77777777-7777-4777-8777-777777777777",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			corporateAdministrationMocks.supersedeCompanyLegalForm,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				companyLegalFormHistoryId: "44444444-4444-4444-8444-444444444444",
				expectedLegalFormVersion: 2,
			}),
			expect.objectContaining({
				approvalRequestId: "66666666-6666-4666-8666-666666666666",
				approvalDecisionId: "77777777-7777-4777-8777-777777777777",
			}),
			expect.any(Object),
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
	});
});
