// biome-ignore-all lint/performance/noAwaitInLoops: Ordered fixtures make cross-adapter pagination evidence deterministic.
import { randomUUID } from "node:crypto";

import {
	canonicalDateSchema,
	canonicalInstantSchema,
	type governanceBodyIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationGovernanceStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationGovernanceStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	caGovernanceBody,
	caGovernanceMembership,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { GovernanceStore } from "../../src/features/governance/store";
import { legalCompanyIdSchema } from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000691",
);
const actorUserId = userIdSchema.parse("user-ca-governance-pagination");
const recordedAt = canonicalInstantSchema.parse("2026-01-01T00:00:00.000Z");
const asOf = canonicalDateSchema.parse("2026-06-01");

async function runGovernanceBodyPaginationScenario(input: {
	store: GovernanceStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	let boardId: ReturnType<typeof governanceBodyIdSchema.parse> | undefined;
	for (const [index, fixture] of [
		["committee", "RISK", "Risk Committee"],
		["board", "BOARD", "Board of Directors"],
		["committee", "AUDIT", "Audit Committee"],
	].entries()) {
		const created = await input.store.createGovernanceBody({
			organizationId: input.organizationId,
			legalCompanyId,
			bodyType: fixture[0],
			bodyCode: fixture[1],
			normalizedBodyCode: fixture[1],
			displayName: fixture[2],
			description: null,
			effectiveFrom: canonicalDateSchema.parse("2026-01-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: `doc:governance-pagination:${index}`,
			expectedCompanyVersion: 1,
		});
		if (!created.ok) {
			throw new Error(`Could not create governance body: ${created.code}.`);
		}
		if (fixture[0] === "board") {
			boardId = created.data.id;
		}
	}
	if (boardId === undefined) {
		throw new Error("Governance pagination requires a board fixture.");
	}

	for (const [index, fixture] of [
		["party-chair", "Chair", true],
		["party-zulu", "Zulu Director", false],
		["party-alpha", "Alpha Director", false],
	].entries()) {
		const appointed = await input.store.appointGovernanceMember({
			organizationId: input.organizationId,
			legalCompanyId,
			governanceBodyId: boardId,
			memberKind: "party",
			memberPartyId: fixture[0],
			roleSeatCode: null,
			seatLabel: fixture[1],
			membershipRole: "member",
			votingEntitlement: "voting",
			isChair: fixture[2],
			termFrom: canonicalDateSchema.parse("2026-01-01"),
			termTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: `doc:governance-membership-pagination:${index}`,
			expectedBodyVersion: 1,
		});
		if (!appointed.ok) {
			throw new Error(
				`Could not create governance membership: ${appointed.code}.`,
			);
		}
	}

	const first = await input.store.listGovernanceBodiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
	});
	if (!first.ok || first.data.nextCursor === null) {
		throw new Error("Expected a second governance-body page.");
	}
	const second = await input.store.listGovernanceBodiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const committees = await input.store.listGovernanceBodiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		bodyType: "committee",
		pageSize: 100,
	});
	const crossScope = await input.store.listGovernanceBodiesAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf,
		includeRetired: true,
		pageSize: 2,
		cursor: first.data.nextCursor,
	});
	const membershipFirst = await input.store.listGovernanceMembershipPageAsOf({
		organizationId: input.organizationId,
		governanceBodyId: boardId,
		asOf,
		pageSize: 2,
	});
	if (!membershipFirst.ok || membershipFirst.data.nextCursor === null) {
		throw new Error("Expected a second governance-membership page.");
	}
	const membershipSecond = await input.store.listGovernanceMembershipPageAsOf({
		organizationId: input.organizationId,
		governanceBodyId: boardId,
		asOf,
		pageSize: 2,
		cursor: membershipFirst.data.nextCursor,
	});
	const membershipCrossScope =
		await input.store.listGovernanceMembershipPageAsOf({
			organizationId: input.organizationId,
			governanceBodyId: boardId,
			asOf,
			memberPartyId: "party-chair",
			pageSize: 2,
			cursor: membershipFirst.data.nextCursor,
		});

	return {
		orderedNames: [first, second]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((body) => body.displayName),
		secondNextCursor: second.ok ? second.data.nextCursor : "error",
		committeeNames: committees.ok
			? committees.data.items.map((body) => body.displayName)
			: [],
		crossScopeCode: crossScope.ok ? "unexpected-success" : crossScope.code,
		orderedMembershipSeats: [membershipFirst, membershipSecond]
			.flatMap((result) => (result.ok ? result.data.items : []))
			.map((membership) => membership.seatLabel),
		membershipSecondNextCursor: membershipSecond.ok
			? membershipSecond.data.nextCursor
			: "error",
		membershipCrossScopeCode: membershipCrossScope.ok
			? "unexpected-success"
			: membershipCrossScope.code,
	};
}

const expected = {
	orderedNames: ["Board of Directors", "Audit Committee", "Risk Committee"],
	secondNextCursor: null,
	committeeNames: ["Audit Committee", "Risk Committee"],
	crossScopeCode: "VALIDATION_ERROR",
	orderedMembershipSeats: ["Chair", "Alpha Director", "Zulu Director"],
	membershipSecondNextCursor: null,
	membershipCrossScopeCode: "VALIDATION_ERROR",
};

describe("Corporate Administration governance pagination parity", () => {
	it("uses stable scope-bound keyset pages in memory", async () => {
		const result = await runGovernanceBodyPaginationScenario({
			store: createMemoryCorporateAdministrationGovernanceStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-governance-pagination-memory",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory pagination scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-governance-pagination-${randomUUID()}`,
				);
				try {
					const result = await runGovernanceBodyPaginationScenario({
						store: createDrizzleCorporateAdministrationGovernanceStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await afendaDatabase.client
						.delete(caGovernanceMembership)
						.where(eq(caGovernanceMembership.organizationId, organizationId));
					await afendaDatabase.client
						.delete(caGovernanceBody)
						.where(eq(caGovernanceBody.organizationId, organizationId));
				}
			}, 30_000);
		},
	);
});
