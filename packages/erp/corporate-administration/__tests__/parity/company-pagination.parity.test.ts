// biome-ignore-all lint/performance/noAwaitInLoops: Versioned pagination fixtures must advance aggregate versions sequentially.
import { randomUUID } from "node:crypto";

import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	and,
	caCompanyStatusHistory,
	caLegalCompany,
	eq,
	sql,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type {
	CompanyIdentifierStore,
	CompanyNameStore,
	LegalCompanyStore,
} from "../../src/features/company/store";
import type { LegalCompany } from "../../src/features/company/types";
import { cleanupCorporateAdministrationInfrastructureTestData } from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

type PaginationStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyIdentifierStore;

const actorUserId = userIdSchema.parse("user-ca-pagination-parity");
const correlationId = correlationIdSchema.parse("corr-ca-pagination-parity");

async function runPaginationScenario(input: {
	store: PaginationStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
	prepareHistoricalStatuses?:
		| ((companies: readonly LegalCompany[]) => Promise<void>)
		| undefined;
}) {
	const companies: LegalCompany[] = [];
	for (const code of ["AF-CURSOR-A", "AF-CURSOR-B", "AF-CURSOR-C"] as const) {
		const registered = await input.store.registerLegalCompanyDraft({
			organizationId: input.organizationId,
			companyCode: code,
			normalizedCompanyCode: code,
			displayName: code,
			masterDataPartyId: `party-${code.toLowerCase()}`,
			homeJurisdictionCountryCode: "MY",
			sourceReference: `doc:${code.toLowerCase()}`,
			createdByUserId: actorUserId,
			createdAt: "2026-01-01T00:00:00.000Z",
			correlationId,
		});
		if (!registered.ok) {
			throw new Error(
				"Pagination parity could not create its company fixture.",
			);
		}
		companies.push(registered.data);
	}
	const [company] = companies;
	if (company === undefined) {
		throw new Error("Pagination parity company fixture is unavailable.");
	}

	for (const [index, name] of [
		[0, "Afenda Former"],
		[1, "Afenda Current"],
	] as const) {
		const inserted = await input.store.addCompanyName({
			organizationId: input.organizationId,
			legalCompanyId: company.legalCompanyId,
			nameType: "legal",
			languageCode: "en",
			displayName: name,
			normalizedName: name.toLowerCase(),
			effectivePeriod: {
				from: index === 0 ? "2025-01-01" : "2026-01-01",
				to: index === 0 ? "2026-01-01" : null,
			},
			recordedAt:
				index === 0 ? "2025-01-01T00:00:00.000Z" : "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: `doc:name:${index}`,
			expectedCompanyVersion: index + 1,
			correlationId,
		});
		if (!inserted.ok) {
			throw new Error("Pagination parity could not create its name fixture.");
		}
	}

	for (const [index, authority] of ["ALT", "SSM"].entries()) {
		const inserted = await input.store.registerCompanyIdentifier({
			organizationId: input.organizationId,
			legalCompanyId: company.legalCompanyId,
			identifierType: "company_registration",
			jurisdictionCode: "MY",
			issuingAuthorityCode: authority,
			identifierValue: `2026-0000000${index + 1}`,
			normalizedIdentifierValue: `20260000000${index + 1}`,
			effectivePeriod: { from: "2026-01-01", to: null },
			recordedAt: "2026-01-01T00:00:00.000Z",
			recordedByUserId: actorUserId,
			sourceDocumentId: `doc:identifier:${index}`,
			expectedCompanyVersion: index + 3,
			correlationId,
		});
		if (!inserted.ok) {
			throw new Error(
				"Pagination parity could not create its identifier fixture.",
			);
		}
	}

	const companiesFirst = await input.store.listLegalCompanies({
		organizationId: input.organizationId,
		pagination: { limit: 2 },
	});
	if (!companiesFirst.ok || companiesFirst.data.nextCursor === null) {
		throw new Error("Pagination parity expected a second company page.");
	}
	const companiesSecond = await input.store.listLegalCompanies({
		organizationId: input.organizationId,
		pagination: { limit: 2, cursor: companiesFirst.data.nextCursor },
	});

	const statusFirst = await input.store.listCompaniesByStatus({
		organizationId: input.organizationId,
		status: "draft",
		pagination: { limit: 2 },
	});
	if (!statusFirst.ok || statusFirst.data.nextCursor === null) {
		throw new Error("Pagination parity expected a second status page.");
	}
	const statusSecond = await input.store.listCompaniesByStatus({
		organizationId: input.organizationId,
		status: "draft",
		pagination: { limit: 2, cursor: statusFirst.data.nextCursor },
	});

	const namesFirst = await input.store.listCompanyNames({
		organizationId: input.organizationId,
		legalCompanyId: company.legalCompanyId,
		includeFormer: true,
		pageSize: 1,
	});
	if (!namesFirst.ok || namesFirst.data.nextCursor === null) {
		throw new Error("Pagination parity expected a second company-name page.");
	}
	const namesSecond = await input.store.listCompanyNames({
		organizationId: input.organizationId,
		legalCompanyId: company.legalCompanyId,
		includeFormer: true,
		pageSize: 1,
		cursor: namesFirst.data.nextCursor,
	});

	const identifiersFirst = await input.store.listCompanyIdentifiers({
		organizationId: input.organizationId,
		legalCompanyId: company.legalCompanyId,
		pageSize: 1,
	});
	if (!identifiersFirst.ok || identifiersFirst.data.nextCursor === null) {
		throw new Error("Pagination parity expected a second identifier page.");
	}
	const identifiersSecond = await input.store.listCompanyIdentifiers({
		organizationId: input.organizationId,
		legalCompanyId: company.legalCompanyId,
		pageSize: 1,
		cursor: identifiersFirst.data.nextCursor,
	});

	if (input.prepareHistoricalStatuses === undefined) {
		for (const [index, candidate] of companies.entries()) {
			const current = await input.store.getLegalCompany({
				organizationId: input.organizationId,
				legalCompanyId: candidate.legalCompanyId,
			});
			if (!current.ok || current.data === null) {
				throw new Error("Pagination parity could not resolve company version.");
			}
			const changed = await input.store.changeLegalCompanyStatus({
				organizationId: input.organizationId,
				legalCompanyId: candidate.legalCompanyId,
				status: "active",
				effectiveFrom: "2026-02-01",
				recordedAt: `2026-02-0${index + 1}T00:00:00.000Z`,
				recordedByUserId: actorUserId,
				reason: null,
				sourceDocumentId: `doc:status:${index}`,
				expectedCompanyVersion: current.data.version,
				correlationId,
			});
			if (!changed.ok) {
				throw new Error(
					`Pagination parity could not create status history: ${changed.code}.`,
				);
			}
		}
	} else {
		await input.prepareHistoricalStatuses(companies);
	}

	const historicalStatusFirst = await input.store.listCompaniesByStatus({
		organizationId: input.organizationId,
		status: "active",
		asOf: "2026-02-01",
		pagination: { limit: 2 },
	});
	if (
		!historicalStatusFirst.ok ||
		historicalStatusFirst.data.nextCursor === null
	) {
		throw new Error(
			"Pagination parity expected a second historical-status page.",
		);
	}
	const historicalStatusSecond = await input.store.listCompaniesByStatus({
		organizationId: input.organizationId,
		status: "active",
		asOf: "2026-02-01",
		pagination: {
			limit: 2,
			cursor: historicalStatusFirst.data.nextCursor,
		},
	});

	return {
		companies: [companiesFirst, companiesSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.companyCode),
		companyNextCursor: companiesSecond.ok
			? companiesSecond.data.nextCursor
			: "error",
		statusCompanies: [statusFirst, statusSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.companyCode),
		statusNextCursor: statusSecond.ok ? statusSecond.data.nextCursor : "error",
		historicalStatusCompanies: [historicalStatusFirst, historicalStatusSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.companyCode),
		historicalStatusNextCursor: historicalStatusSecond.ok
			? historicalStatusSecond.data.nextCursor
			: "error",
		names: [namesFirst, namesSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.displayName),
		nameNextCursor: namesSecond.ok ? namesSecond.data.nextCursor : "error",
		identifiers: [identifiersFirst, identifiersSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.issuingAuthorityCode),
		identifierNextCursor: identifiersSecond.ok
			? identifiersSecond.data.nextCursor
			: "error",
	};
}

