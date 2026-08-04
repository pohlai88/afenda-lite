// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	canonicalInstantSchema,
	officerAppointmentIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationOfficerComplianceStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationOfficerComplianceStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	caConflictDisclosure,
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
	"00000000-0000-4000-8000-000000000696",
);
const officerAppointmentId = officerAppointmentIdSchema.parse(
	"00000000-0000-4000-8000-000000000806",
);
const actorUserId = userIdSchema.parse("user-ca-conflict-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T00:00:00.000Z");

async function runConflictPaginationScenario(input: {
	store: OfficerComplianceStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const fixtures = [
		["RELATED_PARTY", "2026-04-01T01:00:00.000Z", "Conflict A", "resolution-1"],
		[
			"PERSONAL_INTEREST",
			"2026-04-01T02:00:00.000Z",
			"Conflict B",
			"resolution-1",
		],
		[
			"FAMILY_INTEREST",
			"2026-04-01T03:00:00.000Z",
			"Conflict C",
			"resolution-1",
		],
		[
			"OTHER_MATTER",
			"2026-04-01T04:00:00.000Z",
			"Other matter",
			"resolution-2",
		],
	] as const;
	for (const [index, fixture] of fixtures.entries()) {
		const created = await input.store.discloseConflict({
			organizationId: input.organizationId,
			legalCompanyId,
			officerAppointmentId,
			matterType: "resolution",
			matterId: fixture[3],
			conflictTypeCode: fixture[0],
			sensitiveDetailRef: `vault:conflict:${index + 1}`,
			maskedSummary: fixture[2],
			disclosedAt: new Date(fixture[1]),
			sourceDocumentId: `doc:conflict-pagination:${index + 1}`,
			recordedAt,
			recordedBy: actorUserId,
			expectedAppointmentVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create conflict: ${created.code}.`);
		}
	}

	const first = await input.store.listConflictsForMatter({
		organizationId: input.organizationId,
		legalCompanyId,
		matterType: "resolution",
		matterId: "resolution-1",
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second conflict-disclosure page.");
	}
	const second = await input.store.listConflictsForMatter({
		organizationId: input.organizationId,
		legalCompanyId,
		matterType: "resolution",
		matterId: "resolution-1",
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listConflictsForMatter({
		organizationId: input.organizationId,
		legalCompanyId,
		matterType: "resolution",
		matterId: "resolution-1",
		includeCleared: true,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossTenant = await input.store.listConflictsForMatter({
		organizationId: organizationIdSchema.parse(`${input.organizationId}-other`),
		legalCompanyId,
		matterType: "resolution",
		matterId: "resolution-1",
		pageSize: 100,
	});
	const items = [first, second].flatMap((result) =>
		result.ok ? result.data.items : [],
	);

	return {
		summaries: items.map((conflict) => conflict.maskedSummary),
		refsAreOpaque: items.every((conflict) =>
			conflict.sensitiveDetailRef?.startsWith("vault:"),
		),
		rawDetailsAbsent: items.every(
			(conflict) => !("rawDescription" in conflict || "details" in conflict),
		),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		crossTenantCount: crossTenant.ok ? crossTenant.data.items.length : -1,
	};
}

const expected = {
	summaries: ["Conflict A", "Conflict B", "Conflict C"],
	refsAreOpaque: true,
	rawDetailsAbsent: true,
	secondNextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	crossTenantCount: 0,
};

describe("Corporate Administration conflict-disclosure pagination parity", () => {
	it("uses stable tenant- and filter-bound keyset pages without exposing raw details in memory", async () => {
		const result = await runConflictPaginationScenario({
			store: createMemoryCorporateAdministrationOfficerComplianceStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-conflict-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination and privacy scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-conflict-pagination-${randomUUID()}`,
				);
				try {
					const result = await runConflictPaginationScenario({
						store: createDrizzleCorporateAdministrationOfficerComplianceStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caConflictDisclosure)
						.where(eq(caConflictDisclosure.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
