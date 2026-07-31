import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: vi.fn(), requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-identifier-form-test" } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: vi.fn(),
}));

vi.mock("@afenda/corporate-administration", () => ({
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
	IdentifierForm,
	IdentifierHistory,
	type LegalCompanyIdentityCompany,
	type LegalCompanyIdentityIdentifier,
} from "../../features/corporate-administration/legal-company-identity-workspace";

const company: LegalCompanyIdentityCompany = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 4,
};

const identifiers: readonly LegalCompanyIdentityIdentifier[] = [
	{
		companyIdentifierId: "77777777-7777-4777-8777-777777777777",
		identifierType: "company_registration",
		jurisdictionCode: "MY",
		issuingAuthorityCode: "SSM",
		displayValue: "2026-01234567",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		status: "active",
		version: 2,
	},
];

describe("Corporate Administration company-identifier form", () => {
	it("renders accessible non-tax identifier controls without organization ID input", () => {
		const html = renderToStaticMarkup(
			createElement(IdentifierForm, {
				action: vi.fn(),
				canWrite: true,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain('aria-label="Register company identifier"');
		expect(html).toContain('aria-describedby="identifierTaxBoundary"');
		expect(html).toContain("Tax, VAT and GST registrations are owned");
		expect(html).toContain('name="legalCompanyId"');
		expect(html).toContain('name="expectedCompanyVersion"');
		expect(html).not.toContain('name="organizationId"');
		expect(html).toContain("Identifier type");
		expect(html).toContain("Issuing authority");
		expect(html).toContain("Source document");
	});

	it("disables identifier controls when the member cannot manage company identity", () => {
		const html = renderToStaticMarkup(
			createElement(IdentifierForm, {
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

	it("renders identifier history with dates and status text", () => {
		const html = renderToStaticMarkup(
			createElement(IdentifierHistory, { identifiers }),
		);

		expect(html).toContain('aria-label="Company identifier history"');
		expect(html).toContain("2026-01234567");
		expect(html).toContain("MY / SSM");
		expect(html).toContain("2026-01-01 to open");
		expect(html).toContain("active");
	});
});
