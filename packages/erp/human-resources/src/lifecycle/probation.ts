import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	runEmploymentLifecycleCommand,
	runEmploymentLifecycleQuery,
} from "../employment-lifecycle/run-operation";
import {
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_QUERY_PROBATION_ASSESSMENTS_LIST,
	HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET,
	HUMAN_RESOURCES_QUERY_PROBATION_REVIEWS_LIST_BY_EMPLOYMENT,
} from "../module-ids";
import {
	extendProbationInputSchema,
	getProbationReviewInputSchema,
	listProbationAssessmentsInputSchema,
	listProbationReviewsByEmploymentInputSchema,
	openProbationInputSchema,
	recordProbationAssessmentInputSchema,
	recordProbationOutcomeInputSchema,
} from "../schemas/lifecycle";
import { fingerprintProbationOpen } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { ProbationAssessment, ProbationReview } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_PROBATION = "probation" as const;
export type HumanResourcesProbationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PROBATION;

export function openProbation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: openProbationInputSchema,
		invalidMessage: "Invalid open probation input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
		storeMethods: ["openProbation"],
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
				}),
			);
		},
	});
}

export function extendProbation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: extendProbationInputSchema,
		invalidMessage: "Invalid extend probation input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
		storeMethods: ["extendProbation"],
		execute: (data, { store, ports }) =>
			store.extendProbation(
				{
					organizationId: data.organizationId,
					probationReviewId: data.probationReviewId,
					newEndsOn: data.newEndsOn,
					reason: data.reason.trim(),
					evidenceReference: data.evidenceReference?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
				}),
			),
	});
}

export function recordProbationAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationAssessment>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: recordProbationAssessmentInputSchema,
		invalidMessage: "Invalid record probation assessment input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
		storeMethods: ["recordProbationAssessment"],
		execute: (data, { store, ports }) =>
			store.recordProbationAssessment(
				{
					organizationId: data.organizationId,
					probationReviewId: data.probationReviewId,
					reviewedOn: data.reviewedOn,
					reason: data.reason.trim(),
					evidenceReference: data.evidenceReference?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
				}),
			),
	});
}

export function recordProbationOutcome(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: recordProbationOutcomeInputSchema,
		invalidMessage: "Invalid record probation outcome input",
		command: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
		storeMethods: ["recordProbationOutcome"],
		execute: (data, { store, ports }) =>
			store.recordProbationOutcome(
				{
					organizationId: data.organizationId,
					probationReviewId: data.probationReviewId,
					outcome: data.outcome,
					concludedOn: data.outcomeRecordedOn,
					reason: data.reason.trim(),
					evidenceReference: data.evidenceReference?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
				}),
			),
	});
}

export function getProbationReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview | null>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: getProbationReviewInputSchema,
		invalidMessage: "Invalid get probation review input",
		query: HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET,
		storeMethods: ["getProbationReview"],
		execute: (data, { store }) =>
			store.getProbationReview({
				organizationId: data.organizationId,
				probationReviewId: data.probationReviewId,
			}),
	});
}

export function listProbationReviewsByEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationReview[]>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: listProbationReviewsByEmploymentInputSchema,
		invalidMessage: "Invalid list probation reviews input",
		query: HUMAN_RESOURCES_QUERY_PROBATION_REVIEWS_LIST_BY_EMPLOYMENT,
		storeMethods: ["listProbationReviewsByEmployment"],
		execute: (data, { store }) =>
			store.listProbationReviewsByEmployment({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			}),
	});
}

export function listProbationAssessments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProbationAssessment[]>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: listProbationAssessmentsInputSchema,
		invalidMessage: "Invalid list probation assessments input",
		query: HUMAN_RESOURCES_QUERY_PROBATION_ASSESSMENTS_LIST,
		storeMethods: ["listProbationAssessments"],
		execute: (data, { store }) =>
			store.listProbationAssessments({
				organizationId: data.organizationId,
				probationReviewId: data.probationReviewId,
			}),
	});
}
