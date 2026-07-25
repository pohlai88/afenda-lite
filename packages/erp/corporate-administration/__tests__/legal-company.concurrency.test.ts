/**
 * Drizzle/Neon concurrency for CA-1 legal-company registry.
 */

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import {
	createCaParityHarness,
	runDrizzleParity,
} from "./helpers/ca-parity-harness";
import { ensureDrizzleCaMasterFixtures } from "./helpers/drizzle-ca-masters";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
} from "./helpers/memory-masters";

const ORG = "org-ca-concurrency";

describe.runIf(runDrizzleParity)(
	"@afenda/corporate-administration legal company concurrency (drizzle)",
	() => {
		it("allows only one winner for concurrent create with same normalized code", async () => {
			const tag = `cc-${Date.now()}`;
			const dimensionId = randomUUID();
			await ensureDrizzleCaMasterFixtures({
				organizationId: ORG,
				dimensionId,
				dimensionKey: `LE-${tag}`,
				dimensionName: "Legal Entity CC",
			});
			const masters = createMemoryCaMasterLookup({
				dimensions: [
					seedLegalEntityDimension(
						dimensionId,
						`LE-${tag}`,
						"Legal Entity CC",
						{
							organizationId: ORG,
						},
					),
				],
				parties: [],
			});
			const ready = createCaParityHarness("drizzle", masters);
			const input = {
				organizationId: ORG,
				actorUserId: "user-cc",
				correlationId: `corr-cc-${tag}`,
				idempotencyKey: `create-cc-${tag}`,
				requestFingerprint: `fp-cc-${tag}`,
				code: `CO-${tag}`,
				legalEntityDimensionId: dimensionId,
			};
			const [first, second] = await Promise.all([
				createLegalCompany(input, ready),
				createLegalCompany(
					{
						...input,
						correlationId: `corr-cc-b-${tag}`,
						idempotencyKey: `create-cc-b-${tag}`,
					},
					ready,
				),
			]);
			const outcomes = [first.ok, second.ok].filter(Boolean);
			expect(outcomes).toHaveLength(1);
		});
	},
);
