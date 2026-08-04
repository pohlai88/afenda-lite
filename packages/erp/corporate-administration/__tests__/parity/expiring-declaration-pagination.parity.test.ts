// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	canonicalDateSchema,
	canonicalInstantSchema,
	officerAppointmentIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationOfficerComplianceStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationOfficerComplianceStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	caOfficerDeclaration,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { OfficerComplianceStore } from "../../src/features/officers/compliance-store";
import type { OfficerDeclarationType } from "../../src/features/officers/compliance-types";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000694",
);
const actorUserId = userIdSchema.parse("user-ca-declaration-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T00:00:00.000Z");
const asOf = canonicalDateSchema.parse("2026-04-01");

async function runExpiringDeclarationPaginationScenario(input: {
	store: OfficerComplianceStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const fixtures: readonly (readonly [
		OfficerDeclarationType,
		string,
		string,
	])[] = [
		["eligibility", "2026-04-10", "00000000-0000-4000-8000-000000000701"],
		["consent", "2026-04-20", "00000000-0000-4000-8000-000000000702"],
		["fit_and_proper", "2026-04-30", "00000000-0000-4000-8000-000000000703"],
		["interest", "2026-06-01", "00000000-0000-4000-8000-000000000704"],
	];
	for (const [index, fixture] of fixtures.entries()) {
		const created = await input.store.recordOfficerDeclaration({
			organizationId: input.organizationId,
			legalCompanyId,
			officerAppointmentId: officerAppointmentIdSchema.parse(fixture[2]),
			declarationType: fixture[0],
			effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
			expiresOn: canonicalDateSchema.parse(fixture[1]),
			sensitiveDetailRef: null,
			maskedSummary: `Declaration ${index + 1}`,
			sourceDocumentId: `doc:declaration-pagination:${index}`,
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create officer declaration: ${created.code}.`);
		}
	}

	const first = await input.store.listExpiringDeclarations({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		windowDays: 30,
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second expiring-declaration page.");
	}
	const second = await input.store.listExpiringDeclarations({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		windowDays: 30,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listExpiringDeclarations({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		windowDays: 30,
		declarationType: "consent",
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossTenant = await input.store.listExpiringDeclarations({
		organizationId: organizationIdSchema.parse(`${input.organizationId}-other`),
		legalCompanyId,
		asOf,
		windowDays: 30,
		pageSize: 100,
	});

	return {
		types: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((declaration) => declaration.declarationType),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		crossTenantCount: crossTenant.ok ? crossTenant.data.items.length : -1,
	};
}

const expected = {
	types: ["eligibility", "consent", "fit_and_proper"],
	secondNextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	crossTenantCount: 0,
};

describe("Corporate Administration expiring-declaration pagination parity", () => {
	it("uses stable tenant- and filter-bound keyset pages in memory", async () => {
		const result = await runExpiringDeclarationPaginationScenario({
			store: createMemoryCorporateAdministrationOfficerComplianceStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-declaration-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-declaration-pagination-${randomUUID()}`,
				);
				try {
					const result = await runExpiringDeclarationPaginationScenario({
						store: createDrizzleCorporateAdministrationOfficerComplianceStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caOfficerDeclaration)
						.where(eq(caOfficerDeclaration.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
