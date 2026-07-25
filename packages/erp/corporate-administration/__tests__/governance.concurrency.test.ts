/**
 * Drizzle/Neon concurrency for CA-2 governance and premises.
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createGovernanceBody } from "../src/governance";
import { createLegalCompany } from "../src/legal-company";
import {
	createCaParityHarness,
	runDrizzleParity,
} from "./helpers/ca-parity-harness";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
import { ensureDrizzleCaMasterFixtures } from "./helpers/drizzle-ca-masters";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";

const ORG = "org-ca-gov-concurrency";

describe.runIf(runDrizzleParity)(
	"@afenda/corporate-administration governance concurrency (drizzle)",
	() => {
		it("allows only one winner for concurrent governance body create with same code", async () => {
			const tag = `gb-${Date.now()}`;
			const dimensionId = randomUUID();
			const partyId = randomUUID();
			await ensureDrizzleCaMasterFixtures({
				organizationId: ORG,
				dimensionId,
				dimensionKey: `LE-${tag}`,
				dimensionName: "Legal Entity CC",
				partyId,
				partyCode: `ORG-${tag}`,
			});
			const masters = createMemoryCaMasterLookup({
				dimensions: [
					seedLegalEntityDimension(
						dimensionId,
						`LE-${tag}`,
						"Legal Entity CC",
						{ organizationId: ORG },
					),
				],
				parties: [seedOrganizationParty(ORG, partyId, `ORG-${tag}`)],
			});
			const ready = createCaParityHarness("drizzle", masters);
			const company = await createLegalCompany(
				createLegalCompanyTestInput(`create-cc-${tag}`, {
					organizationId: ORG,
					actorUserId: "user-cc",
					correlationId: `corr-cc-${tag}`,
					code: `CO-${tag}`,
					legalEntityDimensionId: dimensionId,
					legalPartyId: partyId,
				}),
				ready,
			);
			expect(company.ok).toBe(true);
			if (!company.ok) return;

			const bodyInput = {
				organizationId: ORG,
				actorUserId: "user-cc",
				correlationId: `corr-body-${tag}`,
				idempotencyKey: `body-${tag}`,
				legalCompanyId: company.data.id,
				code: "BOARD",
				bodyType: "board" as const,
				displayName: "Board",
			};
			const [first, second] = await Promise.all([
				createGovernanceBody(bodyInput, ready),
				createGovernanceBody(
					{
						...bodyInput,
						correlationId: `corr-body-b-${tag}`,
						idempotencyKey: `body-b-${tag}`,
					},
					ready,
				),
			]);
			const outcomes = [first.ok, second.ok].filter(Boolean);
			expect(outcomes).toHaveLength(1);
		});
	},
);
