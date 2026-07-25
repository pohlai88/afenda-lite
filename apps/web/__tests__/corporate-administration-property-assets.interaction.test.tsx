import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { action } = vi.hoisted(() => ({
	action: vi.fn(async () => ({
		ok: true as const,
		data: { entity: { id: "record", version: 1 } },
	})),
}));
vi.mock(
	"@/app/actions/corporate-administration-property-assets",
	() => ({
		amendChargeAction: action,
		cancelInsurancePolicyAction: action,
		disposeCorporateAssetAction: action,
		disposeIntellectualPropertyAction: action,
		disposePropertyAction: action,
		expireIntellectualPropertyAction: action,
		registerChargeAction: action,
		registerCorporateAssetAction: action,
		registerInsurancePolicyAction: action,
		registerIntellectualPropertyAction: action,
		registerPropertyAction: action,
		releaseChargeAction: action,
		renewInsurancePolicyAction: action,
		renewIntellectualPropertyAction: action,
		updateCorporateAssetAction: action,
		updateInsurancePolicyAction: action,
		updateIntellectualPropertyAction: action,
		updatePropertyAction: action,
		writeOffCorporateAssetAction: action,
	}),
);

import {
	CorporateAssetRegisterPanel,
	InsuranceChargesRegisterPanel,
	IntellectualPropertyRegisterPanel,
	PropertyRegisterPanel,
} from "../features/corporate-administration/property-assets-panels";

const companyId = "10000000-0000-4000-8000-000000000001";
const rows = [
	{
		id: "20000000-0000-4000-8000-000000000001",
		label: "CA4-01",
		summary: "Controlled register fact",
		status: "active",
		version: 2,
	},
];

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("Corporate Administration CA-4 interaction", () => {
	it("keeps every client register read-only", () => {
		render(
			<>
				<PropertyRegisterPanel
					legalCompanyId={companyId}
					rows={rows}
					canManage={false}
				/>
				<CorporateAssetRegisterPanel
					legalCompanyId={companyId}
					rows={rows}
					canManage={false}
				/>
				<IntellectualPropertyRegisterPanel
					legalCompanyId={companyId}
					rows={rows}
					canManage={false}
				/>
				<InsuranceChargesRegisterPanel
					legalCompanyId={companyId}
					insuranceRows={rows}
					chargeRows={rows}
					canManage={false}
				/>
			</>,
		);
		expect(screen.getByText("Property register")).toBeVisible();
		expect(screen.getByText("Corporate asset register")).toBeVisible();
		expect(screen.getByText("Intellectual property register")).toBeVisible();
		expect(screen.getByText("Insurance register")).toBeVisible();
		expect(screen.getByText("Charges register")).toBeVisible();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("opens an accessible operator dialog and restores focus", async () => {
		const user = userEvent.setup();
		render(
			<PropertyRegisterPanel
				legalCompanyId={companyId}
				rows={rows}
				canManage
			/>,
		);
		const trigger = screen.getByRole("button", { name: "Dispose property" });
		trigger.focus();
		await user.keyboard("{Enter}");
		expect(
			screen.getByRole("dialog", { name: "Dispose property" }),
		).toBeVisible();
		expect(screen.getByLabelText("Reason")).toBeVisible();
		expect(
			screen.getByLabelText(
				"I confirm this statutory lifecycle change and its evidence.",
			),
		).toBeVisible();
		await user.keyboard("{Escape}");
		expect(trigger).toHaveFocus();
	});
});
