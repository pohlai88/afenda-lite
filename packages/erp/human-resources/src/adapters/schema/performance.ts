import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesGoalIdSchema,
	humanResourcesImprovementPlanIdSchema,
	humanResourcesPerformanceCycleIdSchema,
	humanResourcesPerformanceCycleParticipantIdSchema,
	humanResourcesReviewIdSchema,
} from "../brands";
import { performanceRatingScaleSchema } from "../shared/performance-rating";
import {
	performanceCycleStatusSchema,
	performanceGoalStatusSchema,
	performanceWeightingModelSchema,
} from "../shared/performance-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

const performanceWeightSchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/)
	.nullable();

const performanceCheckpointRecordOutcomeSchema = z.enum(["met", "missed"]);

export const createPerformanceCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			name: z.string().trim().min(1).max(200),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			ratingScale: performanceRatingScaleSchema,
			weightingModel: performanceWeightingModelSchema,
		})
		.strict();

export const updatePerformanceCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			name: z.string().trim().min(1).max(200).optional(),
			periodStart: isoDateSchema.optional(),
			periodEnd: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceCycleStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const addCycleParticipantInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export const removeCycleParticipantInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			participantId: humanResourcesPerformanceCycleParticipantIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getPerformanceCycleByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
		})
		.strict();

export const listPerformanceCyclesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: performanceCycleStatusSchema.optional(),
		})
		.strict();

export const listCycleParticipantsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
		})
		.strict();

export const createPerformanceGoalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			title: z.string().trim().min(1).max(200),
			description: z.string().trim().max(2000).nullable().optional(),
			weight: performanceWeightSchema.optional(),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			exceptionOutsideCycle: z.boolean().optional(),
		})
		.strict();

export const updatePerformanceGoalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			description: z.string().trim().max(2000).nullable().optional(),
			weight: performanceWeightSchema.optional(),
			periodStart: isoDateSchema.optional(),
			periodEnd: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceGoalStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const recordGoalProgressInputSchema = humanResourcesMutationContextSchema
	.extend({
		goalId: humanResourcesGoalIdSchema,
		progressNote: z.string().trim().min(1).max(2000),
		progressValue: performanceWeightSchema.optional(),
	})
	.strict();

export const getPerformanceGoalByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			goalId: humanResourcesGoalIdSchema,
		})
		.strict();

export const listEmployeeGoalsInputSchema = humanResourcesMutationContextSchema
	.extend({
		employeeId: humanResourcesEmployeeIdSchema,
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: performanceGoalStatusSchema.optional(),
	})
	.strict();

export const startPerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesPerformanceCycleIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			managerEmployeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export const submitSelfAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			rating: z.string().trim().min(1).max(64),
			commentsSensitive: z.string().trim().max(4000).nullable().optional(),
			actorEmployeeId: humanResourcesEmployeeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const submitManagerAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			rating: z.string().trim().min(1).max(64),
			commentsSensitive: z.string().trim().max(4000).nullable().optional(),
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const performanceReviewStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const acknowledgePerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			acknowledgementNote: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const finalizePerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			overallRating: z.string().trim().min(1).max(64),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const reopenPerformanceReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			reason: z.string().trim().min(1).max(500),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getPerformanceReviewByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesReviewIdSchema,
			includeConfidential: z.boolean(),
		})
		.strict();

export const listEmployeePerformanceReviewsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			includeConfidential: z.boolean(),
		})
		.strict();

export const listReviewsPendingManagerActionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const createImprovementPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			reviewId: humanResourcesReviewIdSchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			performanceGap: z.string().trim().min(1).max(2000),
			expectedOutcome: z.string().trim().min(1).max(2000),
			measurableActions: z.string().trim().min(1).max(4000),
			supportResources: z.string().trim().min(1).max(4000),
			dueDate: isoDateSchema,
			accountableManagerEmployeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export const improvementPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const recordImprovementCheckpointInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			sequenceNumber: z.number().int().positive(),
			outcome: performanceCheckpointRecordOutcomeSchema,
			notes: z.string().trim().max(2000).nullable().optional(),
		})
		.strict();

export const amendImprovementPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
			measurableActions: z.string().trim().min(1).max(4000).optional(),
			supportResources: z.string().trim().min(1).max(4000).optional(),
			dueDate: isoDateSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getImprovementPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesImprovementPlanIdSchema,
		})
		.strict();

export const listActiveImprovementPlansInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getEmployeePerformanceHistoryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			includeConfidential: z.boolean(),
		})
		.strict();
