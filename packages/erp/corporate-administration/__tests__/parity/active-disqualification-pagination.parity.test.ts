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
	caOfficerDisqualification,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { OfficerComplianceStore } from "../../src/features/officers/compliance-store";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000695",
);
const actorUserId = userIdSchema.parse("user-ca-disqualification-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T00:00:00.000Z");
const asOf = canonicalDateSchema.parse("2026-04-15");

async function runActiveDisqualificationPaginationScenario(input: {
	store: OfficerComplianceStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const fixtures = [
		["COURT_ORDER", "2026-01-01", "00000000-0000-4000-8000-000000000801"],
		["REGULATOR_BAR", "2026-02-01", "00000000-0000-4000-8000-000000000802"],
		["STATUTORY_BAR", "2026-03-01", "00000000-0000-4000-8000-000000000803"],
		["FUTURE_BAR", "2026-06-01", "00000000-0000-4000-8000-000000000804"],
	] as const;
	for (const [index, fixture] of fixtures.entries()) {
		const created = await input.store.recordOfficerDisqualification({
			organizationId: input.organizationId,
			legalCompanyId,
			officerAppointmentId: officerAppointmentIdSchema.parse(fixture[2]),
			reasonCode: fixture[0],
			authorityReference: `authority-${index + 1}`,
			sourceDocumentId: `doc:disqualification-pagination:${index}`,
			effectiveFrom: canonicalDateSchema.parse(fixture[1]),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create disqualification: ${created.code}.`);
		}
	}

	const first = await input.store.listActiveDisqualifications({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second active-disqualification page.");
	}
	const second = await input.store.listActiveDisqualifications({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listActiveDisqualifications({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		officerAppointmentId: officerAppointmentIdSchema.parse(fixtures[0][2]),
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossTenant = await input.store.listActiveDisqualifications({
		organizationId: organizationIdSchema.parse(`${input.organizationId}-other`),
		legalCompanyId,
		asOf,
		pageSize: 100,
	});

	return {
		reasons: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((disqualification) => disqualification.reasonCode),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		crossTenantCount: crossTenant.ok ? crossTenant.data.items.length : -1,
	};
}

const expected = {
	reasons: ["COURT_ORDER", "REGULATOR_BAR", "STATUTORY_BAR"],
	secondNextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	crossTenantCount: 0,
};

describe("Corporate Administration active-disqualification pagination parity", () => {
	it("uses stable tenant- and filter-bound keyset pages in memory", async () => {
		const result = await runActiveDisqualificationPaginationScenario({
			store: createMemoryCorporateAdministrationOfficerComplianceStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-disqualification-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-disqualification-pagination-${randomUUID()}`,
				);
				try {
					const result = await runActiveDisqualificationPaginationScenario({
						store: createDrizzleCorporateAdministrationOfficerComplianceStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caOfficerDisqualification)
						.where(
							eq(caOfficerDisqualification.organizationId, organizationId),
						);
				}
			}, 30_000);
		},
	);
});
