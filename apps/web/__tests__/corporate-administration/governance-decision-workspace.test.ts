import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/corporate-administration-governance-actions", () => ({
	adoptResolutionFormAction: vi.fn(),
	assignResolutionActionFormAction: vi.fn(),
	completeResolutionActionFormAction: vi.fn(),
	recordMeetingVoteFormAction: vi.fn(),
	recordMinutesDocumentFormAction: vi.fn(),
}));

import { GovernanceDecisionWorkspace } from "../../features/corporate-administration/governance-decision-workspace";

const meetings = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		title: "August board meeting",
		status: "closed",
		scheduledStartAt: "2026-08-01T09:00:00.000Z",
		version: 4,
	},
];

const resolutions = [
	{
		id: "33333333-3333-4333-8333-333333333333",
		code: "RES-001",
		title: "Approve the annual plan",
		status: "adopted",
		effectiveFrom: "2026-08-01",
		version: 2,
		minutesDocumentId: null,
	},
];

describe("Corporate Administration governance decision workspace", () => {
	it("renders labelled real workflow forms without a browser tenant field", () => {
		const html = renderToStaticMarkup(
			createElement(GovernanceDecisionWorkspace, {
				canManage: true,
				meetings,
				organizationSlug: "afenda",
				overdueActions: [],
				resolutions,
			}),
		);

		expect(html).toContain("Governance decisions");
		expect(html).toContain('aria-label="Governance meetings"');
		expect(html).toContain('aria-label="Record meeting vote"');
		expect(html).toContain('aria-label="Adopt resolution"');
		expect(html).toContain('aria-label="Assign resolution action"');
		expect(html).toContain('aria-label="Record resolution minutes"');
		expect(html).toContain('aria-label="Complete resolution action"');
		expect(html).toContain("August board meeting");
		expect(html).toContain("Approve the annual plan");
		expect(html).not.toContain('name="organizationId"');
	});

	it("exposes a read-only state and disables every mutation fieldset", () => {
		const html = renderToStaticMarkup(
			createElement(GovernanceDecisionWorkspace, {
				canManage: false,
				meetings,
				organizationSlug: "afenda",
				overdueActions: [],
				resolutions,
			}),
		);

		expect(html).toContain("Read only");
		expect(html.match(/<fieldset[^>]*disabled/g)).toHaveLength(5);
	});
});
