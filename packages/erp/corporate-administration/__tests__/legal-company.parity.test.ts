import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
	activateLegalCompany,
	addCompanyIdentifier,
	addCompanyName,
	createLegalCompany,
	getLegalCompanyAsOf,
	suspendLegalCompany,
} from "../src/legal-company";
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

const ORG = "org-ca-parity";
const MEMORY_DIM = "10000000-0000-4000-8000-00000000ca01";
const MEMORY_PARTY = "20000000-0000-4000-8000-00000000ca01";

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
				{
					organizationId: ORG,
				},
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

async function seedDraftCompany(fixture: ParityFixture, tag: string) {
	return createLegalCompany(
		{
			organizationId: ORG,
			actorUserId: "user-ca",
			correlationId: `corr-create-${tag}`,
			idempotencyKey: `create-${tag}`,
			requestFingerprint: `fp-create-${tag}`,
			code: `CO-${tag}`.slice(0, 64),
			legalEntityDimensionId: fixture.dimensionId,
			legalPartyId: fixture.partyId,
		},
		fixture.ready,
	);
}

async function seedActivationReadyCompany(fixture: ParityFixture, tag: string) {
	const created = await seedDraftCompany(fixture, tag);
	if (!created.ok) return created;
	await addCompanyName(
		{
			organizationId: ORG,
			actorUserId: "user-ca",
			correlationId: `corr-name-${tag}`,
			idempotencyKey: `name-${tag}`,
			requestFingerprint: `fp-name-${tag}`,
			legalCompanyId: created.data.id,
			nameType: "legal",
			displayName: "Parity Holdings Sdn Bhd",
			effectiveFrom: "2024-01-01",
		},
		fixture.ready,
	);
	await addCompanyIdentifier(
		{
			organizationId: ORG,
			actorUserId: "user-ca",
			correlationId: `corr-id-${tag}`,
			idempotencyKey: `id-${tag}`,
			requestFingerprint: `fp-id-${tag}`,
			legalCompanyId: created.data.id,
			identifierType: "company_registration",
			identifierValue: `REG-${tag}`,
			effectiveFrom: "2024-01-01",
		},
		fixture.ready,
	);
	return created;
}

for (const adapter of ["memory", "drizzle"] as const) {
	const describeParity =
		adapter === "drizzle" ? describe.runIf(runDrizzleParity) : describe;

	describeParity(
		`@afenda/corporate-administration legal company parity (${adapter})`,
		() => {
			it("replays create idempotency with matching fingerprint", async () => {
				const tag = suffix(adapter);
				const fixture = await createParityFixture(adapter, tag);
				const input = {
					organizationId: ORG,
					actorUserId: "user-ca",
					correlationId: `corr-idem-${tag}`,
					idempotencyKey: `idem-${tag}`,
					requestFingerprint: `fp-idem-${tag}`,
					code: `IDEM-${tag}`.slice(0, 64),
					legalEntityDimensionId: fixture.dimensionId,
				};
				const first = await createLegalCompany(input, fixture.ready);
				const second = await createLegalCompany(input, fixture.ready);
				expect(first.ok).toBe(true);
				expect(second.ok).toBe(true);
				if (first.ok && second.ok) {
					expect(second.data.id).toBe(first.data.id);
				}
			});

			it("rejects identifier anti-recycle on normalized value", async () => {
				const tag = suffix(adapter);
				const fixture = await createParityFixture(adapter, tag);
				const created = await seedDraftCompany(fixture, tag);
				expect(created.ok).toBe(true);
				if (!created.ok) return;
				const first = await addCompanyIdentifier(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						correlationId: `corr-id-a-${tag}`,
						idempotencyKey: `id-a-${tag}`,
						requestFingerprint: `fp-id-a-${tag}`,
						legalCompanyId: created.data.id,
						identifierType: "company_registration",
						identifierValue: `123456-${tag}-A`,
						effectiveFrom: "2024-01-01",
					},
					fixture.ready,
				);
				expect(first.ok).toBe(true);
				const second = await addCompanyIdentifier(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						correlationId: `corr-id-b-${tag}`,
						idempotencyKey: `id-b-${tag}`,
						requestFingerprint: `fp-id-b-${tag}`,
						legalCompanyId: created.data.id,
						identifierType: "company_registration",
						identifierValue: `123456-${tag}-a`,
						effectiveFrom: "2024-06-01",
					},
					fixture.ready,
				);
				expect(second.ok).toBe(false);
			});

			it("activates and reconstructs as-of status from history", async () => {
				const tag = suffix(adapter);
				const fixture = await createParityFixture(adapter, tag);
				const created = await seedActivationReadyCompany(fixture, tag);
				expect(created.ok).toBe(true);
				if (!created.ok) return;
				const activated = await activateLegalCompany(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						correlationId: `corr-act-${tag}`,
						idempotencyKey: `act-${tag}`,
						requestFingerprint: `fp-act-${tag}`,
						legalCompanyId: created.data.id,
						expectedVersion: created.data.version,
						effectiveDate: "2024-01-01",
					},
					fixture.ready,
				);
				expect(activated.ok).toBe(true);
				const asOfDraft = await getLegalCompanyAsOf(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						legalCompanyId: created.data.id,
						asOf: "2023-12-31",
					},
					fixture.ready,
				);
				expect(asOfDraft.ok).toBe(true);
				if (asOfDraft.ok) {
					expect(asOfDraft.data.status).toBe("draft");
				}
				const asOfActive = await getLegalCompanyAsOf(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						legalCompanyId: created.data.id,
						asOf: "2024-01-01",
					},
					fixture.ready,
				);
				expect(asOfActive.ok).toBe(true);
				if (asOfActive.ok) {
					expect(asOfActive.data.status).toBe("active");
				}
			});

			it("rejects suspend from draft status", async () => {
				const tag = suffix(adapter);
				const fixture = await createParityFixture(adapter, tag);
				const created = await seedDraftCompany(fixture, tag);
				expect(created.ok).toBe(true);
				if (!created.ok) return;
				const suspended = await suspendLegalCompany(
					{
						organizationId: ORG,
						actorUserId: "user-ca",
						correlationId: `corr-sus-${tag}`,
						idempotencyKey: `sus-${tag}`,
						requestFingerprint: `fp-sus-${tag}`,
						legalCompanyId: created.data.id,
						expectedVersion: created.data.version,
						effectiveDate: "2024-01-01",
						reason: "Invalid",
					},
					fixture.ready,
				);
				expect(suspended.ok).toBe(false);
			});
		},
	);
}
