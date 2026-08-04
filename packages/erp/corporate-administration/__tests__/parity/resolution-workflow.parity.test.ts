import { randomUUID } from "node:crypto";

import {
	calculateResolutionExecutionStatus,
	calculateVoteOutcome,
	canonicalDateSchema,
	canonicalInstantSchema,
	organizationIdSchema,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createDrizzleCorporateAdministrationResolutionStore } from "@afenda/corporate-administration/adapters/drizzle";
import { createMemoryCorporateAdministrationResolutionStore } from "@afenda/corporate-administration/testing";
import {
	database as afendaDatabase,
	caMeetingVote,
	caResolution,
	caResolutionAction,
	eq,
} from "@afenda/db";
import { describe, expect, it } from "vitest";
import type { ResolutionStore } from "../../src/features/resolutions/store";
import {
	governanceMeetingIdSchema,
	legalCompanyIdSchema,
} from "../../src/kernel/brands";
import {
	CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON,
	RUN_CORPORATE_ADMINISTRATION_NEON_PARITY,
} from "../helpers/neon-parity";

const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000751",
);
const governanceMeetingId = governanceMeetingIdSchema.parse(
	"00000000-0000-4000-8000-000000000752",
);
const actorUserId = userIdSchema.parse("user-ca-resolution-parity");
const recordedAt = canonicalInstantSchema.parse("2026-05-01T10:00:00.000Z");
const digest =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

async function runResolutionWorkflowScenario(input: {
	store: ResolutionStore;
	organizationId: ReturnType<typeof organizationIdSchema.parse>;
	otherOrganizationId: ReturnType<typeof organizationIdSchema.parse>;
}) {
	const voteOutcome = calculateVoteOutcome({
		eligibleVotes: 3,
		votesFor: 2,
		votesAgainst: 1,
		abstentions: 0,
		thresholdType: "simple_majority",
	});
	if (!voteOutcome.ok) {
		throw new Error("Resolution parity expected an adopted vote outcome.");
	}

	const vote = await input.store.recordMeetingVote({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceMeetingId,
		motionCode: "APPROVE-BANK-SIGNATORY",
		eligibleVotes: 3,
		votesFor: 2,
		votesAgainst: 1,
		abstentions: 0,
		thresholdType: "simple_majority",
		requiredFor: voteOutcome.data.requiredFor,
		outcome: voteOutcome.data.outcome,
		outcomeBasis: "Board simple majority",
		sourceDocumentId: "doc-vote-1",
		recordedAt,
		recordedBy: actorUserId,
		expectedMeetingVersion: 1,
	});
	if (!vote.ok) {
		throw new Error(`Could not record meeting vote: ${vote.code}.`);
	}

	const crossTenantVote = await input.store.getMeetingVote({
		organizationId: input.otherOrganizationId,
		meetingVoteId: vote.data.id,
	});

	const resolution = await input.store.recordResolution({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceMeetingId,
		meetingVoteId: vote.data.id,
		approvalBasis: "meeting_vote",
		status: "adopted",
		resolutionCode: "RES-BANK-SIGNATORY-2026",
		title: "Approve bank signatory",
		textDigest: digest,
		documentId: "doc-resolution-1",
		effectiveFrom: canonicalDateSchema.parse("2026-05-01"),
		approvedAt: new Date("2026-05-01T10:15:00.000Z"),
		rejectedAt: null,
		sourceDocumentId: "doc-resolution-1",
		recordedAt,
		recordedBy: actorUserId,
	});
	if (!resolution.ok) {
		throw new Error(`Could not record resolution: ${resolution.code}.`);
	}

	const listed = await input.store.listResolutionsAsOf({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: canonicalDateSchema.parse("2026-05-02"),
		status: "adopted",
	});
	if (!listed.ok) {
		throw new Error(`Could not list resolutions: ${listed.code}.`);
	}

	const action = await input.store.assignResolutionAction({
		organizationId: input.organizationId,
		legalCompanyId,
		resolutionId: resolution.data.id,
		actionTypeCode: "FILE-BANK-MANDATE",
		assigneePartyId: "party-secretary-1",
		dueOn: canonicalDateSchema.parse("2026-05-05"),
		sourceDocumentId: "doc-action-1",
		recordedAt,
		recordedBy: actorUserId,
		expectedResolutionVersion: 1,
	});
	if (!action.ok) {
		throw new Error(`Could not assign resolution action: ${action.code}.`);
	}

	const overdue = await input.store.listOverdueResolutionActions({
		organizationId: input.organizationId,
		legalCompanyId,
		asOf: canonicalDateSchema.parse("2026-05-06"),
	});
	if (!overdue.ok) {
		throw new Error(`Could not list overdue actions: ${overdue.code}.`);
	}

	const completed = await input.store.completeResolutionAction({
		organizationId: input.organizationId,
		resolutionActionId: action.data.id,
		completedAt: new Date("2026-05-04T09:00:00.000Z"),
		evidenceDocumentId: "doc-bank-mandate-filed",
		completionNotes: "Bank mandate filed with evidence.",
		sourceDocumentId: "doc-action-complete-1",
		recordedAt,
		recordedBy: actorUserId,
		expectedVersion: 1,
	});
	if (!completed.ok) {
		throw new Error(`Could not complete resolution action: ${completed.code}.`);
	}

	const staleCompletion = await input.store.completeResolutionAction({
		organizationId: input.organizationId,
		resolutionActionId: action.data.id,
		completedAt: new Date("2026-05-04T10:00:00.000Z"),
		evidenceDocumentId: "doc-duplicate",
		completionNotes: null,
		sourceDocumentId: "doc-action-complete-2",
		recordedAt,
		recordedBy: actorUserId,
		expectedVersion: 1,
	});

	const executionStatus = calculateResolutionExecutionStatus({
		resolution: resolution.data,
		actions: [completed.data],
		asOf: canonicalDateSchema.parse("2026-05-06"),
	});

	const minutes = await input.store.recordMinutesDocument({
		organizationId: input.organizationId,
		resolutionId: resolution.data.id,
		minutesDocumentId: "doc-minutes-1",
		sourceDocumentId: "doc-minutes-1",
		recordedAt,
		recordedBy: actorUserId,
		expectedVersion: 1,
	});
	if (!minutes.ok) {
		throw new Error(`Could not record minutes: ${minutes.code}.`);
	}

	const successor = await input.store.recordResolution({
		organizationId: input.organizationId,
		legalCompanyId,
		governanceMeetingId: null,
		meetingVoteId: null,
		approvalBasis: "written_resolution",
		status: "adopted",
		resolutionCode: "RES-BANK-SIGNATORY-2026-B",
		title: "Approve replacement bank signatory",
		textDigest: digest,
		documentId: "doc-resolution-2",
		effectiveFrom: canonicalDateSchema.parse("2026-06-01"),
		approvedAt: new Date("2026-06-01T10:00:00.000Z"),
		rejectedAt: null,
		sourceDocumentId: "doc-resolution-2",
		recordedAt,
		recordedBy: actorUserId,
	});
	if (!successor.ok) {
		throw new Error(
			`Could not record successor resolution: ${successor.code}.`,
		);
	}

	const superseded = await input.store.supersedeResolution({
		organizationId: input.organizationId,
		resolutionId: resolution.data.id,
		supersededByResolutionId: successor.data.id,
		sourceDocumentId: "doc-supersession-1",
		recordedAt,
		recordedBy: actorUserId,
		expectedVersion: 2,
	});
	if (!superseded.ok) {
		throw new Error(`Could not supersede resolution: ${superseded.code}.`);
	}

	return {
		voteOutcome: vote.data.outcome,
		crossTenantVote: crossTenantVote.ok ? crossTenantVote.data : "error",
		listedCodes: listed.data.map((item) => item.resolutionCode),
		overdueActionTypes: overdue.data.map((item) => item.actionTypeCode),
		completedEvidence: completed.data.evidenceDocumentId,
		staleCompletionCode: staleCompletion.ok
			? "unexpected-success"
			: staleCompletion.code,
		execution: {
			status: executionStatus.status,
			totalActions: executionStatus.totalActions,
			completedActions: executionStatus.completedActions,
			overdueActions: executionStatus.overdueActions,
			complete: executionStatus.complete,
		},
		minutesDocumentId: minutes.data.minutesDocumentId,
		supersededStatus: superseded.data.status,
	};
}

