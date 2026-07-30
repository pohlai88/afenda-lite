import {
	calculateResolutionExecutionStatus,
	calculateVoteOutcome,
	canonicalDateSchema,
	canonicalInstantSchema,
	organizationIdSchema,
	recordMeetingVoteInputSchema,
	requiredVotesForThreshold,
	userIdSchema,
} from "@afenda/corporate-administration";
import { createMemoryCorporateAdministrationResolutionStore } from "@afenda/corporate-administration/testing";
import { describe, expect, it } from "vitest";
import {
	governanceMeetingIdSchema,
	legalCompanyIdSchema,
} from "../../src/kernel/brands";

const organizationId = organizationIdSchema.parse("org-ca-2-5");
const otherOrganizationId = organizationIdSchema.parse("org-ca-2-5-other");
const legalCompanyId = legalCompanyIdSchema.parse(
	"00000000-0000-4000-8000-000000000251",
);
const governanceMeetingId = governanceMeetingIdSchema.parse(
	"00000000-0000-4000-8000-000000000252",
);
const actorUserId = userIdSchema.parse("user-ca-2-5");
const recordedAt = canonicalInstantSchema.parse("2026-05-01T10:00:00.000Z");
const digest =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("CA-2.5 vote and resolution contracts", () => {
	it("keeps tenant and actor facts outside vote command input", () => {
		const parsed = recordMeetingVoteInputSchema.safeParse({
			governanceMeetingId,
			motionCode: "APPROVE-BANK-SIGNATORY",
			eligibleVotes: 3,
			votesFor: 2,
			votesAgainst: 1,
			abstentions: 0,
			thresholdType: "simple_majority",
			outcomeBasis: "Board majority",
			sourceDocumentId: "doc-vote-1",
			expectedMeetingVersion: 1,
			organizationId,
			actorUserId,
		});

		expect(parsed.success).toBe(false);
	});

	it("calculates threshold requirements and rejects overcast votes", () => {
		expect(
			requiredVotesForThreshold({
				eligibleVotes: 5,
				thresholdType: "simple_majority",
			}),
		).toEqual({ ok: true, data: 3 });
		expect(
			requiredVotesForThreshold({
				eligibleVotes: 5,
				thresholdType: "supermajority",
			}),
		).toEqual({ ok: true, data: 4 });
		expect(
			requiredVotesForThreshold({
				eligibleVotes: 5,
				thresholdType: "unanimous",
			}),
		).toEqual({ ok: true, data: 5 });
		expect(
			calculateVoteOutcome({
				eligibleVotes: 5,
				votesFor: 3,
				votesAgainst: 1,
				abstentions: 2,
				thresholdType: "simple_majority",
			}).ok,
		).toBe(false);
	});
});

describe("CA-2.5 memory resolution store", () => {
	it("preserves vote, resolution, action and minutes evidence by tenant", async () => {
		const store = createMemoryCorporateAdministrationResolutionStore();
		const voteOutcome = calculateVoteOutcome({
			eligibleVotes: 3,
			votesFor: 2,
			votesAgainst: 1,
			abstentions: 0,
			thresholdType: "simple_majority",
		});
		expect(voteOutcome.ok).toBe(true);
		if (!voteOutcome.ok) {
			return;
		}

		const vote = await store.recordMeetingVote({
			organizationId,
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
		expect(vote.ok && vote.data.outcome).toBe("adopted");
		if (!vote.ok) {
			return;
		}

		const crossTenantVote = await store.getMeetingVote({
			organizationId: otherOrganizationId,
			meetingVoteId: vote.data.id,
		});
		expect(crossTenantVote).toEqual({ ok: true, data: null });

		const resolution = await store.recordResolution({
			organizationId,
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
		expect(resolution.ok && resolution.data.status).toBe("adopted");
		if (!resolution.ok) {
			return;
		}

		const listed = await store.listResolutionsAsOf({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-05-02"),
			status: "adopted",
		});
		expect(listed.ok && listed.data).toHaveLength(1);

		const writtenOutcome = calculateVoteOutcome({
			eligibleVotes: 3,
			votesFor: 3,
			votesAgainst: 0,
			abstentions: 0,
			thresholdType: "unanimous",
		});
		expect(writtenOutcome).toEqual({
			ok: true,
			data: { requiredFor: 3, outcome: "adopted" },
		});

		const action = await store.assignResolutionAction({
			organizationId,
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
		expect(action.ok && action.data.status).toBe("assigned");
		if (!action.ok) {
			return;
		}

		const overdue = await store.listOverdueResolutionActions({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-05-06"),
		});
		expect(overdue.ok && overdue.data).toHaveLength(1);

		const completed = await store.completeResolutionAction({
			organizationId,
			resolutionActionId: action.data.id,
			completedAt: new Date("2026-05-04T09:00:00.000Z"),
			evidenceDocumentId: "doc-bank-mandate-filed",
			completionNotes: "Bank mandate filed with evidence.",
			sourceDocumentId: "doc-action-complete-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(completed.ok && completed.data.evidenceDocumentId).toBe(
			"doc-bank-mandate-filed",
		);
		if (!completed.ok) {
			return;
		}

		const staleCompletion = await store.completeResolutionAction({
			organizationId,
			resolutionActionId: action.data.id,
			completedAt: new Date("2026-05-04T10:00:00.000Z"),
			evidenceDocumentId: "doc-duplicate",
			completionNotes: null,
			sourceDocumentId: "doc-action-complete-2",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(staleCompletion.ok).toBe(false);

		const execution = calculateResolutionExecutionStatus({
			resolution: resolution.data,
			actions: [completed.data],
			asOf: canonicalDateSchema.parse("2026-05-06"),
		});
		expect(execution).toMatchObject({
			totalActions: 1,
			completedActions: 1,
			overdueActions: 0,
			complete: true,
		});

		const minutes = await store.recordMinutesDocument({
			organizationId,
			resolutionId: resolution.data.id,
			minutesDocumentId: "doc-minutes-1",
			sourceDocumentId: "doc-minutes-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 1,
		});
		expect(minutes.ok && minutes.data.minutesDocumentId).toBe("doc-minutes-1");
		if (!minutes.ok) {
			return;
		}

		const successor = await store.recordResolution({
			organizationId,
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
		expect(successor.ok).toBe(true);
		if (!successor.ok) {
			return;
		}

		const superseded = await store.supersedeResolution({
			organizationId,
			resolutionId: resolution.data.id,
			supersededByResolutionId: successor.data.id,
			sourceDocumentId: "doc-supersession-1",
			recordedAt,
			recordedBy: actorUserId,
			expectedVersion: 2,
		});
		expect(superseded.ok && superseded.data.status).toBe("superseded");
	});
});
