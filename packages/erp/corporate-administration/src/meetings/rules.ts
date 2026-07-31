import { errorResult, type Result } from "@afenda/errors";
import type { GovernanceMembership } from "../governance/types";
import type { CanonicalDate } from "../kernel/dates";
import type {
	GovernanceMeeting,
	MeetingNotice,
	MeetingParticipant,
	MeetingQuorumResult,
	QuorumRuleSnapshot,
} from "./types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function datePart(value: Date): CanonicalDate {
	return value.toISOString().slice(0, 10) as CanonicalDate;
}

export function isNoticeTimely(input: {
	meeting: GovernanceMeeting;
	issuedAt: Date;
}): boolean {
	const days =
		(input.meeting.scheduledStartAt.getTime() - input.issuedAt.getTime()) /
		ONE_DAY_MS;
	return days >= input.meeting.noticePeriodDays;
}

export function hasNoticeSatisfied(input: {
	notices: readonly MeetingNotice[];
	membershipId: string;
}): boolean {
	return input.notices.some(
		(notice) =>
			notice.recipientMembershipId === input.membershipId &&
			(notice.status === "delivered" || notice.status === "waived"),
	);
}

export function calculateMeetingQuorum(input: {
	meeting: GovernanceMeeting;
	memberships: readonly GovernanceMembership[];
	participants: readonly MeetingParticipant[];
	ruleCode: string;
	requiredPresentCount: number;
	eligibleVotingOnly: boolean;
	noQuorumReason?: string | null;
}): Result<
	Readonly<{
		ruleSnapshot: QuorumRuleSnapshot;
		eligibleMemberCount: number;
		presentMemberCount: number;
		requiredPresentCount: number;
		hasQuorum: boolean;
		noQuorumReason: string | null;
	}>
> {
	const eligibleMemberships = input.memberships.filter(
		(membership) =>
			!input.eligibleVotingOnly || membership.votingEntitlement === "voting",
	);
	const eligibleIds = new Set(
		eligibleMemberships.map((membership) => membership.id),
	);
	const presentMemberCount = input.participants.filter(
		(participant) =>
			eligibleIds.has(participant.governanceMembershipId) &&
			(participant.attendanceStatus === "present" ||
				participant.attendanceStatus === "represented"),
	).length;
	const hasQuorum = presentMemberCount >= input.requiredPresentCount;
	const noQuorumReason = input.noQuorumReason ?? null;
	if (!hasQuorum && noQuorumReason === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration no-quorum reason is required.",
		});
	}
	if (input.requiredPresentCount > eligibleMemberships.length) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Corporate Administration quorum requirement exceeds eligible membership.",
		});
	}
	return errorResult.ok({
		ruleSnapshot: {
			ruleCode: input.ruleCode,
			asOfDate: datePart(input.meeting.scheduledStartAt),
			eligibleMemberCount: eligibleMemberships.length,
			requiredPresentCount: input.requiredPresentCount,
			eligibleVotingOnly: input.eligibleVotingOnly,
		},
		eligibleMemberCount: eligibleMemberships.length,
		presentMemberCount,
		requiredPresentCount: input.requiredPresentCount,
		hasQuorum,
		noQuorumReason: hasQuorum ? null : noQuorumReason,
	});
}

export function canCloseMeeting(input: {
	meeting: GovernanceMeeting;
	quorumResult: MeetingQuorumResult | null;
}): Result<void> {
	if (input.meeting.status !== "open" && input.meeting.status !== "adjourned") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration meeting cannot be closed from its current state.",
		});
	}
	if (input.quorumResult === null) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Corporate Administration meeting requires quorum evidence before close.",
		});
	}
	return errorResult.ok(undefined);
}
