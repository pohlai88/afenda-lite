import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	createShareClass,
	createShareTransaction,
	listShareHoldingsAsOf,
} from "../src/share-capital";
import {
	closeShareClass,
	reverseShareTransaction,
} from "../src/share-capital-lifecycle";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
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
const PARTY_B = "20000000-0000-4000-8000-000000000002";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [
			seedOrganizationParty(ORG_A, PARTY_A, "ORG-A"),
			seedOrganizationParty(ORG_A, PARTY_B, "ORG-B"),
		],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

async function seedCompany(ready: ReturnType<typeof harness>, tag: string) {
	const company = await createLegalCompany(
		createLegalCompanyTestInput(`company-${tag}`, {
			code: `CO-${tag}`,
			correlationId: `corr-${tag}`,
			idempotencyKey: `company-${tag}`,
		}),
		ready,
	);
	expect(company.ok).toBe(true);
	if (!company.ok) throw new Error("company seed failed");
	return company.data;
}

async function seedShareClass(
	ready: ReturnType<typeof harness>,
	legalCompanyId: string,
	tag: string,
) {
	const shareClass = await createShareClass(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: `corr-class-${tag}`,
			idempotencyKey: `class-${tag}`,
			legalCompanyId,
			code: "ORD",
			classType: "ordinary",
			currencyCode: "MYR",
			parValue: "1.00",
			authorizedQuantity: "1000000",
		},
		ready,
	);
	expect(shareClass.ok).toBe(true);
	if (!shareClass.ok) throw new Error("class seed failed");
	return shareClass.data;
}

describe("@afenda/corporate-administration share capital", () => {
	it("creates share class, posts issuance transaction, and sums holdings", async () => {
		const ready = harness();
		const company = await seedCompany(ready, "sc-1");
		const shareClass = await seedShareClass(ready, company.id, "sc-1");

		const transaction = await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-sc-3",
				idempotencyKey: "txn-1",
				legalCompanyId: company.id,
				shareClassId: shareClass.id,
				transactionReference: "ISS-001",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY_A, quantityDelta: "1000" }],
			},
			ready,
		);
		expect(transaction.ok).toBe(true);
		if (!transaction.ok) return;
		expect(transaction.data.legs).toHaveLength(1);

		const holdings = await listShareHoldingsAsOf(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				asOf: "2024-06-30",
				shareClassId: shareClass.id,
			},
			ready,
		);
		expect(holdings.ok).toBe(true);
		if (holdings.ok) {
			expect(holdings.data).toHaveLength(1);
			expect(holdings.data[0]?.quantity).toBe("1000");
			expect(holdings.data[0]?.holderPartyId).toBe(PARTY_A);
		}
	});

	it("rejects transfer that would create negative holding", async () => {
		const ready = harness();
		const company = await seedCompany(ready, "neg-1");
		const shareClass = await seedShareClass(ready, company.id, "neg-1");
		await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-neg-iss",
				idempotencyKey: "txn-neg-iss",
				legalCompanyId: company.id,
				shareClassId: shareClass.id,
				transactionReference: "ISS-NEG",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY_A, quantityDelta: "100" }],
			},
			ready,
		);
		const transfer = await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-neg-xfer",
				idempotencyKey: "txn-neg-xfer",
				legalCompanyId: company.id,
				shareClassId: shareClass.id,
				transactionReference: "XFER-NEG",
				transactionType: "transfer",
				transactionDate: "2024-06-02",
				legs: [
					{ holderPartyId: PARTY_A, quantityDelta: "-200" },
					{ holderPartyId: PARTY_B, quantityDelta: "200" },
				],
			},
			ready,
		);
		expect(transfer.ok).toBe(false);
	});

	it("reverses posted transaction and restores holdings", async () => {
		const ready = harness();
		const company = await seedCompany(ready, "rev-1");
		const shareClass = await seedShareClass(ready, company.id, "rev-1");
		const posted = await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rev-post",
				idempotencyKey: "txn-rev-post",
				legalCompanyId: company.id,
				shareClassId: shareClass.id,
				transactionReference: "ISS-REV",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY_A, quantityDelta: "500" }],
			},
			ready,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) return;

		const reversed = await reverseShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-rev",
				idempotencyKey: "txn-rev",
				legalCompanyId: company.id,
				shareTransactionId: posted.data.id,
				reversalReference: "REV-001",
				reversalDate: "2024-06-15",
			},
			ready,
		);
		expect(reversed.ok).toBe(true);

		const holdings = await listShareHoldingsAsOf(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
				asOf: "2024-06-30",
				shareClassId: shareClass.id,
			},
			ready,
		);
		expect(holdings.ok).toBe(true);
		if (holdings.ok) {
			expect(holdings.data).toHaveLength(0);
		}
	});

	it("rejects new transactions after share class is closed", async () => {
		const ready = harness();
		const company = await seedCompany(ready, "close-1");
		const shareClass = await seedShareClass(ready, company.id, "close-1");
		const closed = await closeShareClass(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-close",
				idempotencyKey: "close-1",
				legalCompanyId: company.id,
				id: shareClass.id,
				expectedVersion: shareClass.version,
				reason: "Retire class",
			},
			ready,
		);
		expect(closed.ok).toBe(true);
		const blocked = await createShareTransaction(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-close-txn",
				idempotencyKey: "txn-close",
				legalCompanyId: company.id,
				shareClassId: shareClass.id,
				transactionReference: "ISS-CLOSE",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY_A, quantityDelta: "10" }],
			},
			ready,
		);
		expect(blocked.ok).toBe(false);
	});
});
