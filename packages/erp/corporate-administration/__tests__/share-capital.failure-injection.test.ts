import { fail } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	createShareClass,
	createShareTransaction,
	listShareTransactions,
} from "../src/share-capital";
import { reverseShareTransaction } from "../src/share-capital-lifecycle";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-ca-share-fi";
const DIM = "10000000-0000-4000-8000-00000000ca04";
const PARTY = "20000000-0000-4000-8000-00000000ca04";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [
			seedLegalEntityDimension(DIM, "LE-FI", "Legal Entity FI", {
				organizationId: ORG,
			}),
		],
		parties: [seedOrganizationParty(ORG, PARTY, "ORG-FI")],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration share capital failure injection (memory)", () => {
	it("does not persist a posted transaction when outbox append fails", async () => {
		const ready = harness();
		const company = await createLegalCompany(
			createLegalCompanyTestInput("company-fi", {
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-co-fi",
				code: "CO-FI",
				legalEntityDimensionId: DIM,
			}),
			ready,
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const shareClass = await createShareClass(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-class-fi",
				idempotencyKey: "class-fi",
				legalCompanyId: company.data.id,
				code: "ORD",
				classType: "ordinary",
				currencyCode: "MYR",
				parValue: "1.00",
				authorizedQuantity: "1000000",
			},
			ready,
		);
		expect(shareClass.ok).toBe(true);
		if (!shareClass.ok) return;

		const failingPorts = {
			...ready.ports,
			outbox: {
				async append() {
					return fail("INTERNAL_ERROR", "Injected outbox failure");
				},
			},
		};

		const blocked = await createShareTransaction(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-txn-fi",
				idempotencyKey: "txn-fi",
				legalCompanyId: company.data.id,
				shareClassId: shareClass.data.id,
				transactionReference: "ISS-FI",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY, quantityDelta: "100" }],
			},
			{ ...ready, ports: failingPorts },
		);
		expect(blocked.ok).toBe(false);

		const transactions = await listShareTransactions(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				legalCompanyId: company.data.id,
			},
			ready,
		);
		expect(transactions.ok).toBe(true);
		if (transactions.ok) {
			expect(transactions.data).toHaveLength(0);
		}
	});

	it("does not reverse a posted transaction when outbox append fails", async () => {
		const ready = harness();
		const company = await createLegalCompany(
			createLegalCompanyTestInput("co-fi-rev", {
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-co-fi-rev",
				idempotencyKey: "company-fi-rev",
				code: "CO-FI-REV",
				legalEntityDimensionId: DIM,
			}),
			ready,
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const shareClass = await createShareClass(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-class-fi-rev",
				idempotencyKey: "class-fi-rev",
				legalCompanyId: company.data.id,
				code: "ORD",
				classType: "ordinary",
				currencyCode: "MYR",
				parValue: "1.00",
				authorizedQuantity: "1000000",
			},
			ready,
		);
		expect(shareClass.ok).toBe(true);
		if (!shareClass.ok) return;

		const posted = await createShareTransaction(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-post-fi",
				idempotencyKey: "txn-post-fi",
				legalCompanyId: company.data.id,
				shareClassId: shareClass.data.id,
				transactionReference: "ISS-POST-FI",
				transactionType: "issuance",
				transactionDate: "2024-06-01",
				legs: [{ holderPartyId: PARTY, quantityDelta: "50" }],
			},
			ready,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) return;

		const failingPorts = {
			...ready.ports,
			outbox: {
				async append() {
					return fail("INTERNAL_ERROR", "Injected outbox failure");
				},
			},
		};

		const blocked = await reverseShareTransaction(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				correlationId: "corr-rev-fi",
				idempotencyKey: "txn-rev-fi",
				legalCompanyId: company.data.id,
				shareTransactionId: posted.data.id,
				reversalReference: "REV-FI",
				reversalDate: "2024-06-15",
			},
			{ ...ready, ports: failingPorts },
		);
		expect(blocked.ok).toBe(false);

		const original = await listShareTransactions(
			{
				organizationId: ORG,
				actorUserId: "user-fi",
				legalCompanyId: company.data.id,
			},
			ready,
		);
		expect(original.ok).toBe(true);
		if (original.ok) {
			expect(original.data).toHaveLength(1);
			expect(original.data[0]?.status).toBe("posted");
		}
	});
});
