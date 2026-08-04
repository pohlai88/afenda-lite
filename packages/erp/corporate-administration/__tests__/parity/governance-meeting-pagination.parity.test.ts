// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	canonicalInstantSchema,
	governanceBodyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationMeetingStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationMeetingStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	caGovernanceMeeting,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { MeetingStore } from "../../src/features/meetings/store";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000697",
);
const governanceBodyId = governanceBodyIdSchema.parse(
	"00000000-0000-4000-8000-000000000807",
);
const otherGovernanceBodyId = governanceBodyIdSchema.parse(
	"00000000-0000-4000-8000-000000000808",
);
const actorUserId = userIdSchema.parse("user-ca-meeting-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-04-01T00:00:00.000Z");

async function runGovernanceMeetingPaginationScenario(input: {
	store: MeetingStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const fixtures = [
		["Meeting A", "2026-04-10T09:00:00.000Z", governanceBodyId],
		["Meeting B", "2026-04-11T09:00:00.000Z", governanceBodyId],
		["Meeting C", "2026-04-12T09:00:00.000Z", governanceBodyId],
		["Other body", "2026-04-13T09:00:00.000Z", otherGovernanceBodyId],
	] as const;
	for (const [index, fixture] of fixtures.entries()) {
		const created = await input.store.scheduleGovernanceMeeting({
			organizationId: input.organizationId,
			legalCompanyId,
			governanceBodyId: fixture[2],
			procedureType: "physical",
			title: fixture[0],
			scheduledStartAt: new Date(fixture[1]),
			scheduledEndAt: new Date(new Date(fixture[1]).getTime() + 60 * 60 * 1000),
			noticePeriodDays: 7,
			locationSummary: "Board room",
			remoteAccessSummary: null,
			sourceDocumentId: `doc:meeting-pagination:${index + 1}`,
			recordedAt,
			recordedBy: actorUserId,
			expectedBodyVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not schedule meeting: ${created.code}.`);
		}
	}

	const first = await input.store.listGovernanceMeetings({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceBodyId,
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second governance-meeting page.");
	}
	const second = await input.store.listGovernanceMeetings({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceBodyId,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossScope = await input.store.listGovernanceMeetings({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceBodyId,
		status: "scheduled",
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const crossTenant = await input.store.listGovernanceMeetings({
		organizationId: organizationIdSchema.parse(`${input.organizationId}-other`),
		legalCompanyId,
		governanceBodyId,
		pageSize: 100,
	});

	return {
		titles: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((meeting) => meeting.title),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		crossTenantCount: crossTenant.ok ? crossTenant.data.items.length : -1,
	};
}

const expected = {
	titles: ["Meeting A", "Meeting B", "Meeting C"],
	secondNextCursor: null,
	crossScopeCode: "VALIDATION_ERROR",
	crossTenantCount: 0,
};

describe("Corporate Administration governance-meeting pagination parity", () => {
	it("uses stable tenant- and filter-bound keyset pages in memory", async () => {
		const result = await runGovernanceMeetingPaginationScenario({
			store: createMemoryCorporateAdministrationMeetingStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-meeting-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-meeting-pagination-${randomUUID()}`,
				);
				try {
					const result = await runGovernanceMeetingPaginationScenario({
						store: createDrizzleCorporateAdministrationMeetingStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caGovernanceMeeting)
						.where(eq(caGovernanceMeeting.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
