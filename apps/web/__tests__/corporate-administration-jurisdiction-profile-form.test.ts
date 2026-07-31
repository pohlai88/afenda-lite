import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { ActionFeedback } from "../features/corporate-administration/legal-company-workspace";

describe("Corporate Administration jurisdiction profile form feedback", () => {
	it("renders accessible stale-version feedback", () => {
		const html = renderToStaticMarkup(
			createElement(ActionFeedback, {
				success: "Saved.",
				state: {
					ok: false,
					code: "CONFLICT",
					message: "Corporate Administration legal company version is stale.",
					messageKey: "errors.conflict",
				},
			}),
		);

		expect(html).toContain('role="alert"');
		expect(html).toContain(
			"Corporate Administration legal company version is stale.",
		);
	});

	it("renders accessible overlap feedback", () => {
		const html = renderToStaticMarkup(
			createElement(ActionFeedback, {
				success: "Saved.",
				state: {
					ok: false,
					code: "CONFLICT",
					message:
						"Corporate Administration jurisdiction profile overlaps an existing profile.",
					messageKey: "errors.conflict",
				},
			}),
		);

		expect(html).toContain('role="alert"');
		expect(html).toContain("overlaps an existing profile");
	});

	it("renders accessible success status", () => {
		const html = renderToStaticMarkup(
			createElement(ActionFeedback, {
				success: "Jurisdiction profile recorded.",
				state: { ok: true, data: { jurisdictionProfileId: "profile-1" } },
			}),
		);

		expect(html).toContain('role="status"');
		expect(html).toContain("Jurisdiction profile recorded.");
	});
});
