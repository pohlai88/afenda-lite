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
	activateLegalCompanyTestInput,
	addCompanyIdentifierTestInput,
	addCompanyNameTestInput,
	caEffectiveAtFromDate,
	createLegalCompanyTestInput,
	getLegalCompanyAsOfTestInput,
	suspendLegalCompanyTestInput,
} from "./helpers/legal-company-test-inputs";
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

function parityContext(tag: string) {
	return {
		organizationId: ORG,
		actorUserId: "user-ca",
		correlationId: `corr-${tag}`,
		idempotencyKey: tag.length >= 8 ? tag : `idem-${tag}`,
	};
}

async function seedDraftCompany(fixture: ParityFixture, tag: string) {
	return createLegalCompany(
		createLegalCompanyTestInput(`create-${tag}`, {
			...parityContext(`create-${tag}`),
			code: `CO-${tag}`.slice(0, 64),
			legalEntityDimensionId: fixture.dimensionId,
			legalPartyId: fixture.partyId,
		}),
		fixture.ready,
	);
}

async function seedActivationReadyCompany(fixture: ParityFixture, tag: string) {
	const created = await seedDraftCompany(fixture, tag);
	if (!created.ok) return created;
	await addCompanyName(
		addCompanyNameTestInput(`name-${tag}`, created.data.id, {
			...parityContext(`name-${tag}`),
			displayName: "Parity Holdings Sdn Bhd",
		}),
		fixture.ready,
	);
	await addCompanyIdentifier(
		addCompanyIdentifierTestInput(`id-${tag}`, created.data.id, {
			...parityContext(`id-${tag}`),
			identifierValue: `REG-${tag}`,
		}),
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
				const input = createLegalCompanyTestInput(`idem-${tag}`, {
					...parityContext(`idem-${tag}`),
					code: `IDEM-${tag}`.slice(0, 64),
					legalEntityDimensionId: fixture.dimensionId,
				});
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
					addCompanyIdentifierTestInput(`id-a-${tag}`, created.data.id, {
						...parityContext(`id-a-${tag}`),
						identifierValue: `123456-${tag}-A`,
					}),
					fixture.ready,
				);
				expect(first.ok).toBe(true);
				const second = await addCompanyIdentifier(
					addCompanyIdentifierTestInput(`id-b-${tag}`, created.data.id, {
						...parityContext(`id-b-${tag}`),
						identifierValue: `123456-${tag}-a`,
						effectiveFrom: "2024-06-01",
					}),
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
					activateLegalCompanyTestInput(`act-${tag}`, created.data, "2024-01-01", {
						...parityContext(`act-${tag}`),
					}),
					fixture.ready,
				);
				expect(activated.ok).toBe(true);
				const asOfDraft = await getLegalCompanyAsOf(
					getLegalCompanyAsOfTestInput(created.data.id, "2023-12-31", {
						organizationId: ORG,
						actorUserId: "user-ca",
					}),
					fixture.ready,
				);
				expect(asOfDraft.ok).toBe(true);
				if (asOfDraft.ok) {
					expect(asOfDraft.data.status).toBe("draft");
					expect(asOfDraft.data.asOf).toBe("2023-12-31");
					expect(asOfDraft.data.effectiveName).toBeDefined();
				}
				const asOfActive = await getLegalCompanyAsOf(
					getLegalCompanyAsOfTestInput(created.data.id, "2024-01-01", {
						organizationId: ORG,
						actorUserId: "user-ca",
					}),
					fixture.ready,
				);
				expect(asOfActive.ok).toBe(true);
				if (asOfActive.ok) {
					expect(asOfActive.data.status).toBe("active");
					expect(asOfActive.data.company.status).toBe("active");
					expect(asOfActive.data.effectiveIdentifiers.length).toBeGreaterThan(
						0,
					);
				}
			});

			it("rejects suspend from draft status", async () => {
				const tag = suffix(adapter);
				const fixture = await createParityFixture(adapter, tag);
				const created = await seedDraftCompany(fixture, tag);
				expect(created.ok).toBe(true);
				if (!created.ok) return;
				const suspended = await suspendLegalCompany(
					suspendLegalCompanyTestInput(`sus-${tag}`, created.data, {
						...parityContext(`sus-${tag}`),
						effectiveAt: caEffectiveAtFromDate("2024-01-01"),
						reasonCode: "invalid_transition",
						reason: "Invalid",
					}),
					fixture.ready,
				);
				expect(suspended.ok).toBe(false);
			});
		},
	);
}
