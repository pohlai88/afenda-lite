import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

vi.mock("@afenda/auth", () => ({
	getSession: authMocks.getSession,
	requireRole: vi.fn(),
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-ca-1-3-journey-test",
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
	revalidatePath: vi.fn(),
}));

import {
	registerCompanyActivityAction,
	registerCompanyIdentifierAction,
	setCompanyFinancialYearAction,
} from "../../app/actions/legal-company-identity-actions";
import {
	ActivityHistory,
	IdentifierHistory,
	type LegalCompanyIdentityActivity,
	type LegalCompanyIdentityFinancialYear,
	type LegalCompanyIdentityIdentifier,
	LegalCompanyIdentityWorkspace,
} from "../../features/corporate-administration/legal-company-identity-workspace";

function formData(entries: Readonly<Record<string, string>>): FormData {
	const form = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		form.set(key, value);
	}
	return form;
}

const company = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 6,
} as const;

describe("Corporate Administration CA-1.3 identity journey", () => {
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
			},
		);
	});

	it("runs the authenticated CA-1.3 identifier, financial-year and activity workflow", async () => {
		const identifiers: LegalCompanyIdentityIdentifier[] = [];
		const financialYears: LegalCompanyIdentityFinancialYear[] = [];
		const activities: LegalCompanyIdentityActivity[] = [];

		corporateAdministrationMocks.registerCompanyIdentifier.mockImplementation(
			async (input) => {
				if (input.identifierValue === "2026-01234567") {
					return {
						ok: false,
						code: "CONFLICT",
						message:
							"Corporate Administration identifier overlaps an existing fact.",
						details: {
							reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
						},
					};
				}
				const record: LegalCompanyIdentityIdentifier = {
					companyIdentifierId: "77777777-7777-4777-8777-777777777777",
					identifierType: input.identifierType,
					jurisdictionCode: input.jurisdictionCode,
					issuingAuthorityCode: input.issuingAuthorityCode,
					displayValue: input.identifierValue,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					status: "active",
					version: 1,
				};
				identifiers.push(record);
				return {
					ok: true,
					data: { id: record.companyIdentifierId, version: record.version },
				};
			},
		);
		corporateAdministrationMocks.setCompanyFinancialYear.mockImplementation(
			async (input) => {
				const record: LegalCompanyIdentityFinancialYear = {
					companyFinancialYearId: "88888888-8888-4888-8888-888888888888",
					fiscalYearStartMonth: input.fiscalYearStartMonth,
					fiscalYearStartDay: input.fiscalYearStartDay,
					reportingCurrencyCode: input.reportingCurrencyCode,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					status: "active",
					version: 1,
				};
				financialYears.push(record);
				return {
					ok: true,
					data: {
						id: record.companyFinancialYearId,
						version: record.version,
					},
				};
			},
		);
		corporateAdministrationMocks.registerCompanyActivity.mockImplementation(
			async (input) => {
				if (
					activities.some(
						(activity) => activity.activityCode === input.activityCode,
					)
				) {
					return {
						ok: false,
						code: "CONFLICT",
						message:
							"Corporate Administration activity overlaps an existing activity.",
						details: {
							reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
						},
					};
				}
				const record: LegalCompanyIdentityActivity = {
					companyActivityId: "99999999-9999-4999-8999-999999999999",
					activityCode: input.activityCode,
					classification: input.classification,
					jurisdictionCode: input.jurisdictionCode,
					regulatorCode: input.regulatorCode,
					description: input.description,
					effectiveFrom: input.effectiveFrom,
					effectiveTo: input.effectiveTo,
					status: "active",
					version: 1,
				};
				activities.push(record);
				return {
					ok: true,
					data: { id: record.companyActivityId, version: record.version },
				};
			},
		);

		const openedEmptyIdentity = renderToStaticMarkup(
			createElement(LegalCompanyIdentityWorkspace, {
				activities,
				canWrite: true,
				company,
				financialYears,
				identifiers,
				legalForms: [],
				names: [],
				organizationSlug: "afenda",
			}),
		);
		expect(openedEmptyIdentity).toContain("No company identifiers");
		expect(openedEmptyIdentity).toContain("No financial-year history");
		expect(openedEmptyIdentity).toContain("No company activities");

		const registeredIdentifier = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-07654321",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-ca-1-3-identifier",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-identifier",
			}),
		);
		expect(registeredIdentifier.ok).toBe(true);
		expect(authMocks.getSession).toHaveBeenCalled();

		const rejectedTax = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				identifierType: "gst",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "LHDN",
				identifierValue: "GST-123",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-ca-1-3-tax",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-tax",
			}),
		);
		expect(rejectedTax).toEqual(
			expect.objectContaining({ ok: false, code: "VALIDATION_ERROR" }),
		);

		const financialYear = await setCompanyFinancialYearAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				fiscalYearStartMonth: "7",
				fiscalYearStartDay: "1",
				reportingCurrencyCode: "MYR",
				effectiveFrom: "2026-07-01",
				sourceDocumentId: "doc-ca-1-3-financial-year",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-financial-year",
			}),
		);
		expect(financialYear.ok).toBe(true);

		const regulatedActivity = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "mcmc",
				description: "Regulated software services",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-ca-1-3-activity",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-activity",
			}),
		);
		expect(regulatedActivity.ok).toBe(true);

		const persistedReload = renderToStaticMarkup(
			createElement(LegalCompanyIdentityWorkspace, {
				activities,
				canWrite: true,
				company,
				financialYears,
				identifiers,
				legalForms: [],
				names: [],
				organizationSlug: "afenda",
			}),
		);
		expect(persistedReload).toContain("2026-07654321");
		expect(persistedReload).toContain("7/1");
		expect(persistedReload).toContain("software_services");
		expect(
			renderToStaticMarkup(createElement(IdentifierHistory, { identifiers })),
		).toContain("MY / SSM");
		expect(
			renderToStaticMarkup(createElement(ActivityHistory, { activities })),
		).toContain("regulated");

		const duplicateIdentifier = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-01234567",
				effectiveFrom: "2026-06-01",
				sourceDocumentId: "doc-ca-1-3-identifier-overlap",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-identifier-overlap",
			}),
		);
		expect(duplicateIdentifier).toEqual(
			expect.objectContaining({
				ok: false,
				code: "CONFLICT",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			}),
		);

		const duplicateActivity = await registerCompanyActivityAction(
			formData({
				organizationSlug: "afenda",
				legalCompanyId: company.legalCompanyId,
				activityCode: "software_services",
				classification: "regulated",
				jurisdictionCode: "MY",
				regulatorCode: "mcmc",
				description: "Duplicate regulated software services",
				effectiveFrom: "2026-06-01",
				sourceDocumentId: "doc-ca-1-3-activity-overlap",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-activity-overlap",
			}),
		);
		expect(duplicateActivity).toEqual(
			expect.objectContaining({
				ok: false,
				code: "CONFLICT",
				details: {
					reason: "CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
				},
			}),
		);
	});

	it("fails closed for unauthorized tenant access before package mutation", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await registerCompanyIdentifierAction(
			formData({
				organizationSlug: "other-tenant",
				legalCompanyId: company.legalCompanyId,
				identifierType: "company_registration",
				jurisdictionCode: "MY",
				issuingAuthorityCode: "SSM",
				identifierValue: "2026-07654321",
				effectiveFrom: "2026-01-01",
				sourceDocumentId: "doc-ca-1-3-denied",
				expectedCompanyVersion: "6",
				idempotencyKey: "idem-ca-1-3-denied",
			}),
		);

		expect(result).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});
		expect(
			corporateAdministrationMocks.registerCompanyIdentifier,
		).not.toHaveBeenCalled();
	});
});
