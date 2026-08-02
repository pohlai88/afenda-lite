// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	canonicalDateSchema,
	canonicalInstantSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationOfficerStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationOfficerStore } from "@afenda/corporate-administration/testing";
import { database as afendaDatabase, caStatutoryOffice, eq } from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { OfficerStore } from "../../src/features/officers/store";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000692",
);
const actorUserId = userIdSchema.parse("user-ca-office-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-01-01T00:00:00.000Z");
const asOf = canonicalDateSchema.parse("2026-06-01");

async function runStatutoryOfficePaginationScenario(input: {
	store: OfficerStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	for (const [index, fixture] of [
		["SECRETARY", "MY", "Company Secretary", false],
		["AUDITOR", "SG", "Auditor", true],
		["DIRECTOR", "MY", "Director", true],
	].entries()) {
		const created = await input.store.defineStatutoryOffice({
			organizationId: input.organizationId,
			legalCompanyId,
			officeTypeCode: fixture[0],
			jurisdictionCode: fixture[1],
			displayName: fixture[2],
			description: null,
			required: fixture[3],
			minimumHolders: 1,
			maximumHolders: 3,
			vacancyGraceDays: 30,
			protectedRole: false,
			effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: `doc:office-pagination:${index}`,
			expectedCompanyVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create statutory office: ${created.code}.`);
		}
	}

	const first = await input.store.listRequiredStatutoryOffices({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 1,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second statutory-office page.");
	}
	const second = await input.store.listRequiredStatutoryOffices({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 1,
		cursor: first.data.nextCursor,
	});
	const includingOptional = await input.store.listRequiredStatutoryOffices({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		includeOptional: true,
		pageSize: 100,
	});
	const crossScope = await input.store.listRequiredStatutoryOffices({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		includeOptional: true,
		pageSize: 1,
		cursor: first.data.nextCursor,
	});

	return {
		requiredCodes: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((office) => office.officeTypeCode),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		allCodes: includingOptional.ok
			? includingOptional.data.items.map((office) => office.officeTypeCode)
			: [],
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
	};
}

const expected = {
	requiredCodes: ["DIRECTOR", "AUDITOR"],
	secondNextCursor: null,
	allCodes: ["DIRECTOR", "SECRETARY", "AUDITOR"],
	crossScopeCode: "VALIDATION_ERROR",
};

describe("Corporate Administration statutory-office pagination parity", () => {
	it("uses stable scope-bound keyset pages in memory", async () => {
		const result = await runStatutoryOfficePaginationScenario({
			store: createMemoryCorporateAdministrationOfficerStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-office-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-office-pagination-${randomUUID()}`,
				);
				try {
					const result = await runStatutoryOfficePaginationScenario({
						store: createDrizzleCorporateAdministrationOfficerStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caStatutoryOffice)
						.where(eq(caStatutoryOffice.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
