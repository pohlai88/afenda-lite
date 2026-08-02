// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import {
	createDrizzleCorporateAdministrationEstablishmentStore,
	createDrizzleCorporateAdministrationLegalCompanyStore,
} from "@afenda/corporate-administration/adapters/drizzle";
import {
	createMemoryCorporateAdministrationEstablishmentStore,
	createMemoryCorporateAdministrationLegalCompanyStore,
} from "@afenda/corporate-administration/testing";
import { database as afendaDatabase } from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { LegalCompanyStore } from "../../src/features/company/store";
import type { EstablishmentStore } from "../../src/features/establishments/store";
import { cleanupCorporateAdministrationInfrastructureTestData } from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const actorUserId = userIdSchema.parse("user-ca-establishment-pagination");
const correlationId = correlationIdSchema.parse(
	"corr-ca-establishment-pagination",
);

async function runEstablishmentPaginationScenario(input: {
	store: EstablishmentStore;
	companyStore: LegalCompanyStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const company = await input.companyStore.registerLegalCompanyDraft({
		organizationId: input.organizationId,
		companyCode: "EST-PAGE",
		normalizedCompanyCode: "EST-PAGE",
		displayName: "Establishment Pagination Company",
		masterDataPartyId: "party-establishment-pagination",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "doc:establishment-pagination-company",
		createdByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		correlationId,
	});
	if (!company.ok) {
		throw new Error(
			`Could not create company pagination fixture: ${company.code}.`,
		);
	}
	const { legalCompanyId } = company.data;

	for (const [index, fixture] of [
		["branch", "MY", "BRANCH-003", "Branch"],
		["foreign_registration", "SG", "FOREIGN-001", "Foreign"],
		["representative_office", "TH", "REP-002", "Representative"],
	].entries()) {
		const registered = await input.store.registerLegalEstablishment({
			organizationId: input.organizationId,
			legalCompanyId,
			establishmentType: fixture[0],
			jurisdictionCode: fixture[1],
			registrationIdentifier: fixture[2],
			normalizedRegistrationIdentifier: fixture[2],
			displayName: fixture[3],
			registeredFrom: "2026-01-01",
			recordedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
			recordedBy: actorUserId,
			sourceDocumentId: `doc:establishment:${index}`,
			expectedCompanyVersion: index + 1,
		});
		if (!registered.ok) {
			throw new Error(
				`Could not create establishment pagination fixture: ${registered.code}.`,
			);
		}
	}

	for (const [index, fixture] of [
		["office", "Alpha Office"],
		["other", "Beta Site"],
		["warehouse", "Zulu Warehouse"],
	].entries()) {
		const registered = await input.store.registerPremise({
			organizationId: input.organizationId,
			legalCompanyId,
			legalEstablishmentId: null,
			premiseType: fixture[0],
			displayName: fixture[1],
			address: {
				sourcePartyAddressId: `00000000-0000-4000-8000-00000000068${index}`,
				line1: `${index + 1} Pagination Way`,
				line2: null,
				city: "Kuala Lumpur",
				region: null,
				postalCode: "50000",
				countryCode: "MY",
			},
			effectiveFrom: "2026-01-01",
			effectiveTo: null,
			recordedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
			recordedBy: actorUserId,
			sourceDocumentId: `doc:premise:${index}`,
		});
		if (!registered.ok) {
			throw new Error(
				`Could not create premise pagination fixture: ${registered.code}.`,
			);
		}
	}

	const establishmentsFirst = await input.store.listLegalEstablishmentsAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: "2026-06-01",
		pagination: { limit: 2 },
	});
	if (!establishmentsFirst.ok || establishmentsFirst.data.nextCursor === null) {
		throw new Error(
			establishmentsFirst.ok
				? `Expected a second establishment page; received ${establishmentsFirst.data.items.length} item(s).`
				: `Could not list the first establishment page: ${establishmentsFirst.code}.`,
		);
	}
	const establishmentsSecond = await input.store.listLegalEstablishmentsAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: "2026-06-01",
		pagination: { limit: 2, cursor: establishmentsFirst.data.nextCursor },
	});

	const premisesFirst = await input.store.listPremisesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: "2026-06-01",
		pagination: { limit: 2 },
	});
	if (!premisesFirst.ok || premisesFirst.data.nextCursor === null) {
		throw new Error("Expected a second premise page.");
	}
	const premisesSecond = await input.store.listPremisesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: "2026-06-01",
		pagination: { limit: 2, cursor: premisesFirst.data.nextCursor },
	});

	return {
		establishments: [establishmentsFirst, establishmentsSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.displayName),
		establishmentNextCursor: establishmentsSecond.ok
			? establishmentsSecond.data.nextCursor
			: "error",
		premises: [premisesFirst, premisesSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.displayName),
		premiseNextCursor: premisesSecond.ok
			? premisesSecond.data.nextCursor
			: "error",
	};
}

const expected = {
	establishments: ["Branch", "Foreign", "Representative"],
	establishmentNextCursor: null,
	premises: ["Alpha Office", "Beta Site", "Zulu Warehouse"],
	premiseNextCursor: null,
};

describe("Corporate Administration establishment pagination parity", () => {
	it("uses stable scope-bound keyset pages in memory", async () => {
		const result = await runEstablishmentPaginationScenario({
			store: createMemoryCorporateAdministrationEstablishmentStore(),
			companyStore: createMemoryCorporateAdministrationLegalCompanyStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-establishment-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-establishment-pagination-${randomUUID()}`,
				);
				try {
					const result = await runEstablishmentPaginationScenario({
						store: createDrizzleCorporateAdministrationEstablishmentStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						companyStore: createDrizzleCorporateAdministrationLegalCompanyStore(
							{
								database: afendaDatabase.client,
								createLegalCompanyId: randomUUID,
							},
						),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await cleanupCorporateAdministrationInfrastructureTestData(
						organizationId,
					);
				}
			}, 30_000);
		},
	);
});
