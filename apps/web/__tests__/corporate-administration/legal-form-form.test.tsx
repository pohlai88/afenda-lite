import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/legal-company-identity-actions", () => ({
	addCompanyNameFormAction: vi.fn(),
	setCompanyLegalFormFormAction: vi.fn(),
	supersedeCompanyNameFormAction: vi.fn(),
	supersedeCompanyLegalFormFormAction: vi.fn(),
}));

import {
	type LegalCompanyIdentityCompany,
	type LegalCompanyIdentityLegalForm,
	LegalFormForm,
	LegalFormHistory,
} from "../../features/corporate-administration/legal-company-identity-workspace";

const company: LegalCompanyIdentityCompany = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 5,
};

const legalForms: readonly LegalCompanyIdentityLegalForm[] = [
	{
		legalFormHistoryId: "44444444-4444-4444-8444-444444444444",
		jurisdictionCode: "MY",
		entityTypeCode: "private_limited_company",
		legalFormCode: "private_limited_company",
		effectiveFrom: "2026-01-01",
		effectiveTo: "2026-12-31",
		status: "superseded",
		version: 2,
	},
	{
		legalFormHistoryId: "55555555-5555-4555-8555-555555555555",
		jurisdictionCode: "MY",
		entityTypeCode: "public_limited_company",
		legalFormCode: "public_limited_company",
		effectiveFrom: "2027-01-01",
		effectiveTo: null,
		status: "active",
		version: 1,
	},
];

describe("Corporate Administration legal-form form", () => {
	it("renders accessible evidence-backed legal-form controls", () => {
		const html = renderToStaticMarkup(
			createElement(LegalFormForm, {
				action: vi.fn(),
				canWrite: true,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain('aria-label="Set company legal form"');
		expect(html).toContain('name="legalCompanyId"');
		expect(html).toContain('name="expectedCompanyVersion"');
		expect(html).not.toContain('name="organizationId"');
		expect(html).toContain("Jurisdiction");
		expect(html).toContain("Entity type");
		expect(html).toContain("Legal form");
		expect(html).toContain("Source document");
	});

	it("disables legal-form controls for read-only members", () => {
		const html = renderToStaticMarkup(
			createElement(LegalFormForm, {
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

	it("renders deterministic legal-form history", () => {
		const html = renderToStaticMarkup(
			createElement(LegalFormHistory, { legalForms }),
		);

		expect(html).toContain('aria-label="Company legal form history"');
		expect(html).toContain("private_limited_company");
		expect(html).toContain("public_limited_company");
		expect(html).toContain("MY / public_limited_company");
		expect(html).toContain("2027-01-01 to open");
	});
});
