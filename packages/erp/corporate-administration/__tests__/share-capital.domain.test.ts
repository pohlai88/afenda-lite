import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	createShareClass,
	createShareTransaction,
	listShareHoldingsAsOf,
} from "../src/share-capital";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const DIM_A = "10000000-0000-4000-8000-000000000001";
const PARTY_A = "20000000-0000-4000-8000-000000000001";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [seedOrganizationParty(ORG_A, PARTY_A, "ORG-A")],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration share capital", () => {
	it("creates share class, posts issuance transaction, and sums holdings", async () => {
		const { store, ports, masters, authorization } = harness();
		const company = await createLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-sc-1",
				idempotencyKey: "company-sc-1",
				requestFingerprint: "fp-sc-1",
				code: "CO-SC",
				legalEntityDimensionId: DIM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const shareClass = await createShareClass(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-sc-2",
				idempotencyKey: "class-1",
				legalCompanyId: company.data.id,
				code: "ORD",
				classType: "ordinary",
				currencyCode: "MYR",
				parValue: "1.00",
				authorizedQuantity: "1000000",
			},
			{ store, authorization },
		);
		expect(shareClass.ok).toBe(true);
		if (!shareClass.ok) return;

		const transaction = await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-sc-3",
				idempotencyKey: "txn-1",
				legalCompanyId: company.data.id,
				shareClassId: shareClass.data.id,
				transactionReference: "ISS-001",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY_A, quantityDelta: "1000" }],
			},
			{ store, masters, authorization },
		);
		expect(transaction.ok).toBe(true);
		if (!transaction.ok) return;
		expect(transaction.data.legs).toHaveLength(1);

		const holdings = await listShareHoldingsAsOf(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.data.id,
				asOf: "2024-06-30",
				shareClassId: shareClass.data.id,
			},
			{ store, authorization },
		);
		expect(holdings.ok).toBe(true);
		if (holdings.ok) {
			expect(holdings.data).toHaveLength(1);
			expect(holdings.data[0]?.quantity).toBe("1000");
			expect(holdings.data[0]?.holderPartyId).toBe(PARTY_A);
		}
	});
});