const expected = {
	voteOutcome: "adopted",
	crossTenantVote: null,
	listedCodes: ["RES-BANK-SIGNATORY-2026"],
	overdueActionTypes: ["FILE-BANK-MANDATE"],
	completedEvidence: "doc-bank-mandate-filed",
	staleCompletionCode: "CONFLICT",
	execution: {
		status: "adopted",
		totalActions: 1,
		completedActions: 1,
		overdueActions: 0,
		complete: true,
	},
	minutesDocumentId: "doc-minutes-1",
	supersededStatus: "superseded",
};

async function cleanupResolutionOrganization(
	organizationId: ReturnType<typeof organizationIdSchema.parse>,
) {
	await afendaDatabase.client
		.delete(caResolutionAction)
		.where(eq(caResolutionAction.organizationId, organizationId));
	await afendaDatabase.client
		.delete(caResolution)
		.where(eq(caResolution.organizationId, organizationId));
	await afendaDatabase.client
		.delete(caMeetingVote)
		.where(eq(caMeetingVote.organizationId, organizationId));
}

describe("Corporate Administration resolution workflow parity", () => {
	it("preserves vote → resolution → action → minutes → supersession in memory", async () => {
		const result = await runResolutionWorkflowScenario({
			store: createMemoryCorporateAdministrationResolutionStore(),
			organizationId: organizationIdSchema.parse(
				"org-ca-resolution-parity-memory",
			),
			otherOrganizationId: organizationIdSchema.parse(
				"org-ca-resolution-parity-memory-other",
			),
		});
		expect(result).toEqual(expected);
	});

	describe.skipIf(!RUN_CORPORATE_ADMINISTRATION_NEON_PARITY)(
		`Neon (${CORPORATE_ADMINISTRATION_NEON_PARITY_SKIP_REASON})`,
		() => {
			it("matches the memory resolution workflow scenario", async () => {
				const organizationId = organizationIdSchema.parse(
					`org-ca-resolution-parity-${randomUUID()}`,
				);
				const otherOrganizationId = organizationIdSchema.parse(
					`org-ca-resolution-parity-other-${randomUUID()}`,
				);
				try {
					const result = await runResolutionWorkflowScenario({
						store: createDrizzleCorporateAdministrationResolutionStore({
							database: afendaDatabase.client,
							createId: randomUUID,
						}),
						organizationId,
						otherOrganizationId,
					});
					expect(result).toEqual(expected);
				} finally {
					await cleanupResolutionOrganization(organizationId);
				}
			}, 30_000);
		},
	);
});
