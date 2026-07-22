import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
} from "../module-ids";
import {
	applyApprovedCompensationResultInputSchema,
	createCompensationReviewDraftInputSchema,
	finalizeCompensationReviewInputSchema,
	recordCompensationRecommendationInputSchema,
} from "../schemas";
import {
	assertCurrencyExists,
	runCompensationCommand,
} from "../shared/compensation-command";
import { fingerprintCompensationReviewDraft } from "../shared/fingerprint";
import type { CompensationReview, EmployeeCompensation } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_REVIEW =
	"compensation_review" as const;
export type HumanResourcesCompensationReviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_REVIEW;

export async function createCompensationReviewDraft(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReview>> {
	return runCompensationCommand(input, options, {
		schema: createCompensationReviewDraftInputSchema,
		invalidMessage: "Invalid compensation review draft create input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintCompensationReviewDraft({
				employeeId: data.employeeId,
				employmentId: data.employmentId,
			});
			return store.createCompensationReviewDraft(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function recordCompensationRecommendation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReview>> {
	return runCompensationCommand(input, options, {
		schema: recordCompensationRecommendationInputSchema,
		invalidMessage: "Invalid compensation recommendation input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.proposedCurrencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			return store.recordCompensationRecommendation(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					proposedBaseAmount: data.proposedBaseAmount,
					proposedCurrencyCode: data.proposedCurrencyCode,
					proposedGradeId: data.proposedGradeId ?? null,
					proposedSalaryBandId: data.proposedSalaryBandId ?? null,
					effectiveFrom: data.effectiveFrom,
					recommendationNote: data.recommendationNote ?? null,
					actorUserId: data.actorUserId,
					expectedVersion: data.expectedVersion,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function finalizeCompensationReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReview>> {
	return runCompensationCommand(input, options, {
		schema: finalizeCompensationReviewInputSchema,
		invalidMessage: "Invalid compensation review finalize input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
		execute: (data, { store, ports }) =>
			store.finalizeCompensationReview(
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

export async function applyApprovedCompensationResult(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: applyApprovedCompensationResultInputSchema,
		invalidMessage: "Invalid apply approved compensation result input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
		execute: (data, { store, ports }) =>
			store.applyApprovedCompensationResult(
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
