import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/legal-establishment-actions", () => ({
	activateLegalEstablishmentFormAction: vi.fn(),
	closeLegalEstablishmentFormAction: vi.fn(),
	endPremiseFormAction: vi.fn(),
	registerLegalEstablishmentFormAction: vi.fn(),
	registerPremiseFormAction: vi.fn(),
	setRegisteredAddressFormAction: vi.fn(),
	suspendLegalEstablishmentFormAction: vi.fn(),
	updateLegalEstablishmentFormAction: vi.fn(),
}));

import { LegalEstablishmentWorkspace } from "../../features/corporate-administration/legal-establishment-workspace";

const establishment = {
	id: "00000000-0000-4000-8000-000000000142",
	type: "branch",
	jurisdictionCode: "MY",
	registrationIdentifier: "BR-1",
	displayName: "Kuala Lumpur Branch",
	status: "active",
	registeredFrom: "2026-01-01",
	version: 2,
} as const;

describe("Legal establishment workspace", () => {
	it("renders labeled establishment, address and premise workflows", () => {
		const html = renderToStaticMarkup(
			createElement(LegalEstablishmentWorkspace, {
				canWrite: true,
				company: {
					legalCompanyId: "00000000-0000-4000-8000-000000000141",
					version: 3,
				},
				establishments: [establishment],
				registeredAddresses: [
					{
						id: "address-1",
						type: "registered_office",
						scope: establishment.displayName,
						address: "1 Statutory Way, Kuala Lumpur, 50000",
						effectiveFrom: "2026-01-01",
					},
				],
				premises: [
					{
						id: "00000000-0000-4000-8000-000000000144",
						type: "office",
						displayName: "Operations Office",
						address: "2 Operations Way, Kuala Lumpur, 50000",
						status: "active",
						effectiveFrom: "2026-02-01",
						version: 1,
					},
				],
				partyAddresses: [
					{
						id: "00000000-0000-4000-8000-000000000143",
						label: "1 Statutory Way, Kuala Lumpur, 50000",
					},
				],
			}),
		);

		for (const label of [
			"Register establishment",
			"Set statutory address",
			"Register premise",
			"Registration identifier",
			"Master Data address",
			"Suspend date",
			"End premise",
		]) {
			expect(html).toContain(label);
		}
		expect(html).toContain("Statutory establishments, registered addresses");
	});

	it("disables mutations for read-only members and announces empty states", () => {
		const html = renderToStaticMarkup(
			createElement(LegalEstablishmentWorkspace, {
				canWrite: false,
				company: {
					legalCompanyId: "00000000-0000-4000-8000-000000000141",
					version: 1,
				},
				establishments: [],
				registeredAddresses: [],
				premises: [],
				partyAddresses: [],
			}),
		);
		expect(html).toContain("No statutory establishments recorded.");
		expect(html).toContain("No statutory addresses recorded.");
		expect(html).toContain("No physical premises recorded.");
		expect(html).toContain("disabled");
	});
});
