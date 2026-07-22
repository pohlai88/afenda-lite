import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET,
} from "../module-ids";
import {
	extendProbationInputSchema,
	getProbationReviewInputSchema,
	openProbationInputSchema,
	recordProbationOutcomeInputSchema,
} from "../schemas/lifecycle";
import { fingerprintProbationOpen } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import type { ProbationReview } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_PROBATION = "probation" as const;
export type HumanResourcesProbationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PROBATION;

export async function openProbation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runLifecycleCommand(input, options, {
		schema: openProbationInputSchema,
		invalidMessage: "Invalid open probation input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintProbationOpen({
				employmentId: data.employmentId,
				startsOn: data.startsOn,
				endsOn: data.endsOn,
			});
			return store.openProbation(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					startsOn: data.startsOn,
					endsOn: data.endsOn,
					idempotencyKey: data.idempotencyKey,
					openRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function extendProbation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runLifecycleCommand(input, options, {
		schema: extendProbationInputSchema,
		invalidMessage: "Invalid extend probation input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
		execute: (data, { store, ports }) =>
			store.extendProbation(
				{
					organizationId: data.organizationId,
					probationReviewId: data.probationReviewId,
					newEndsOn: data.newEndsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function recordProbationOutcome(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runLifecycleCommand(input, options, {
		schema: recordProbationOutcomeInputSchema,
		invalidMessage: "Invalid record probation outcome input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
		execute: (data, { store, ports }) =>
			store.recordProbationOutcome(
				{
					organizationId: data.organizationId,
					probationReviewId: data.probationReviewId,
					outcome: data.outcome,
					concludedOn: data.outcomeRecordedOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getProbationReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview | null>> {
	return runLifecycleQuery(input, options, {
		schema: getProbationReviewInputSchema,
		invalidMessage: "Invalid get probation review input",
		query: HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET,
		execute: (data, { store }) =>
			store.getProbationReview({
				organizationId: data.organizationId,
				probationReviewId: data.probationReviewId,
			}),
	});
}
