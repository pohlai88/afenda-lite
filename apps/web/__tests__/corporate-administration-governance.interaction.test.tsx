import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => {
	const action = vi.fn();
	return {
		action,
		appointOfficerAction: action,
		amendOfficerAction: action,
		endOfficerAction: action,
		createGovernanceBodyAction: action,
		updateGovernanceBodyAction: action,
		retireGovernanceBodyAction: action,
		appointGovernanceMembershipAction: action,
		endGovernanceMembershipAction: action,
		grantAuthorityMandateAction: action,
		amendAuthorityMandateAction: action,
		revokeAuthorityMandateAction: action,
		registerCompanyPremiseAction: action,
		updateCompanyPremiseAction: action,
		retireCompanyPremiseAction: action,
		recordGovernanceMeetingAction: action,
		closeGovernanceMeetingAction: action,
		recordResolutionAction: action,
		approveResolutionAction: action,
		revokeResolutionAction: action,
	};
});

vi.mock("@/app/actions/corporate-administration-governance", () => actionMocks);

import { CompanyTabs } from "@/features/corporate-administration/company-tabs";
import {
	type GovernancePremisesSnapshot,
	GovernanceRegisterPanel,
	PremisesRegisterPanel,
} from "@/features/corporate-administration/governance-premises-panels";

const companyId = "10000000-0000-4000-8000-000000000001";
const partyId = "20000000-0000-4000-8000-000000000001";

const EMPTY_SNAPSHOT: GovernancePremisesSnapshot = {
	officers: [],
	bodies: [],
	memberships: [],
	mandates: [],
	premises: [],
	meetings: [],
	resolutions: [],
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Corporate Administration CA-2 interaction", () => {
	it("renders shipped Governance and Premises tabs with keyboard access", async () => {
		const user = userEvent.setup();
		render(
			<CompanyTabs
				overview={<p>Overview content</p>}
				registration={<p>Registration content</p>}
				governance={<p>Governance content</p>}
				premises={<p>Premises content</p>}
				capital={<p>Capital content</p>}
				property={<p>Property content</p>}
				corporateAssets={<p>Corporate assets content</p>}
				intellectualProperty={<p>Intellectual property content</p>}
				insuranceCharges={<p>Insurance and charges content</p>}
			/>,
		);

		const governanceTab = screen.getByRole("tab", { name: "Governance" });
		governanceTab.focus();
		await user.keyboard("{Enter}");
		expect(screen.getByText("Governance content")).toBeVisible();

		await user.click(screen.getByRole("tab", { name: "Premises" }));
		expect(screen.getByText("Premises content")).toBeVisible();
	}, 15_000);

	it("keeps the client governance surface read-only", () => {
		render(
			<GovernanceRegisterPanel
				legalCompanyId={companyId}
				snapshot={EMPTY_SNAPSHOT}
				canManage={false}
			/>,
		);

		expect(screen.getByText("Governance register")).toBeVisible();
		expect(screen.getByText("Officer appointments")).toBeVisible();
		expect(screen.queryByText("Governance controls")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Appoint officer" }),
		).not.toBeInTheDocument();
	});

	it("opens and submits the accessible officer appointment control", async () => {
		const user = userEvent.setup();
		actionMocks.action.mockResolvedValue({
			ok: true,
			data: { entity: { id: partyId, version: 1 } },
		});
		render(
			<GovernanceRegisterPanel
				legalCompanyId={companyId}
				snapshot={EMPTY_SNAPSHOT}
				canManage
				defaultPartyId={partyId}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Appoint officer" }));
		expect(screen.getByLabelText("Officer role")).toBeVisible();
		expect(screen.getByLabelText("Party ID")).toHaveValue(partyId);
		await user.type(screen.getByLabelText("Appointment date"), "2026-07-25");
		const submitButtons = screen.getAllByRole("button", {
			name: "Appoint officer",
		});
		const submit = submitButtons.at(-1);
		expect(submit).toBeDefined();
		if (!submit) return;
		await user.click(submit);

		await waitFor(() => expect(actionMocks.action).toHaveBeenCalled());
		const formData = actionMocks.action.mock.calls[0]?.[1] as FormData;
		expect(formData.get("legalCompanyId")).toBe(companyId);
		expect(formData.get("partyId")).toBe(partyId);
		expect(formData.get("officerRole")).toBe("director");
	}, 15_000);

	it("requires explicit confirmation for a high-risk lifecycle command", async () => {
		const user = userEvent.setup();
		const snapshot: GovernancePremisesSnapshot = {
			...EMPTY_SNAPSHOT,
			officers: [
				{
					id: partyId,
					label: "director",
					summary: "Ada Director",
					status: "active",
					version: 2,
				},
			],
		};
		render(
			<GovernanceRegisterPanel
				legalCompanyId={companyId}
				snapshot={snapshot}
				canManage
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "End officer appointment" }),
		);
		const submit = screen
			.getAllByRole("button", { name: "End officer appointment" })
			.at(-1);
		expect(submit).toBeDefined();
		if (!submit) return;
		expect(submit).toBeDisabled();
		await user.click(
			screen.getByLabelText(
				/I reviewed the effective date, reason, and evidence/i,
			),
		);
		expect(submit).toBeEnabled();
	}, 15_000);

	it("exposes a labeled premises register control only to operators", async () => {
		const user = userEvent.setup();
		render(
			<PremisesRegisterPanel
				legalCompanyId={companyId}
				snapshot={EMPTY_SNAPSHOT}
				canManage
			/>,
		);

		expect(
			screen.getByText("Effective and historical company premises"),
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Register premise" }));
		expect(screen.getByLabelText("Address source")).toBeVisible();
		expect(screen.getByLabelText("Country code")).toBeVisible();
		expect(screen.getByLabelText("Primary office")).toBeVisible();
	});
});
