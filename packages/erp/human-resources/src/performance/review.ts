import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_PENDING_MANAGER_ACTION,
} from "../module-ids";
import {
	acknowledgePerformanceReviewInputSchema,
	finalizePerformanceReviewInputSchema,
	getEmployeePerformanceHistoryInputSchema,
	getPerformanceReviewByIdInputSchema,
	listEmployeePerformanceReviewsInputSchema,
	listReviewsPendingManagerActionInputSchema,
	performanceReviewStatusTransitionInputSchema,
	reopenPerformanceReviewInputSchema,
	startPerformanceReviewInputSchema,
	submitManagerAssessmentInputSchema,
	submitSelfAssessmentInputSchema,
} from "../schemas";
import { fingerprintPerformanceReviewFinalize } from "../shared/fingerprint";
import {
	requirePerformanceConfidentialRead,
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import type {
	EmployeePerformanceHistory,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_REVIEW = "review" as const;
export type HumanResourcesReviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REVIEW;

export async function startPerformanceReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: startPerformanceReviewInputSchema,
		invalidMessage: "Invalid performance review start input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START,
		execute: (data, { store, ports }) =>
			store.startPerformanceReview(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					managerEmployeeId: data.managerEmployeeId,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function submitSelfAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: submitSelfAssessmentInputSchema,
		invalidMessage: "Invalid self assessment submit input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT,
		execute: (data, { store, ports }) =>
			store.submitSelfAssessment(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					rating: data.rating,
					commentsSensitive: data.commentsSensitive ?? null,
					actorUserId: data.actorUserId,
					actorEmployeeId: data.actorEmployeeId,
					expectedVersion: data.expectedVersion,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function submitManagerAssessment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: submitManagerAssessmentInputSchema,
		invalidMessage: "Invalid manager assessment submit input",
		command:
			HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT,
		execute: (data, { store, ports }) =>
			store.submitManagerAssessment(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					rating: data.rating,
					commentsSensitive: data.commentsSensitive ?? null,
					actorUserId: data.actorUserId,
					managerEmployeeId: data.managerEmployeeId,
					expectedVersion: data.expectedVersion,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function returnPerformanceReviewForCorrection(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: performanceReviewStatusTransitionInputSchema,
		invalidMessage: "Invalid performance review return input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION,
		execute: (data, { store, ports }) =>
			store.returnPerformanceReviewForCorrection(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function acknowledgePerformanceReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: acknowledgePerformanceReviewInputSchema,
		invalidMessage: "Invalid performance review acknowledge input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE,
		execute: (data, { store, ports }) =>
			store.acknowledgePerformanceReview(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					acknowledgementNote: data.acknowledgementNote ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function finalizePerformanceReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: finalizePerformanceReviewInputSchema,
		invalidMessage: "Invalid performance review finalize input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPerformanceReviewFinalize({
				reviewId: data.reviewId,
			});

			return store.finalizePerformanceReview(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					overallRating: data.overallRating,
					finalizeIdempotencyKey: data.idempotencyKey,
					finalizeRequestFingerprint: requestFingerprint,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function reopenPerformanceReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReview>> {
	return runPerformanceCommand(input, options, {
		schema: reopenPerformanceReviewInputSchema,
		invalidMessage: "Invalid performance review reopen input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
		execute: (data, { store, ports }) =>
			store.reopenPerformanceReview(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					reason: data.reason,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getPerformanceReviewById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReviewDetail | null>> {
	return runPerformanceQuery(input, options, {
		schema: getPerformanceReviewByIdInputSchema,
		invalidMessage: "Invalid performance review get input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_GET,
		execute: async (data, { store, authorization }) => {
			const confidential = await requirePerformanceConfidentialRead(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					includeConfidential: data.includeConfidential,
				},
			);
			if (!confidential.ok) {
				return confidential;
			}
			return store.getPerformanceReviewById({
				organizationId: data.organizationId,
				reviewId: data.reviewId,
				includeConfidential: data.includeConfidential,
			});
		},
	});
}

export async function listEmployeePerformanceReviews(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReviewListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listEmployeePerformanceReviewsInputSchema,
		invalidMessage: "Invalid employee performance reviews list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_BY_EMPLOYEE,
		execute: async (data, { store, authorization }) => {
			const confidential = await requirePerformanceConfidentialRead(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					includeConfidential: data.includeConfidential,
				},
			);
			if (!confidential.ok) {
				return confidential;
			}
			return store.listEmployeePerformanceReviews({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				includeConfidential: data.includeConfidential,
			});
		},
	});
}

export async function listReviewsPendingManagerAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceReviewListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listReviewsPendingManagerActionInputSchema,
		invalidMessage: "Invalid pending manager reviews list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_PENDING_MANAGER_ACTION,
		execute: (data, { store }) =>
			store.listReviewsPendingManagerAction({
				organizationId: data.organizationId,
				managerEmployeeId: data.managerEmployeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}

export async function getEmployeePerformanceHistory(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeePerformanceHistory>> {
	return runPerformanceQuery(input, options, {
		schema: getEmployeePerformanceHistoryInputSchema,
		invalidMessage: "Invalid employee performance history get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
		execute: async (data, { store, authorization }) => {
			const confidential = await requirePerformanceConfidentialRead(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					includeConfidential: data.includeConfidential,
				},
			);
			if (!confidential.ok) {
				return confidential;
			}
			return store.getEmployeePerformanceHistory({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				includeConfidential: data.includeConfidential,
			});
		},
	});
}
