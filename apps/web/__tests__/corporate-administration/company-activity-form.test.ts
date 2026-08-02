import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@afenda/auth", () => ({
	authServer: { session: { get: vi.fn(), requireRole: vi.fn() } },
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-ca-activity-form-test" } },
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
	ActivityForm,
	ActivityHistory,
	type LegalCompanyIdentityActivity,
	type LegalCompanyIdentityCompany,
} from "../../features/corporate-administration/legal-company-identity-workspace";

const company: LegalCompanyIdentityCompany = {
	legalCompanyId: "22222222-2222-4222-8222-222222222222",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	version: 4,
};

const activities: readonly LegalCompanyIdentityActivity[] = [
	{
		companyActivityId: "99999999-9999-4999-8999-999999999999",
		activityCode: "software_services",
		classification: "regulated",
		jurisdictionCode: "MY",
		regulatorCode: "MCMC",
		description: "Regulated software services",
		effectiveFrom: "2026-01-01",
		effectiveTo: null,
		status: "active",
		version: 2,
	},
];

describe("Corporate Administration company activity form", () => {
	it("renders accessible activity controls without organization ID input", () => {
		const html = renderToStaticMarkup(
			createElement(ActivityForm, {
				action: vi.fn(),
				canWrite: true,
				company,
				organizationSlug: "afenda",
				state: null,
			}),
		);

		expect(html).toContain('aria-label="Register company activity"');
		expect(html).toContain('name="legalCompanyId"');
		expect(html).toContain('name="expectedCompanyVersion"');
		expect(html).not.toContain('name="organizationId"');
		expect(html).toContain("Activity type");
		expect(html).toContain("Activity code");
		expect(html).toContain("Regulator");
		expect(html).toContain("Source document");
	});

	it("disables activity controls for read-only members", () => {
		const html = renderToStaticMarkup(
			createElement(ActivityForm, {
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

	it("renders classified activity history with non-color status text", () => {
		const html = renderToStaticMarkup(
			createElement(ActivityHistory, { activities }),
		);

		expect(html).toContain('aria-label="Company activity history"');
		expect(html).toContain("software_services");
		expect(html).toContain("regulated");
		expect(html).toContain("MY / MCMC");
		expect(html).toContain("2026-01-01 to open");
		expect(html).toContain("active");
	});
});
