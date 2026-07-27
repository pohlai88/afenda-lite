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
	addCompanyName: vi.fn(),
	endCompanyActivity: vi.fn(),
	registerCompanyActivity: vi.fn(),
	registerCompanyIdentifier: vi.fn(),
	retireCompanyIdentifier: vi.fn(),
	supersedeCompanyName: vi.fn(),
	retireCompanyName: vi.fn(),
	setCompanyFinancialYear: vi.fn(),
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyIdentifier: vi.fn(),
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
	createCorrelationId: () => "corr-ca-identity-action-test",
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", () => ({
	addCompanyName: corporateAdministrationMocks.addCompanyName,
	endCompanyActivity: corporateAdministrationMocks.endCompanyActivity,
	registerCompanyActivity: corporateAdministrationMocks.registerCompanyActivity,
	registerCompanyIdentifier:
		corporateAdministrationMocks.registerCompanyIdentifier,
	retireCompanyIdentifier: corporateAdministrationMocks.retireCompanyIdentifier,
	supersedeCompanyName: corporateAdministrationMocks.supersedeCompanyName,
	retireCompanyName: corporateAdministrationMocks.retireCompanyName,
	setCompanyFinancialYear: corporateAdministrationMocks.setCompanyFinancialYear,
	setCompanyLegalForm: corporateAdministrationMocks.setCompanyLegalForm,
	supersedeCompanyIdentifier:
		corporateAdministrationMocks.supersedeCompanyIdentifier,
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
	addCompanyNameAction,
	registerCompanyActivityAction,
	registerCompanyIdentifierAction,
	setCompanyFinancialYearAction,
	setCompanyLegalFormAction,
	supersedeCompanyNameAction,
} from "../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company identity Server Actions", () => {
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
				activityStore: "ca-activity-store",
				financialYearStore: "ca-financial-year-store",
				identifierStore: "ca-identifier-store",
				nameStore: "ca-name-store",
				legalFormStore: "ca-legal-form-store",
			},
		);
	});

	it("rejects browser-controlled organization IDs", async () => {
		const result = await addCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "legal",
				languageCode: "en",
				displayName: "Afenda Malaysia Sdn Bhd",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-name",
			}),
		);

		expect(result.ok).toBe(false);
		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR" }),
		);
		expect(corporateAdministrationMocks.addCompanyName).not.toHaveBeenCalled();
	});

	it("stamps session org and actor on company-name add", async () => {
		corporateAdministrationMocks.addCompanyName.mockResolvedValue({
			ok: true,
			data: {
				id: "33333333-3333-4333-8333-333333333333",
				version: 2,
			},
		});

		const result = await addCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				nameType: "legal",
				languageCode: "en",
				displayName: "Afenda Malaysia Sdn Bhd",
				effectiveFrom: "2026-01-01",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-name",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyNameId: "33333333-3333-4333-8333-333333333333",
				version: 2,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-identity-action-test",
			idempotencyKey: "idem-name",
		});
		expect(corporateAdministrationMocks.addCompanyName).toHaveBeenCalledWith(
			expect.not.objectContaining({ organizationId: expect.any(String) }),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({
				store: "ca-store",
				nameStore: "ca-name-store",
			}),
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
				legalFormCode: "private_limited_company",
				jurisdictionCode: "my",
				entityTypeCode: "private_limited_company",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identity-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-legal-form",
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

	it("passes approval metadata and revalidates only identity and overview routes", async () => {
		corporateAdministrationMocks.supersedeCompanyName.mockResolvedValue({
			ok: true,
			data: {
				id: "44444444-4444-4444-8444-444444444444",
				version: 3,
			},
		});

		const result = await supersedeCompanyNameAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyNameId: "33333333-3333-4333-8333-333333333333",
				expectedNameVersion: "2",
				"replacement.nameType": "legal",
				"replacement.languageCode": "en",
				"replacement.displayName": "Afenda Holdings Sdn Bhd",
				"replacement.effectiveFrom": "2027-01-01",
				"replacement.sourceDocumentId": "doc-identity-2",
				"replacement.correctionReason": "Board-approved statutory rename.",
				idempotencyKey: "idem-supersede-name",
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
			}),
		);

		expect(result.ok).toBe(true);
		expect(
			corporateAdministrationMocks.supersedeCompanyName,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				companyNameId: "33333333-3333-4333-8333-333333333333",
				expectedNameVersion: 2,
			}),
			expect.objectContaining({
				approvalRequestId: "55555555-5555-4555-8555-555555555555",
				approvalDecisionId: "66666666-6666-4666-8666-666666666666",
			}),
			expect.any(Object),
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
		expect(cacheMocks.revalidatePath).toHaveBeenNthCalledWith(
			1,
			"/o/afenda/corporate/companies/22222222-2222-4222-8222-222222222222/identity",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenNthCalledWith(
			2,
			"/o/afenda/corporate/companies/22222222-2222-4222-8222-222222222222/overview",
		);
	});

	it("rejects tax identifier types before package execution", async () => {
		const result = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "tax",
				jurisdictionCode: "my",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identifier-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-identifier-tax",
			}),
		);

		expect(result.ok).toBe(false);
		expect(result).toEqual(
			expect.objectContaining({ code: "VALIDATION_ERROR" }),
		);
		expect(
			corporateAdministrationMocks.registerCompanyIdentifier,
		).not.toHaveBeenCalled();
	});

	it("stamps session org and actor on identifier registration", async () => {
		corporateAdministrationMocks.registerCompanyIdentifier.mockResolvedValue({
			ok: true,
			data: {
				id: "77777777-7777-4777-8777-777777777777",
				version: 4,
			},
		});

		const result = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "company_registration",
				jurisdictionCode: "my",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-identifier-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-identifier-register",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyIdentifierId: "77777777-7777-4777-8777-777777777777",
				version: 4,
			},
		});
		expect(
			corporateAdministrationMocks.registerCompanyIdentifier,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({
				organizationId: memberSession.orgId,
				actorUserId: memberSession.userId,
			}),
			expect.objectContaining({
				identifierStore: "ca-identifier-store",
			}),
		);
	});

	it("maps financial-year overlap without revalidating routes", async () => {
		corporateAdministrationMocks.setCompanyFinancialYear.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration financial year overlaps an existing period.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});

		const result = await setCompanyFinancialYearAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				fiscalYearStartMonth: "7",
				fiscalYearStartDay: "1",
				reportingCurrencyCode: "myr",
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-financial-year-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-financial-year",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration financial year overlaps an existing period.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});

	it("maps activity conflict without revalidating routes", async () => {
		corporateAdministrationMocks.registerCompanyActivity.mockResolvedValue({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration activity overlaps an existing activity.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});

		const result = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				activityCode: "software_services",
				classification: "operational",
				jurisdictionCode: "my",
				description: "Software services",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-activity-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-activity",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "CONFLICT",
			message:
				"Corporate Administration activity overlaps an existing activity.",
			details: {
				reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			},
		});
		expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
	});
});
