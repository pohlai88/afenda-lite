import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/legal-company-identity-actions", () => ({
	addCompanyNameFormAction: vi.fn(),
	endCompanyActivityFormAction: vi.fn(),
	registerCompanyActivityFormAction: vi.fn(),
	registerCompanyIdentifierFormAction: vi.fn(),
	setCompanyFinancialYearFormAction: vi.fn(),
	setCompanyLegalFormFormAction: vi.fn(),
	supersedeCompanyIdentifierFormAction: vi.fn(),
	supersedeCompanyNameFormAction: vi.fn(),
	supersedeCompanyLegalFormFormAction: vi.fn(),
}));

vi.mock("@/app/actions/register-legal-company-draft", () => ({
	registerLegalCompanyDraftFormAction: vi.fn(),
}));

vi.mock("@/app/actions/set-company-jurisdiction-profile", () => ({
	setCompanyJurisdictionProfileFormAction: vi.fn(),
}));

vi.mock("@/app/actions/supersede-company-jurisdiction-profile", () => ({
	supersedeCompanyJurisdictionProfileFormAction: vi.fn(),
}));

vi.mock("@/app/actions/update-legal-company-profile", () => ({
	updateLegalCompanyProfileFormAction: vi.fn(),
}));

import {
	CompanyNameForm,
	CompanyNameHistory,
	type LegalCompanyIdentityCompany,
	type LegalCompanyIdentityName,
} from "../../features/corporate-administration/legal-company-identity-workspace";

const company: LegalCompanyIdentityCompany = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 4,
};

const names: readonly LegalCompanyIdentityName[] = [
	{
		companyNameId: "33333333-3333-4333-8333-333333333333",
		nameType: "legal",
		languageCode: "en",
		displayName: "Afenda Malaysia Sdn Bhd",
		effectiveFrom: "2026-01-01",
		effectiveTo: "2026-12-31",
		status: "superseded",
		version: 2,
	},
	{
		companyNameId: "44444444-4444-4444-8444-444444444444",
		nameType: "translated",
		languageCode: "zh",
		displayName: "阿芬达马来西亚",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		status: "active",
		version: 1,
	},
];

describe("Corporate Administration company-name form", () => {
	it("renders accessible controls without accepting organization ID input", () => {
		const html = renderToStaticMarkup(
			createElement(CompanyNameForm, {
				action: vi.fn(),
				canWrite: true,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain('aria-label="Add company name"');
		expect(html).toContain('name="organizationSlug"');
		expect(html).toContain('name="legalCompanyId"');
		expect(html).toContain('name="expectedCompanyVersion"');
		expect(html).not.toContain('name="organizationId"');
		expect(html).toContain("Display name");
		expect(html).toContain("Language");
		expect(html).toContain("Source document");
	});

	it("disables fields when the member cannot manage company identity", () => {
		const html = renderToStaticMarkup(
			createElement(CompanyNameForm, {
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

	it("renders multilingual and former-name history", () => {
		const html = renderToStaticMarkup(
			createElement(CompanyNameHistory, { names }),
		);

		expect(html).toContain('aria-label="Company name history"');
		expect(html).toContain("Afenda Malaysia Sdn Bhd");
		expect(html).toContain("阿芬达马来西亚");
		expect(html).toContain("translated / zh");
		expect(html).toContain("2026-01-01 to open");
	});
});
