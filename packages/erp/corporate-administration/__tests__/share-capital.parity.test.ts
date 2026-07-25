import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import {
	createShareClass,
	createShareTransaction,
	listShareHoldingsAsOf,
} from "../src/share-capital";
import {
	type CaParityHarness,
	createCaParityHarness,
	runDrizzleParity,
} from "./helpers/ca-parity-harness";
import { ensureDrizzleCaMasterFixtures } from "./helpers/drizzle-ca-masters";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";

const ORG = "org-ca-share-parity";
const MEMORY_DIM = "10000000-0000-4000-8000-00000000ca03";
const MEMORY_PARTY = "20000000-0000-4000-8000-00000000ca03";

type ParityFixture = {
	dimensionId: string;
	partyId: string;
	ready: CaParityHarness;
};

function suffix(adapter: string) {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createParityFixture(
	adapter: "memory" | "drizzle",
	tag: string,
): Promise<ParityFixture> {
	const dimensionId = adapter === "memory" ? MEMORY_DIM : randomUUID();
	const partyId = adapter === "memory" ? MEMORY_PARTY : randomUUID();
	const dimensionKey = `LE-${tag}`.slice(0, 64);
	const partyCode = `ORG-${tag}`.slice(0, 64);

	if (adapter === "drizzle") {
		await ensureDrizzleCaMasterFixtures({
			organizationId: ORG,
			dimensionId,
			dimensionKey,
			dimensionName: `Legal Entity ${tag}`,
			partyId,
			partyCode,
		});
	}

	const masters = createMemoryCaMasterLookup({
		dimensions: [
			seedLegalEntityDimension(
				dimensionId,
				dimensionKey,
				`Legal Entity ${tag}`,
				{ organizationId: ORG },
			),
		],
		parties: [seedOrganizationParty(ORG, partyId, partyCode)],
	});

	return {
		dimensionId,
		partyId,
		ready: createCaParityHarness(adapter, masters),
	};
}

describe.each([
	"memory",
	"drizzle",
] as const)("@afenda/corporate-administration share capital parity (%s)", (adapter) => {
	it.runIf(adapter === "memory" || runDrizzleParity)(
		"posts issuance and derives holdings as-of",
		async () => {
			const tag = suffix(adapter);
			const fixture = await createParityFixture(adapter, tag);

			const company = await createLegalCompany(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: `corr-co-${tag}`,
					idempotencyKey: `co-${tag}`,
					requestFingerprint: `fp-${tag}`,
					code: `CO-${tag}`,
					legalEntityDimensionId: fixture.dimensionId,
				},
				fixture.ready,
			);
			expect(company.ok).toBe(true);
			if (!company.ok) return;

			const shareClass = await createShareClass(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: `corr-class-${tag}`,
					idempotencyKey: `class-${tag}`,
					legalCompanyId: company.data.id,
					code: "ORD",
					classType: "ordinary",
					currencyCode: "MYR",
					parValue: "1.00",
					authorizedQuantity: "1000000",
				},
				fixture.ready,
			);
			expect(shareClass.ok).toBe(true);
			if (!shareClass.ok) return;

			const txn = await createShareTransaction(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: `corr-txn-${tag}`,
					idempotencyKey: `txn-${tag}`,
					legalCompanyId: company.data.id,
					shareClassId: shareClass.data.id,
					transactionReference: `ISS-${tag}`,
					transactionType: "issuance",
					transactionDate: "2024-06-01",
					legs: [{ holderPartyId: fixture.partyId, quantityDelta: "250" }],
				},
				fixture.ready,
			);
			expect(txn.ok).toBe(true);
			if (!txn.ok) return;

			const holdings = await listShareHoldingsAsOf(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					legalCompanyId: company.data.id,
					asOf: "2024-06-30",
					shareClassId: shareClass.data.id,
				},
				fixture.ready,
			);
			expect(holdings.ok).toBe(true);
			if (holdings.ok) {
				expect(holdings.data).toHaveLength(1);
				expect(holdings.data[0]?.quantity).toBe("250");
			}
		},
	);
});
