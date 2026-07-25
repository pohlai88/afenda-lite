import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import {
	createBankAccountRegistration,
	listBankAccountRegistrations,
} from "../src/licences-banking";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const DIM_A = "10000000-0000-4000-8000-000000000001";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration licences banking", () => {
	it("masks bank account identity in list responses", async () => {
		const { store, ports, masters, authorization } = harness();
		const company = await createLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-lb-1",
				idempotencyKey: "company-lb-1",
				requestFingerprint: "fp-lb-1",
				code: "CO-LB",
				legalEntityDimensionId: DIM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const account = await createBankAccountRegistration(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-lb-2",
				idempotencyKey: "bank-1",
				legalCompanyId: company.data.id,
				accountIdentity: "12345678901234",
				countryCode: "MY",
				currencyCode: "MYR",
				accountPurpose: "operating",
				openedDate: "2024-01-01",
			},
			{ store, authorization },
		);
		expect(account.ok).toBe(true);
		if (account.ok) {
			expect(account.data.displayMaskedAccount).toBe("****1234");
			expect("accountIdentityToken" in account.data).toBe(false);
		}

		const listed = await listBankAccountRegistrations(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(listed.ok).toBe(true);
		if (listed.ok) {
			expect(listed.data).toHaveLength(1);
			expect(listed.data[0]?.displayMaskedAccount).toBe("****1234");
			expect("accountIdentityToken" in (listed.data[0] ?? {})).toBe(false);
		}
	});
});
