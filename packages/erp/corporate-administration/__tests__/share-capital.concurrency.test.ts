import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createShareClass, createShareTransaction } from "../src/share-capital";
import {
	createCaParityHarness,
	runDrizzleParity,
} from "./helpers/ca-parity-harness";
import { ensureDrizzleCaMasterFixtures } from "./helpers/drizzle-ca-masters";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";

const ORG = "org-ca-share-concurrency";

describe.runIf(runDrizzleParity)(
	"@afenda/corporate-administration share capital concurrency (drizzle)",
	() => {
		it("allows only one winner for concurrent transfer debiting the same holding", async () => {
			const tag = `sc-${Date.now()}`;
			const dimensionId = randomUUID();
			const partyA = randomUUID();
			const partyB = randomUUID();
			await ensureDrizzleCaMasterFixtures({
				organizationId: ORG,
				dimensionId,
				dimensionKey: `LE-${tag}`,
				dimensionName: "Legal Entity SC",
				partyId: partyA,
				partyCode: `ORG-A-${tag}`,
			});
			await ensureDrizzleCaMasterFixtures({
				organizationId: ORG,
				dimensionId: randomUUID(),
				dimensionKey: `LE-B-${tag}`,
				dimensionName: "Party B",
				partyId: partyB,
				partyCode: `ORG-B-${tag}`,
			});
			const masters = createMemoryCaMasterLookup({
				dimensions: [
					seedLegalEntityDimension(
						dimensionId,
						`LE-${tag}`,
						"Legal Entity SC",
						{ organizationId: ORG },
					),
				],
				parties: [
					seedOrganizationParty(ORG, partyA, `ORG-A-${tag}`),
					seedOrganizationParty(ORG, partyB, `ORG-B-${tag}`),
				],
			});
			const ready = createCaParityHarness("drizzle", masters);

			const company = await createLegalCompany(
				createLegalCompanyTestInput(`co-${tag}`, {
					organizationId: ORG,
					actorUserId: "user-sc",
					correlationId: `corr-co-${tag}`,
					idempotencyKey: `co-${tag}`,
					code: `CO-${tag}`,
					legalEntityDimensionId: dimensionId,
				}),
				ready,
			);
			expect(company.ok).toBe(true);
			if (!company.ok) return;

			const shareClass = await createShareClass(
				{
					organizationId: ORG,
					actorUserId: "user-sc",
					correlationId: `corr-class-${tag}`,
					idempotencyKey: `class-${tag}`,
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

			await createShareTransaction(
				{
					organizationId: ORG,
					actorUserId: "user-sc",
					correlationId: `corr-iss-${tag}`,
					idempotencyKey: `iss-${tag}`,
					legalCompanyId: company.data.id,
					shareClassId: shareClass.data.id,
					transactionReference: `ISS-${tag}`,
					transactionType: "issuance",
					transactionDate: "2024-06-01",
					legs: [{ holderPartyId: partyA, quantityDelta: "100" }],
				},
				ready,
			);

			const transferInput = {
				organizationId: ORG,
				actorUserId: "user-sc",
				legalCompanyId: company.data.id,
				shareClassId: shareClass.data.id,
				transactionType: "transfer" as const,
				transactionDate: "2024-06-02",
				legs: [
					{ holderPartyId: partyA, quantityDelta: "-100" },
					{ holderPartyId: partyB, quantityDelta: "100" },
				],
			};

			const [first, second] = await Promise.all([
				createShareTransaction(
					{
						...transferInput,
						correlationId: `corr-xfer-a-${tag}`,
						idempotencyKey: `xfer-a-${tag}`,
						transactionReference: `XFER-A-${tag}`,
					},
					ready,
				),
				createShareTransaction(
					{
						...transferInput,
						correlationId: `corr-xfer-b-${tag}`,
						idempotencyKey: `xfer-b-${tag}`,
						transactionReference: `XFER-B-${tag}`,
					},
					ready,
				),
			]);

			const outcomes = [first.ok, second.ok].filter(Boolean);
			expect(outcomes).toHaveLength(1);
		});
	},
);
