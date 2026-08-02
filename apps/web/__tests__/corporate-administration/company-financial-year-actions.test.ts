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
	retireCompanyName: vi.fn(),
	setCompanyFinancialYear: vi.fn(),
	setCompanyLegalForm: vi.fn(),
	supersedeCompanyIdentifier: vi.fn(),
	supersedeCompanyLegalForm: vi.fn(),
	supersedeCompanyName: vi.fn(),
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
	http: { correlation: { create: () => "corr-ca-financial-year-action-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
	addCompanyName: corporateAdministrationMocks.addCompanyName,
	endCompanyActivity: corporateAdministrationMocks.endCompanyActivity,
	registerCompanyActivity: corporateAdministrationMocks.registerCompanyActivity,
	registerCompanyIdentifier:
		corporateAdministrationMocks.registerCompanyIdentifier,
	retireCompanyIdentifier: corporateAdministrationMocks.retireCompanyIdentifier,
	retireCompanyName: corporateAdministrationMocks.retireCompanyName,
	setCompanyFinancialYear: corporateAdministrationMocks.setCompanyFinancialYear,
	setCompanyLegalForm: corporateAdministrationMocks.setCompanyLegalForm,
	supersedeCompanyIdentifier:
		corporateAdministrationMocks.supersedeCompanyIdentifier,
	supersedeCompanyLegalForm:
		corporateAdministrationMocks.supersedeCompanyLegalForm,
	supersedeCompanyName: corporateAdministrationMocks.supersedeCompanyName,
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

import { setCompanyFinancialYearAction } from "../../app/actions/legal-company-identity-actions";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

describe("Corporate Administration company financial-year actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getSession.mockResolvedValue(memberSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		compositionMocks.createCorporateAdministrationCommandOptions.mockImplementation(
			(input) => ({ ...input, authorization: { can: vi.fn() } }),
		);
		compositionMocks.createCorporateAdministrationCompanyDependencies.mockReturnValue(
			{ store: "ca-store", financialYearStore: "ca-financial-year-store" },
		);
	});

	it("rejects browser-controlled organization IDs", async () => {
		const result = await setCompanyFinancialYearAction(
			formData({
				organizationSlug: "afenda",
				organizationId: "org-forged",
				legalCompanyId: "22222222-2222-4222-8222-222222222222",
				fiscalYearStartMonth: "7",
				fiscalYearStartDay: "1",
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-fy-1",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-fy-forged",
			}),
		);

		expect(result).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);
		expect(
			corporateAdministrationMocks.setCompanyFinancialYear,
		).not.toHaveBeenCalled();
	});

	it("stamps session facts and normalizes reporting currency", async () => {
		corporateAdministrationMocks.setCompanyFinancialYear.mockResolvedValue({
			ok: true,
			data: {
				id: "88888888-8888-4888-8888-888888888888",
				version: 2,
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
				sourceDocumentId: "doc-fy-2",
				expectedCompanyVersion: "1",
				idempotencyKey: "idem-fy-set",
			}),
		);

		expect(result).toEqual({
			ok: true,
			data: {
				companyFinancialYearId: "88888888-8888-4888-8888-888888888888",
				version: 2,
			},
		});
		expect(
			compositionMocks.createCorporateAdministrationCommandOptions,
		).toHaveBeenCalledWith({
			organizationId: memberSession.orgId,
			actorUserId: memberSession.userId,
			correlationId: "corr-ca-financial-year-action-test",
			idempotencyKey: "idem-fy-set",
		});
		expect(
			corporateAdministrationMocks.setCompanyFinancialYear,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				fiscalYearStartMonth: 7,
				fiscalYearStartDay: 1,
				reportingCurrencyCode: "MYR",
				expectedCompanyVersion: 1,
			}),
			expect.objectContaining({ organizationId: memberSession.orgId }),
			expect.objectContaining({
				financialYearStore: "ca-financial-year-store",
			}),
		);
	});

	it("maps financial-year overlap without route revalidation", async () => {
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
				fiscalYearStartMonth: "12",
				fiscalYearStartDay: "31",
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-fy-3",
				expectedCompanyVersion: "2",
				idempotencyKey: "idem-fy-overlap",
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
});
