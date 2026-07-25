import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import {
	disposeProperty,
	listPropertiesAsOf,
	registerProperty,
	updateProperty,
} from "../src/property-assets";
import {
	type CaParityHarness,
	createCaParityHarness,
	runDrizzleParity,
} from "./helpers/ca-parity-harness";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
import { ensureDrizzleCaMasterFixtures } from "./helpers/drizzle-ca-masters";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
} from "./helpers/memory-masters";

const ORG = "org-ca4-parity";
const MEMORY_DIM = "10000000-0000-4000-8000-00000000ca04";

async function fixture(adapter: "memory" | "drizzle"): Promise<{
	ready: CaParityHarness;
	dimensionId: string;
}> {
	const tag = `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	const dimensionId = adapter === "memory" ? MEMORY_DIM : randomUUID();
	if (adapter === "drizzle") {
		await ensureDrizzleCaMasterFixtures({
			organizationId: ORG,
			dimensionId,
			dimensionKey: `LE-${tag}`,
			dimensionName: `Legal Entity ${tag}`,
			partyId: randomUUID(),
			partyCode: `PARTY-${tag}`,
		});
	}
	const masters = createMemoryCaMasterLookup({
		dimensions: [
			seedLegalEntityDimension(
				dimensionId,
				`LE-${tag}`,
				`Legal Entity ${tag}`,
				{ organizationId: ORG },
			),
		],
		parties: [],
	});
	return { ready: createCaParityHarness(adapter, masters), dimensionId };
}

describe.each([
	"memory",
	"drizzle",
] as const)("@afenda/corporate-administration CA-4 parity (%s)", (adapter) => {
	it.runIf(adapter === "memory" || runDrizzleParity)(
		"matches property lifecycle, replay, CAS, and as-of semantics",
		async () => {
			const { ready, dimensionId } = await fixture(adapter);
			const tag = `${adapter}-${Date.now()}`;
			const company = await createLegalCompany(
				createLegalCompanyTestInput(`company-${tag}`, {
					organizationId: ORG,
					actorUserId: "user-ca4-parity",
					correlationId: `corr-company-${tag}`,
					code: `CO-${tag}`,
					legalEntityDimensionId: dimensionId,
				}),
				ready,
			);
			expect(company.ok).toBe(true);
			if (!company.ok) return;
			const registration = {
				organizationId: ORG,
				actorUserId: "user-ca4-parity",
				correlationId: `corr-property-${tag}`,
				idempotencyKey: `property-${tag}`,
				legalCompanyId: company.data.id,
				code: "PROP-01",
				propertyType: "freehold",
				titleReference: " TITLE-PARITY ",
				propertyDescription: "Parity property",
				ownershipPercentage: "100.00",
				acquisitionDate: "2020-01-01",
			};
			const property = await registerProperty(registration, ready);
			const replay = await registerProperty(registration, ready);
			expect(property.ok && replay.ok).toBe(true);
			if (!property.ok || !replay.ok) return;
			expect(replay.data.id).toBe(property.data.id);

			const updated = await updateProperty(
				{
					organizationId: ORG,
					actorUserId: "user-ca4-parity",
					correlationId: `corr-update-${tag}`,
					idempotencyKey: `update-${tag}`,
					legalCompanyId: company.data.id,
					id: property.data.id,
					expectedVersion: 1,
					ownershipPercentage: "75.5",
				},
				ready,
			);
			expect(updated).toMatchObject({
				ok: true,
				data: { ownershipPercentage: "75.5", version: 2 },
			});
			const disposed = await disposeProperty(
				{
					organizationId: ORG,
					actorUserId: "user-ca4-parity",
					correlationId: `corr-dispose-${tag}`,
					idempotencyKey: `dispose-${tag}`,
					legalCompanyId: company.data.id,
					id: property.data.id,
					expectedVersion: 2,
					disposalDate: "2025-01-01",
					reason: "Sold",
					evidenceReference: "document:parity-disposal",
				},
				ready,
			);
			expect(disposed).toMatchObject({
				ok: true,
				data: { status: "disposed", version: 3 },
			});
			const asOf = await listPropertiesAsOf(
				{
					organizationId: ORG,
					actorUserId: "user-ca4-parity",
					legalCompanyId: company.data.id,
					asOf: "2024-12-31",
				},
				ready,
			);
			expect(asOf.ok && asOf.data).toHaveLength(1);
		},
	);
});
