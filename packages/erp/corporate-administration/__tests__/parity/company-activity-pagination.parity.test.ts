// biome-ignore-all lint/performance/noAwaitInLoops: Versioned activity fixtures must advance aggregate versions sequentially.
import { randomUUID } from "node:crypto";

import {
	correlationIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationLegalCompanyStore } from "@afenda/corporate-administration/testing";
import { database as afendaDatabase, caCompanyActivity } from "@afenda/db";
import { describe, expect, it } from "vitest";
import type {
	CompanyActivityStore,
	LegalCompanyStore,
} from "../../src/features/company/store";
import { cleanupCorporateAdministrationInfrastructureTestData } from "../helpers/neon-cleanup";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

type ActivityPaginationStore = LegalCompanyStore & CompanyActivityStore;

const actorUserId = userIdSchema.parse("user-ca-activity-pagination");
const correlationId = correlationIdSchema.parse("corr-ca-activity-pagination");

async function runActivityPaginationScenario(input: {
	store: ActivityPaginationStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
	prepareActivities?: ((legalCompanyId: string) => Promise<void>) | undefined;
}) {
	const company = await input.store.registerLegalCompanyDraft({
		organizationId: input.organizationId,
		companyCode: "AF-ACTIVITY-CURSOR",
		normalizedCompanyCode: "AF-ACTIVITY-CURSOR",
		displayName: "Afenda Activity Cursor",
		masterDataPartyId: "party-ca-activity-cursor",
		homeJurisdictionCountryCode: "MY",
		sourceReference: "doc:company:activity-cursor",
		createdByUserId: actorUserId,
		createdAt: "2026-01-01T00:00:00.000Z",
		correlationId,
	});
	if (!company.ok) {
		throw new Error(
			"Activity pagination could not create its company fixture.",
		);
	}

	if (input.prepareActivities === undefined) {
		for (const [index, activity] of [
			{
				activityCode: "software_services",
				classification: "operational" as const,
				regulatorCode: null,
			},
			{
				activityCode: "trust_services",
				classification: "regulated" as const,
				regulatorCode: "SC",
			},
		].entries()) {
			const registered = await input.store.registerCompanyActivity({
				organizationId: input.organizationId,
				legalCompanyId: company.data.legalCompanyId,
				...activity,
				jurisdictionCode: "MY",
				description: activity.activityCode,
				effectivePeriod: { from: "2026-01-01", to: null },
				recordedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
				recordedByUserId: actorUserId,
				sourceDocumentId: `doc:activity:${index}`,
				expectedCompanyVersion: index + 1,
				correlationId,
			});
			if (!registered.ok) {
				throw new Error(
					`Activity pagination could not create an activity: ${registered.code}.`,
				);
			}
		}
	} else {
		await input.prepareActivities(company.data.legalCompanyId);
	}

	const first = await input.store.listCompanyActivitiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId: company.data.legalCompanyId,
		asOf: "2026-06-01",
		classificationSystem: "registered_activity",
		jurisdictionCode: "MY",
		pageSize: 1,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Activity pagination expected a second page.");
	}
	const second = await input.store.listCompanyActivitiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId: company.data.legalCompanyId,
		asOf: "2026-06-01",
		classificationSystem: "registered_activity",
		jurisdictionCode: "MY",
		pageSize: 1,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listCompanyActivitiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId: company.data.legalCompanyId,
		asOf: "2026-06-01",
		classificationSystem: "registered_activity",
		jurisdictionCode: "SG",
		pageSize: 1,
		cursor: first.data.nextCursor,
	});
	const primaryOnly = await input.store.listCompanyActivitiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId: company.data.legalCompanyId,
		asOf: "2026-06-01",
		primaryOnly: true,
		pageSize: 1,
	});

	return {
		activityCodes: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((item) => item.activityCode),
		nextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? null : crossScope.code,
		primaryOnlyCount: primaryOnly.ok ? primaryOnly.data.items.length : -1,
	};
}

const expected = {
	activityCodes: ["software_services", "trust_services"],
	nextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	primaryOnlyCount: 0,
};

describe("Corporate Administration company-activity pagination parity", () => {
	it("uses stable bounded keyset pages in memory", async () => {
		const result = await runActivityPaginationScenario({
			store:
				createMemoryCorporateAdministrationLegalCompanyStore() as ActivityPaginationStore,
			organizationId: organizationIdSchema.parse(
				"org-ca-activity-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory activity-pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-activity-pagination-${randomUUID()}`,
				);
				try {
					const result = await runActivityPaginationScenario({
						store: createDrizzleCorporateAdministrationLegalCompanyStore({
							database: afendaDatabase.client,
							createLegalCompanyId: randomUUID,
						}) as ActivityPaginationStore,
						organizationId,
						prepareActivities: async (legalCompanyId) => {
							await afendaDatabase.client.insert(caCompanyActivity).values([
								{
									id: randomUUID(),
									organizationId,
									legalCompanyId,
									classification: "operational",
									classificationSystem: "registered_activity",
									activityCode: "software_services",
									jurisdictionCode: "MY",
									regulatorCode: null,
									description: "software_services",
									isPrimary: false,
									effectiveFrom: "2026-01-01",
									effectiveTo: null,
									recordedAt: new Date("2026-01-01T00:00:00.000Z"),
									recordedFrom: new Date("2026-01-01T00:00:00.000Z"),
									recordedTo: null,
									recordedBy: actorUserId,
									sourceDocumentId: "doc:activity:0",
									status: "active",
									version: 1,
								},
								{
									id: randomUUID(),
									organizationId,
									legalCompanyId,
									classification: "regulated",
									classificationSystem: "registered_activity",
									activityCode: "trust_services",
									jurisdictionCode: "MY",
									regulatorCode: "SC",
									description: "trust_services",
									isPrimary: false,
									effectiveFrom: "2026-01-01",
									effectiveTo: null,
									recordedAt: new Date("2026-01-02T00:00:00.000Z"),
									recordedFrom: new Date("2026-01-02T00:00:00.000Z"),
									recordedTo: null,
									recordedBy: actorUserId,
									sourceDocumentId: "doc:activity:1",
									status: "active",
									version: 1,
								},
							]);
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
