import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/legal-company-lifecycle-actions", () => ({
	activateLegalCompanyFormAction: vi.fn(),
	archiveLegalCompanyFormAction: vi.fn(),
	dissolveLegalCompanyFormAction: vi.fn(),
	enterLiquidationFormAction: vi.fn(),
	markCompanyStruckOffFormAction: vi.fn(),
	restoreLegalCompanyFormAction: vi.fn(),
	suspendLegalCompanyFormAction: vi.fn(),
}));

import {
	availableLifecycleTransitions,
	type LegalCompanyActivationCompleteness,
	type LegalCompanyLifecycleCompany,
	LegalCompanyLifecycleWorkspace,
} from "../../features/corporate-administration/legal-company-lifecycle-workspace";

const draftCompany: LegalCompanyLifecycleCompany = {
	legalCompanyId: "33333333-3333-4333-8333-333333333333",
	companyCode: "AF-MY",
	displayName: "Afenda Malaysia",
	state: "draft",
	version: 4,
};

const completeReadiness: LegalCompanyActivationCompleteness = {
	complete: true,
	missing: [],
	checks: [
		{
			key: "hasJurisdictionProfile",
			label: "Jurisdiction profile",
			complete: true,
		},
		{ key: "hasLegalName", label: "English legal name", complete: true },
		{ key: "hasLegalForm", label: "Legal form", complete: true },
		{
			key: "hasCompanyIdentifier",
			label: "Company registration identifier",
			complete: true,
		},
		{ key: "hasFinancialYear", label: "Financial year", complete: true },
		{
			key: "hasRegisteredActivity",
			label: "Registered activity",
			complete: true,
		},
		{ key: "hasRegisteredAddress", label: "Registered office", complete: true },
	],
};

describe("Legal company lifecycle workspace", () => {
	it("renders activation completeness and status-relevant controls", () => {
		const html = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: draftCompany,
				completeness: completeReadiness,
				organizationSlug: "afenda",
			}),
		);

		expect(html).toContain("Company status lifecycle");
		expect(html).toContain("Activation readiness");
		expect(html).toContain("Activation ready");
		expect(html).toContain("Jurisdiction profile");
		expect(html).toContain("English legal name");
		expect(html).toContain('aria-label="Activate"');
		expect(html).toContain('aria-label="Archive"');
		expect(html).not.toContain('name="organizationId"');
	});

	it("disables activation when readiness is incomplete", () => {
		const html = renderToStaticMarkup(
			createElement(LegalCompanyLifecycleWorkspace, {
				canWrite: true,
				company: draftCompany,
				completeness: {
					...completeReadiness,
					complete: false,
					missing: ["hasRegisteredAddress"],
					checks: completeReadiness.checks.map((check) =>
						check.key === "hasRegisteredAddress"
							? { ...check, complete: false }
							: check,
					),
				},
				organizationSlug: "afenda",
			}),
		);

		expect(html).toContain("Activation incomplete");
		expect(html).toContain("Missing");
		expect(html).toContain("disabled");
	});

	it("exposes lifecycle transitions according to the package matrix", () => {
		expect(availableLifecycleTransitions("active")).toEqual([
			"suspend",
			"strike_off",
			"liquidate",
			"dissolve",
			"archive",
		]);
		expect(availableLifecycleTransitions("archived")).toEqual([]);
	});
});
