import { describe, expect, it } from "vitest";

import {
	activateLegalCompany,
	addCompanyIdentifier,
	addCompanyName,
	archiveLegalCompany,
	createLegalCompany,
	dissolveLegalCompany,
	updateLegalCompany,
} from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	CA_LEGAL_COMPANY_STATUS_VALUES,
	type CaLegalCompanyStatus,
} from "../src/schemas";
import {
	CA_LEGAL_COMPANY_TRANSITIONS,
	canTransitionLegalCompany,
	canUpdateLegalCompanyProfile,
	isTerminalLegalCompanyStatus,
} from "../src/shared/lifecycle";
import {
	activateLegalCompanyTestInput,
	addCompanyIdentifierTestInput,
	addCompanyNameTestInput,
	archiveLegalCompanyTestInput,
	CA_TEST_DIM_A,
	CA_TEST_ORG_A,
	CA_TEST_PARTY_A,
	createLegalCompanyTestInput,
	dissolveLegalCompanyTestInput,
	updateLegalCompanyTestInput,
} from "./helpers/legal-company-test-inputs";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [
			seedLegalEntityDimension(CA_TEST_DIM_A, "LE-A", "Legal Entity A"),
		],
		parties: [seedOrganizationParty(CA_TEST_ORG_A, CA_TEST_PARTY_A, "ORG-A")],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration legal company lifecycle helpers", () => {
	it("matches the full transition matrix", () => {
		for (const from of CA_LEGAL_COMPANY_STATUS_VALUES) {
			for (const to of CA_LEGAL_COMPANY_STATUS_VALUES) {
				const allowed = CA_LEGAL_COMPANY_TRANSITIONS[from].includes(to);
				expect(canTransitionLegalCompany(from, to)).toBe(allowed);
			}
		}
	});

	it("classifies terminal and profile-editable statuses", () => {
		const terminal: CaLegalCompanyStatus[] = ["dissolved", "archived"];
		const profileEditable: CaLegalCompanyStatus[] = [
			"draft",
			"active",
			"suspended",
		];

		for (const status of CA_LEGAL_COMPANY_STATUS_VALUES) {
			expect(isTerminalLegalCompanyStatus(status)).toBe(
				terminal.includes(status),
			);
			expect(canUpdateLegalCompanyProfile(status)).toBe(
				profileEditable.includes(status),
			);
		}
	});

	it("rejects profile updates when status is archived", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-profile-guard", {
				code: "CO-PROFILE-GUARD",
				legalPartyId: CA_TEST_PARTY_A,
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const archived = await archiveLegalCompany(
			archiveLegalCompanyTestInput("archive-profile-guard", created.data),
			{ store, ports, masters, authorization },
		);
		expect(archived.ok).toBe(true);
		if (!archived.ok) return;

		const updated = await updateLegalCompany(
			updateLegalCompanyTestInput("update-profile-guard", archived.data, {
				legalFormCode: "sdn_bhd",
			}),
			{ store, ports, masters, authorization },
		);
		expect(updated.ok).toBe(false);
		if (!updated.ok) {
			expect(updated.details).toMatchObject({
				reason: "corporate-administration.company.invalid_transition",
			});
		}
	});

	it("rejects profile updates after dissolution", async () => {
		const { store, ports, masters, authorization } = harness();
		const created = await createLegalCompany(
			createLegalCompanyTestInput("create-dissolved-guard", {
				code: "CO-DISSOLVED-GUARD",
				legalPartyId: CA_TEST_PARTY_A,
			}),
			{ store, ports, masters, authorization },
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		await addCompanyName(
			addCompanyNameTestInput("name-dissolved-guard", created.data.id, {
				displayName: "Dissolved Guard Sdn Bhd",
			}),
			{ store, ports, authorization },
		);
		await addCompanyIdentifier(
			addCompanyIdentifierTestInput("id-dissolved-guard", created.data.id, {
				identifierValue: "DISSOLVED-1",
			}),
			{ store, ports, authorization },
		);

		const activated = await activateLegalCompany(
			activateLegalCompanyTestInput("activate-dissolved-guard", created.data),
			{ store, ports, masters, authorization },
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;

		const dissolved = await dissolveLegalCompany(
			dissolveLegalCompanyTestInput("dissolve-guard", activated.data),
			{ store, ports, masters, authorization },
		);
		expect(dissolved.ok).toBe(true);
		if (!dissolved.ok) return;

		const updated = await updateLegalCompany(
			updateLegalCompanyTestInput("update-dissolved-guard", dissolved.data, {
				legalFormCode: "sdn_bhd",
			}),
			{ store, ports, masters, authorization },
		);
		expect(updated.ok).toBe(false);
		if (!updated.ok) {
			expect(updated.details).toMatchObject({
				reason: "corporate-administration.company.invalid_transition",
			});
		}
	});
});
