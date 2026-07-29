import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../error-codes";
import type { CanonicalDate } from "../kernel/dates";
import type {
	MeetingVote,
	Resolution,
	ResolutionAction,
	ResolutionExecutionStatus,
	VoteThresholdType,
} from "./types";

export function requiredVotesForThreshold(input: {
	eligibleVotes: number;
	thresholdType: VoteThresholdType;
	requiredFor?: number | undefined;
}): Result<number> {
	if (input.thresholdType === "custom") {
		return input.requiredFor === undefined
			? validation("requiredFor")
			: ok(input.requiredFor);
	}
	if (input.thresholdType === "unanimous") return ok(input.eligibleVotes);
	if (input.thresholdType === "supermajority") {
		return ok(Math.ceil((input.eligibleVotes * 2) / 3));
	}
	return ok(Math.floor(input.eligibleVotes / 2) + 1);
}

export function calculateVoteOutcome(input: {
	eligibleVotes: number;
	votesFor: number;
	votesAgainst: number;
	abstentions: number;
	thresholdType: VoteThresholdType;
	requiredFor?: number | undefined;
}): Result<Readonly<{ requiredFor: number; outcome: "adopted" | "rejected" }>> {
	if (
		input.votesFor + input.votesAgainst + input.abstentions >
		input.eligibleVotes
	) {
		return validation("votesFor");
	}
	const required = requiredVotesForThreshold(input);
	if (!required.ok) return required;
	if (required.data > input.eligibleVotes) return validation("requiredFor");
	return ok({
		requiredFor: required.data,
		outcome: input.votesFor >= required.data ? "adopted" : "rejected",
	});
}

export function resolutionMatchesAsOf(input: {
	resolution: Resolution;
	asOf: CanonicalDate;
	status?: Resolution["status"] | undefined;
}): boolean {
	return (
		input.resolution.effectiveFrom <= input.asOf &&
		(input.status === undefined || input.resolution.status === input.status)
	);
}

export function isResolutionActionOverdue(input: {
	action: ResolutionAction;
	asOf: CanonicalDate;
}): boolean {
	return input.action.status === "assigned" && input.action.dueOn < input.asOf;
}

export function calculateResolutionExecutionStatus(input: {
	resolution: Resolution;
	actions: readonly ResolutionAction[];
	asOf: CanonicalDate;
}): ResolutionExecutionStatus {
	const completedActions = input.actions.filter(
		(action) => action.status === "completed",
	).length;
	const overdueActions = input.actions.filter((action) =>
		isResolutionActionOverdue({ action, asOf: input.asOf }),
	).length;
	return {
		resolutionId: input.resolution.id,
		status: input.resolution.status,
		totalActions: input.actions.length,
		completedActions,
		overdueActions,
		complete:
			input.actions.length > 0 && completedActions === input.actions.length,
	};
}

export function assertResolutionCanFollowVote(input: {
	vote: MeetingVote;
	status: "adopted" | "rejected";
	decidedAt: Date;
	effectiveFrom: CanonicalDate;
}): Result<void> {
	if (input.vote.outcome !== input.status) {
		return fail(
			"CONFLICT",
			"Corporate Administration resolution outcome does not match vote.",
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				field: "meetingVoteId",
			}),
		);
	}
	if (input.effectiveFrom < input.decidedAt.toISOString().slice(0, 10)) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration resolution cannot predate approval.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID",
				{ field: "effectiveFrom" },
			),
		);
	}
	return ok(undefined);
}

function validation(field: string): Result<never> {
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration resolution input is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			{ field },
		),
	);
}
