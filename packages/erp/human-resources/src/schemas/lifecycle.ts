import { z } from "zod";
import {
	humanResourcesClearanceIdSchema,
	humanResourcesEmploymentConfirmationIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesOffboardingCaseIdSchema,
	humanResourcesOffboardingTaskIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesOnboardingCaseIdSchema,
	humanResourcesOnboardingTaskIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesProbationReviewIdSchema,
	humanResourcesTerminationIdSchema,
} from "../brands";
import {
	lifecycleTaskStatusSchema,
	probationOutcomeSchema,
} from "../shared/lifecycle-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

// Lifecycle task schema (reused for onboarding and offboarding)
const lifecycleTaskSeedSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		title: z.string().trim().min(1).max(200),
		mandatory: z.boolean(),
	})
	.strict();

// Onboarding schemas
export const startOnboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		sourceOfferId: humanResourcesOfferIdSchema.nullable().optional(),
		tasks: z.array(lifecycleTaskSeedSchema).min(1),
	})
	.strict();

export type StartOnboardingInput = z.infer<typeof startOnboardingInputSchema>;

export const completeOnboardingTaskInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			taskId: humanResourcesOnboardingTaskIdSchema,
			status: lifecycleTaskStatusSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOnboardingTaskInput = z.infer<
	typeof completeOnboardingTaskInputSchema
>;

export const completeOnboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CompleteOnboardingInput = z.infer<
	typeof completeOnboardingInputSchema
>;

export const listOnboardingTasksInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		})
		.strict();

export type ListOnboardingTasksInput = z.infer<
	typeof listOnboardingTasksInputSchema
>;

export const getOnboardingCaseInputSchema = humanResourcesMutationContextSchema
	.extend({
		onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
	})
	.strict();

export type GetOnboardingCaseInput = z.infer<
	typeof getOnboardingCaseInputSchema
>;

// Probation schemas
export const openProbationInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		startsOn: isoDateSchema,
		endsOn: isoDateSchema,
	})
	.strict();

export type OpenProbationInput = z.infer<typeof openProbationInputSchema>;

export const extendProbationInputSchema = humanResourcesMutationContextSchema
	.extend({
		probationReviewId: humanResourcesProbationReviewIdSchema,
		newEndsOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ExtendProbationInput = z.infer<typeof extendProbationInputSchema>;

export const recordProbationOutcomeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			probationReviewId: humanResourcesProbationReviewIdSchema,
			outcome: probationOutcomeSchema,
			outcomeRecordedOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordProbationOutcomeInput = z.infer<
	typeof recordProbationOutcomeInputSchema
>;

export const getProbationReviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		probationReviewId: humanResourcesProbationReviewIdSchema,
	})
	.strict();

export type GetProbationReviewInput = z.infer<
	typeof getProbationReviewInputSchema
>;

// Confirmation schemas
export const confirmEmploymentInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		confirmedOn: isoDateSchema,
		evidenceNote: z.string().trim().min(1).max(2000),
	})
	.strict();

export type ConfirmEmploymentInput = z.infer<
	typeof confirmEmploymentInputSchema
>;

export const getEmploymentConfirmationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentConfirmationId: humanResourcesEmploymentConfirmationIdSchema,
		})
		.strict();

export type GetEmploymentConfirmationInput = z.infer<
	typeof getEmploymentConfirmationInputSchema
>;

// Transfer schemas
export const transferAssignmentInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		toPositionId: humanResourcesPositionIdSchema,
		effectiveOn: isoDateSchema,
		reason: z.string().trim().min(1).max(500),
	})
	.strict();

export type TransferAssignmentInput = z.infer<
	typeof transferAssignmentInputSchema
>;

// Termination schemas
export const finalizeTerminationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employmentId: humanResourcesEmploymentIdSchema,
			reasonCode: z.string().trim().min(1).max(64),
			reasonDetail: z.string().trim().min(1).max(2000),
			effectiveOn: isoDateSchema,
		})
		.strict();

export type FinalizeTerminationInput = z.infer<
	typeof finalizeTerminationInputSchema
>;

export const getTerminationInputSchema = humanResourcesMutationContextSchema
	.extend({
		terminationId: humanResourcesTerminationIdSchema,
	})
	.strict();

export type GetTerminationInput = z.infer<typeof getTerminationInputSchema>;

// Offboarding schemas
export const startOffboardingInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employmentId: humanResourcesEmploymentIdSchema,
		terminationId: humanResourcesTerminationIdSchema.nullable().optional(),
		tasks: z.array(lifecycleTaskSeedSchema).min(1),
	})
	.strict();

export type StartOffboardingInput = z.infer<typeof startOffboardingInputSchema>;

export const completeOffboardingTaskInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			taskId: humanResourcesOffboardingTaskIdSchema,
			status: lifecycleTaskStatusSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOffboardingTaskInput = z.infer<
	typeof completeOffboardingTaskInputSchema
>;

export const recordExitInterviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
			conductedOn: isoDateSchema,
			notes: z.string().trim().min(1).max(4000),
		})
		.strict();

export type RecordExitInterviewInput = z.infer<
	typeof recordExitInterviewInputSchema
>;

export const recordClearanceInputSchema = humanResourcesMutationContextSchema
	.extend({
		clearanceId: humanResourcesClearanceIdSchema,
		clearedOn: isoDateSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type RecordClearanceInput = z.infer<typeof recordClearanceInputSchema>;

export const completeOffboardingInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CompleteOffboardingInput = z.infer<
	typeof completeOffboardingInputSchema
>;

export const getOffboardingCaseInputSchema = humanResourcesMutationContextSchema
	.extend({
		offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
	})
	.strict();

export type GetOffboardingCaseInput = z.infer<
	typeof getOffboardingCaseInputSchema
>;

export const listOffboardingTasksInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type ListOffboardingTasksInput = z.infer<
	typeof listOffboardingTasksInputSchema
>;

export const getClearanceByOffboardingCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type GetClearanceByOffboardingCaseInput = z.infer<
	typeof getClearanceByOffboardingCaseInputSchema
>;
