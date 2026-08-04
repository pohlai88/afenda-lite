import {
	assertNoGovernanceMembershipConflict,
	canonicalDateSchema,
	canonicalInstantSchema,
	createGovernanceBodyInputSchema,
	governanceBodyIdSchema,
	governanceMembershipIdSchema,
	listGovernanceBodiesAsOfInputSchema,
	listGovernanceMembershipsAsOfInputSchema,
	normalizeGovernanceBodyCode,
	organizationIdSchema,
	userIdSchema,
	validateMembershipWithinBody,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationGovernanceStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import { legalCompanyIdSchema } from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-2-1");
const otherOrganizationId = organizationIdSchema.parse("org-ca-2-1-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000211",
);
const actorUserId = userIdSchema.parse("user-ca-2-1");
const recordedAt = canonicalInstantSchema.parse("2026-02-01T10:00:00.000Z");

describe("CA-2.1 governance contracts and rules", () => {
	it("keeps tenant and actor fields outside governance command input", () => {
		const parsed = createGovernanceBodyInputSchema.safeParse({
			legalCompanyId,
			bodyType: "board",
			bodyCode: "board-main",
			displayName: "Board of Directors",
			description: null,
			effectiveFrom: "2026-02-01",
			sourceDocumentId: "doc-board-1",
			expectedCompanyVersion: 1,
			organizationId,
			actorUserId,
		});
		expect(parsed.success).toBe(false);
	});

	it("bounds governance-body page sizes at the public query contract", () => {
		const base = {
			legalCompanyId,
			asOf: "2026-06-01",
		};
		expect(
			listGovernanceBodiesAsOfInputSchema.safeParse({
				...base,
				pageSize: 100,
			}).success,
		).toBe(true);
		expect(
			listGovernanceBodiesAsOfInputSchema.safeParse({
				...base,
				pageSize: 101,
			}).success,
		).toBe(false);
	});

	it("bounds governance-membership page sizes at the public query contract", () => {
		const base = {
			governanceBodyId: governanceBodyIdSchema.parse(
				"00000000-0000-4000-8000-000000000217",
			),
			asOf: "2026-06-01",
		};
		expect(
			listGovernanceMembershipsAsOfInputSchema.safeParse({
				...base,
				pageSize: 100,
			}).success,
		).toBe(true);
		expect(
			listGovernanceMembershipsAsOfInputSchema.safeParse({
				...base,
				pageSize: 101,
			}).success,
		).toBe(false);
	});

	it("normalizes governance body codes and constrains membership terms to body existence", () => {
		expect(normalizeGovernanceBodyCode(" board main / 2026 ")).toBe(
			"BOARDMAIN2026",
		);
		const body = {
			id: governanceBodyIdSchema.parse("00000000-0000-4000-8000-000000000212"),
			organizationId,
			legalCompanyId,
			bodyType: "board",
			bodyCode: "BOARD",
			normalizedBodyCode: "BOARD",
			displayName: "Board",
			description: null,
			effectiveFrom: canonicalDateSchema.parse("2026-02-01"),
			effectiveTo: canonicalDateSchema.parse("2026-12-31"),
			status: "active",
			retirementReason: null,
			recordedAt: new Date(recordedAt),
			recordedBy: actorUserId,
			sourceDocumentId: "doc-board-1",
			version: 1,
			createdAt: new Date(recordedAt),
			updatedAt: new Date(recordedAt),
		} as const;
		expect(
			validateMembershipWithinBody({
				body,
				term: {
					from: canonicalDateSchema.parse("2026-01-31"),
					to: canonicalDateSchema.parse("2026-03-01"),
				},
			}).ok,
		).toBe(false);
	});

	it("rejects duplicate active seats and concurrent chair overlap", () => {
		const membershipId = governanceMembershipIdSchema.parse(
			"00000000-0000-4000-8000-000000000213",
		);
		const existing = {
			id: membershipId,
			organizationId,
			legalCompanyId,
			governanceBodyId: governanceBodyIdSchema.parse(
				"00000000-0000-4000-8000-000000000214",
			),
			memberKind: "party",
			memberPartyId: "party-director-1",
			roleSeatCode: null,
			seatLabel: "Director",
			membershipRole: "member",
			votingEntitlement: "voting",
			isChair: true,
			termFrom: canonicalDateSchema.parse("2026-02-01"),
			termTo: null,
			status: "active",
			endReason: null,
			recordedAt: new Date(recordedAt),
			recordedBy: actorUserId,
			sourceDocumentId: "doc-appointment-1",
			version: 1,
			createdAt: new Date(recordedAt),
			updatedAt: new Date(recordedAt),
		} as const;
		expect(
			assertNoGovernanceMembershipConflict({
				candidate: {
					...existing,
					id: governanceMembershipIdSchema.parse(
						"00000000-0000-4000-8000-000000000215",
					),
					memberPartyId: "party-director-2",
				},
				existing: [existing],
			}).ok,
		).toBe(false);
		expect(
			assertNoGovernanceMembershipConflict({
				candidate: {
					...existing,
					id: governanceMembershipIdSchema.parse(
						"00000000-0000-4000-8000-000000000216",
					),
					isChair: false,
				},
				existing: [existing],
			}).ok,
		).toBe(false);
	});
});

describe("CA-2.1 memory governance store", () => {
	it("preserves tenant isolation, duplicate body constraints, as-of membership reads, and lifecycle endings", async () => {
		const store = createMemoryCorporateAdministrationGovernanceStore();
		const body = await store.createGovernanceBody({
			organizationId,
			legalCompanyId,
			bodyType: "board",
			bodyCode: "Board Main",
			normalizedBodyCode: "BOARDMAIN",
			displayName: "Board of Directors",
			description: null,
			effectiveFrom: canonicalDateSchema.parse("2026-02-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-board-1",
			expectedCompanyVersion: 1,
		});
		expect(body.ok).toBe(true);
		if (!body.ok) {
			return;
		}

		const duplicate = await store.createGovernanceBody({
			organizationId,
			legalCompanyId,
			bodyType: "board",
			bodyCode: "Board Main",
			normalizedBodyCode: "BOARDMAIN",
			displayName: "Duplicate Board",
			description: null,
			effectiveFrom: canonicalDateSchema.parse("2026-03-01"),
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-board-2",
			expectedCompanyVersion: 1,
		});
		expect(duplicate.ok).toBe(false);

		const crossTenant = await store.getGovernanceBody({
			organizationId: otherOrganizationId,
			governanceBodyId: body.data.id,
		});
		expect(crossTenant).toEqual({ ok: true, data: null });

		const appointed = await store.appointGovernanceMember({
			organizationId,
			legalCompanyId,
			governanceBodyId: body.data.id,
			memberKind: "party",
			memberPartyId: "party-director-1",
			roleSeatCode: null,
			seatLabel: "Chair",
			membershipRole: "member",
			votingEntitlement: "voting",
			isChair: true,
			termFrom: canonicalDateSchema.parse("2026-02-15"),
			termTo: null,
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-appointment-1",
			expectedBodyVersion: 1,
		});
		expect(appointed.ok).toBe(true);
		if (!appointed.ok) {
			return;
		}

		const before = await store.listGovernanceMembershipsAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-02-14"),
		});
		const after = await store.listGovernanceMembershipsAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-02-15"),
		});
		expect(before).toEqual({ ok: true, data: [] });
		expect(after.ok && after.data).toHaveLength(1);

		const additional = await Promise.all(
			["Alpha Director", "Zulu Director"].map((seatLabel, index) =>
				store.appointGovernanceMember({
					organizationId,
					legalCompanyId,
					governanceBodyId: body.data.id,
					memberKind: "party",
					memberPartyId: `party-director-${index + 2}`,
					roleSeatCode: null,
					seatLabel,
					membershipRole: "member",
					votingEntitlement: "voting",
					isChair: false,
					termFrom: canonicalDateSchema.parse("2026-02-15"),
					termTo: null,
					recordedAt,
					recordedBy: actorUserId,
					sourceDocumentId: `doc-appointment-${index + 2}`,
					expectedBodyVersion: 1,
				}),
			),
		);
		expect(additional.every((result) => result.ok)).toBe(true);
		const firstPage = await store.listGovernanceMembershipPageAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-05-01"),
			pageSize: 2,
		});
		expect(firstPage.ok).toBe(true);
		if (!firstPage.ok || firstPage.data.nextCursor === null) {
			return;
		}
		expect(firstPage.data.items.map((item) => item.seatLabel)).toEqual([
			"Chair",
			"Alpha Director",
		]);
		const secondPage = await store.listGovernanceMembershipPageAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-05-01"),
			pageSize: 2,
			cursor: firstPage.data.nextCursor,
		});
		expect(
			secondPage.ok
				? {
						seats: secondPage.data.items.map((item) => item.seatLabel),
						nextCursor: secondPage.data.nextCursor,
					}
				: secondPage,
		).toEqual({ seats: ["Zulu Director"], nextCursor: null });
		const crossScope = await store.listGovernanceMembershipPageAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-05-01"),
			memberPartyId: "party-director-1",
			pageSize: 2,
			cursor: firstPage.data.nextCursor,
		});
		expect(crossScope.ok ? "unexpected-success" : crossScope.code).toBe(
			"VALIDATION_ERROR",
		);

		const ended = await store.endGovernanceMembership({
			organizationId,
			governanceMembershipId: appointed.data.id,
			endedOn: canonicalDateSchema.parse("2026-06-01"),
			reason: "Term ended",
			recordedAt,
			recordedBy: actorUserId,
			sourceDocumentId: "doc-end-1",
			expectedVersion: 1,
		});
		expect(ended.ok && ended.data.status).toBe("ended");
		const endedAsOf = await store.listGovernanceMembershipsAsOf({
			organizationId,
			governanceBodyId: body.data.id,
			asOf: canonicalDateSchema.parse("2026-06-01"),
		});
		expect(
			endedAsOf.ok
				? endedAsOf.data.map((membership) => membership.seatLabel)
				: endedAsOf,
		).toEqual(["Alpha Director", "Zulu Director"]);
	});
});
