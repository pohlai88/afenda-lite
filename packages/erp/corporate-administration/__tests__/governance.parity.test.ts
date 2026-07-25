import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { appointOfficer, createGovernanceBody } from "../src/governance";
import { endOfficer } from "../src/governance-lifecycle";
import { createLegalCompany } from "../src/legal-company";
import {
	type CaParityHarness,
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

const ORG = "org-ca-gov-parity";
const MEMORY_DIM = "10000000-0000-4000-8000-00000000ca02";
const MEMORY_PARTY = "20000000-0000-4000-8000-00000000ca02";
const MEMORY_DIRECTOR = "20000000-0000-4000-8000-00000000ca03";

type ParityFixture = {
	companyId: string;
	directorId: string;
	ready: CaParityHarness;
};

function suffix(adapter: string) {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createParityFixture(
	adapter: "memory" | "drizzle",
): Promise<ParityFixture> {
	const tag = suffix(adapter);
	const dimensionId = adapter === "memory" ? MEMORY_DIM : randomUUID();
	const partyId = adapter === "memory" ? MEMORY_PARTY : randomUUID();
	const directorId = adapter === "memory" ? MEMORY_DIRECTOR : randomUUID();
	const dimensionKey = `LE-${tag}`.slice(0, 64);
	const partyCode = `ORG-${tag}`.slice(0, 64);
	const directorCode = `DIR-${tag}`.slice(0, 64);

	if (adapter === "drizzle") {
		await ensureDrizzleCaMasterFixtures({
			organizationId: ORG,
			dimensionId,
			dimensionKey,
			dimensionName: `Legal Entity ${tag}`,
			partyId,
			partyCode,
		});
		await ensureDrizzleCaMasterFixtures({
			organizationId: ORG,
			dimensionId: randomUUID(),
			dimensionKey: `LE2-${tag}`.slice(0, 64),
			dimensionName: `Director Entity ${tag}`,
			partyId: directorId,
			partyCode: directorCode,
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
		parties: [
			seedOrganizationParty(ORG, partyId, partyCode),
			seedOrganizationParty(ORG, directorId, directorCode),
		],
	});

	const ready = createCaParityHarness(adapter, masters);
	const created = await createLegalCompany(
		createLegalCompanyTestInput(`company-${tag}`, {
			organizationId: ORG,
			actorUserId: "user-parity",
			correlationId: `corr-company-${tag}`,
			idempotencyKey: `company-${tag}`,
			code: `CO-${tag}`.slice(0, 64),
			legalEntityDimensionId: dimensionId,
			legalPartyId: partyId,
		}),
		ready,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) throw new Error("seed company failed");

	return { companyId: created.data.id, directorId, ready };
}

describe.runIf(runDrizzleParity)(
	"@afenda/corporate-administration governance parity",
	() => {
		it("memory and drizzle agree on officer appoint and end lifecycle", async () => {
			const memory = await createParityFixture("memory");
			const drizzle = await createParityFixture("drizzle");
			const appointedDate = "2024-06-01";
			const endDate = "2024-12-31";

			const memoryAppointed = await appointOfficer(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-off-mem",
					idempotencyKey: "off-mem",
					legalCompanyId: memory.companyId,
					officerRole: "director",
					partyId: memory.directorId,
					appointedDate,
				},
				memory.ready,
			);
			const drizzleAppointed = await appointOfficer(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-off-drz",
					idempotencyKey: "off-drz",
					legalCompanyId: drizzle.companyId,
					officerRole: "director",
					partyId: drizzle.directorId,
					appointedDate,
				},
				drizzle.ready,
			);
			expect(memoryAppointed.ok).toBe(true);
			expect(drizzleAppointed.ok).toBe(true);
			if (!memoryAppointed.ok || !drizzleAppointed.ok) return;

			const memoryEnded = await endOfficer(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-end-mem",
					idempotencyKey: "end-mem",
					legalCompanyId: memory.companyId,
					id: memoryAppointed.data.id,
					expectedVersion: memoryAppointed.data.version,
					effectiveTo: endDate,
					endKind: "resigned",
					reason: "Retired",
				},
				memory.ready,
			);
			const drizzleEnded = await endOfficer(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-end-drz",
					idempotencyKey: "end-drz",
					legalCompanyId: drizzle.companyId,
					id: drizzleAppointed.data.id,
					expectedVersion: drizzleAppointed.data.version,
					effectiveTo: endDate,
					endKind: "resigned",
					reason: "Retired",
				},
				drizzle.ready,
			);
			expect(memoryEnded.ok).toBe(true);
			expect(drizzleEnded.ok).toBe(true);
			if (!memoryEnded.ok || !drizzleEnded.ok) return;

			expect(memoryEnded.data.status).toBe(drizzleEnded.data.status);
			expect(memoryEnded.data.resignedDate).toBe(
				drizzleEnded.data.resignedDate,
			);
		});

		it("memory and drizzle agree on governance body create", async () => {
			const memory = await createParityFixture("memory");
			const drizzle = await createParityFixture("drizzle");

			const memoryBody = await createGovernanceBody(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-body-mem",
					idempotencyKey: "body-mem",
					legalCompanyId: memory.companyId,
					code: "BOARD-MEM",
					bodyType: "board",
					displayName: "Board of Directors",
				},
				memory.ready,
			);
			const drizzleBody = await createGovernanceBody(
				{
					organizationId: ORG,
					actorUserId: "user-parity",
					correlationId: "corr-body-drz",
					idempotencyKey: "body-drz",
					legalCompanyId: drizzle.companyId,
					code: "BOARD-DRZ",
					bodyType: "board",
					displayName: "Board of Directors",
				},
				drizzle.ready,
			);
			expect(memoryBody.ok).toBe(true);
			expect(drizzleBody.ok).toBe(true);
			if (!memoryBody.ok || !drizzleBody.ok) return;

			expect(memoryBody.data.bodyType).toBe(drizzleBody.data.bodyType);
			expect(memoryBody.data.status).toBe(drizzleBody.data.status);
		});
	},
);
