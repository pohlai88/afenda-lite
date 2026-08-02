import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: vi.fn(), requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-financial-year-form-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: vi.fn(),
}));

vi.mock("@afenda/corporate-administration", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@afenda/corporate-administration")
	>()),
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

vi.mock("@/lib/erp/corporate-administration-command-options", () => ({
	createCorporateAdministrationCommandOptions: vi.fn(),
	createCorporateAdministrationCompanyDependencies: vi.fn(),
}));

vi.mock("@/app/actions/legal-company-identity-actions", () => ({
	addCompanyNameFormAction: vi.fn(),
	endCompanyActivityFormAction: vi.fn(),
	registerCompanyActivityFormAction: vi.fn(),
	registerCompanyIdentifierFormAction: vi.fn(),
	setCompanyFinancialYearFormAction: vi.fn(),
	setCompanyLegalFormFormAction: vi.fn(),
	supersedeCompanyIdentifierFormAction: vi.fn(),
	supersedeCompanyLegalFormFormAction: vi.fn(),
	supersedeCompanyNameFormAction: vi.fn(),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import {
	FinancialYearForm,
	type LegalCompanyIdentityCompany,
	type LegalCompanyIdentityFinancialYear,
	LegalCompanyIdentityWorkspace,
} from "../../features/corporate-administration/legal-company-identity-workspace";

const company: LegalCompanyIdentityCompany = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 4,
};

const financialYears: readonly LegalCompanyIdentityFinancialYear[] = [
	{
		companyFinancialYearId: "88888888-8888-4888-8888-888888888888",
		fiscalYearStartMonth: 7,
		fiscalYearStartDay: 1,
		reportingCurrencyCode: "MYR",
		effectiveFrom: "2026-07-01",
		effectiveTo: null,
		status: "active",
		version: 2,
	},
];

describe("Corporate Administration company financial-year form", () => {
	it("renders accessible financial-year controls without organization ID input", () => {
		const html = renderToStaticMarkup(
			createElement(FinancialYearForm, {
				action: vi.fn(),
				canWrite: true,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain('aria-label="Set company financial year"');
		expect(html).toContain('name="legalCompanyId"');
		expect(html).toContain('name="expectedCompanyVersion"');
		expect(html).not.toContain('name="organizationId"');
		expect(html).toContain("Start month");
		expect(html).toContain("Start day");
		expect(html).toContain("Reporting currency");
		expect(html).toContain("Source document");
	});

	it("disables financial-year controls for read-only members", () => {
		const html = renderToStaticMarkup(
			createElement(FinancialYearForm, {
				action: vi.fn(),
				canWrite: false,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain("<fieldset");
		expect(html).toContain("disabled=");
	});

	it("renders empty and persisted financial-year states in the identity workspace", () => {
		const empty = renderToStaticMarkup(
			createElement(LegalCompanyIdentityWorkspace, {
				activities: [],
				canWrite: true,
				company,
				financialYears: [],
				identifiers: [],
				legalForms: [],
				names: [],
				organizationSlug: "afenda",
			}),
		);
		expect(empty).toContain("No financial-year history has been recorded.");

		const persisted = renderToStaticMarkup(
			createElement(LegalCompanyIdentityWorkspace, {
				activities: [],
				canWrite: true,
				company,
				financialYears,
				identifiers: [],
				legalForms: [],
				names: [],
				organizationSlug: "afenda",
			}),
		);
		expect(persisted).toContain("7/1");
		expect(persisted).toContain("MYR");
		expect(persisted).toContain("2026-07-01 to open");
	});
});
