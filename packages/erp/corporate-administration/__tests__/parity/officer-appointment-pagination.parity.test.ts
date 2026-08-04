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
import {
	database as afendaDatabase,
	caOfficerAppointment,
	caStatutoryOffice,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { OfficerStore } from "../../src/features/officers/store";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000693",
);
const actorUserId = userIdSchema.parse("user-ca-officer-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-01-01T00:00:00.000Z");
const asOf = canonicalDateSchema.parse("2026-06-01");

async function runOfficerAppointmentPaginationScenario(input: {
	store: OfficerStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const office = await input.store.defineStatutoryOffice({
		organizationId: input.organizationId,
		legalCompanyId,
		officeTypeCode: "DIRECTOR",
		jurisdictionCode: "MY",
		displayName: "Director",
		description: null,
		required: true,
		minimumHolders: 1,
		maximumHolders: 5,
		vacancyGraceDays: 30,
		protectedRole: false,
		effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
		recordedAt,
		recordedBy: actorUserId,
		sourceDocumentId: "doc:officer-pagination:office",
		expectedCompanyVersion: 1,
	});
	if (!office.ok) {
		throw new Error(`Could not create statutory office: ${office.code}.`);
	}

	for (const [index, fixture] of [
		["party-officer-one", "2026-01-10"],
		["party-officer-two", "2026-02-10"],
		["party-officer-three", "2026-03-10"],
	].entries()) {
		const created = await input.store.appointOfficer({
			organizationId: input.organizationId,
			legalCompanyId,
			statutoryOfficeId: office.data.id,
			officerPartyId: fixture[0],
			appointmentMethod: "board_resolution",
			appointingAuthorityType: "governance_body",
			appointingAuthorityId: "board-main",
			consentDocumentId: `doc:officer-pagination:consent:${index}`,
			sourceDocumentId: `doc:officer-pagination:appointment:${index}`,
			effectiveFrom: canonicalDateSchema.parse(fixture[1]),
			effectiveTo: null,
			recordedAt,
			recordedBy: actorUserId,
			expectedOfficeVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create officer appointment: ${created.code}.`);
		}
	}

	const first = await input.store.listOfficersAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second officer-appointment page.");
	}
	const second = await input.store.listOfficersAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listOfficersAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		officerPartyId: "party-officer-one",
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossTenant = await input.store.listOfficersAsOf({
		organizationId: organizationIdSchema.parse(`${input.organizationId}-other`),
		legalCompanyId,
		asOf,
		pageSize: 100,
	});

	return {
		parties: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((appointment) => appointment.officerPartyId),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		crossTenantCount: crossTenant.ok ? crossTenant.data.items.length : -1,
	};
}

const expected = {
	parties: ["party-officer-one", "party-officer-two", "party-officer-three"],
	secondNextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	crossTenantCount: 0,
};

describe("Corporate Administration officer-appointment pagination parity", () => {
	it("uses stable tenant- and filter-bound keyset pages in memory", async () => {
		const result = await runOfficerAppointmentPaginationScenario({
			store: createMemoryCorporateAdministrationOfficerStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-officer-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-officer-pagination-${randomUUID()}`,
				);
				try {
					const result = await runOfficerAppointmentPaginationScenario({
						store: createDrizzleCorporateAdministrationOfficerStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caOfficerAppointment)
						.where(eq(caOfficerAppointment.organizationId, organizationId));
					await afendaDatabase.client
						.delete(caStatutoryOffice)
						.where(eq(caStatutoryOffice.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