const expected = {
	companies: ["AF-CURSOR-A", "AF-CURSOR-B", "AF-CURSOR-C"],
	companyNextCursor: null,
	statusCompanies: ["AF-CURSOR-A", "AF-CURSOR-B", "AF-CURSOR-C"],
	statusNextCursor: null,
	historicalStatusCompanies: ["AF-CURSOR-A", "AF-CURSOR-B", "AF-CURSOR-C"],
	historicalStatusNextCursor: null,
	names: ["Afenda Current", "Afenda Former"],
	nameNextCursor: null,
	identifiers: ["ALT", "SSM"],
	identifierNextCursor: null,
};

describe("Corporate Administration company pagination parity", () => {
	it("uses stable bounded keyset pages in memory", async () => {
		const result = await runPaginationScenario({
			store:
				createMemoryCorporateAdministrationLegalCompanyStore() as PaginationStore,
			organizationId: organizationIdSchema.parse("org-ca-pagination-memory"),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory keyset-pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-pagination-${randomUUID()}`,
				);
				try {
					const result = await runPaginationScenario({
						store: createDrizzleCorporateAdministrationLegalCompanyStore({
							database: afendaDatabase.client,
							createLegalCompanyId: randomUUID,
						}) as PaginationStore,
						organizationId,
						prepareHistoricalStatuses: async (companies) => {
							for (const [index, company] of companies.entries()) {
								const updatedRows = await afendaDatabase.client
									.update(caLegalCompany)
									.set({
										state: "active",
										version: sql`${caLegalCompany.version} + 1`,
									})
									.where(
										and(
											eq(caLegalCompany.organizationId, organizationId),
											eq(caLegalCompany.id, company.legalCompanyId),
										),
									)
									.returning({ version: caLegalCompany.version });
								const [updated] = updatedRows;
								if (updated === undefined) {
									throw new Error(
										"Pagination parity could not seed company status.",
									);
								}
								await afendaDatabase.client
									.insert(caCompanyStatusHistory)
									.values({
										id: randomUUID(),
										organizationId,
										legalCompanyId: company.legalCompanyId,
										status: "active",
										effectiveFrom: "2026-02-01",
										effectiveTo: null,
										recordedAt: new Date(`2026-02-0${index + 1}T00:00:00.000Z`),
										recordedBy: actorUserId,
										reason: null,
										sourceDocumentId: `doc:status:${index}`,
										version: updated.version,
									});
							}
						},
					});
					expect(result).toEqual(expected);
				} finally {
					await cleanupCorporateAdministrationInfrastructureTestData(
						organizationId,
					);
				}
			});
		},
	);
});
