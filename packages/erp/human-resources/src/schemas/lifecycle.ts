import { z } from "zod";
import {
	humanResourcesClearanceIdSchema,
	humanResourcesEmploymentConfirmationIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesOffboardingCaseIdSchema,
	humanResourcesOffboardingAccessRevocationIdSchema,
	humanResourcesOffboardingPayrollHandoffIdSchema,
	humanResourcesOffboardingTaskIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesOnboardingAccessHandoffIdSchema,
	humanResourcesOnboardingCaseIdSchema,
	humanResourcesOnboardingEquipmentHandoffIdSchema,
	humanResourcesOnboardingOrientationIdSchema,
	humanResourcesOnboardingTaskIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesProbationAssessmentIdSchema,
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

const lifecycleReasonSchema = z.string().trim().min(1).max(1000);
const lifecycleEvidenceReferenceSchema = z.string().trim().min(1).max(500);

// Lifecycle task schema (reused for onboarding and offboarding)
export const lifecycleTaskSeedSchema = z
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

export const recordOnboardingOrientationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			orientationId: humanResourcesOnboardingOrientationIdSchema,
			acknowledgedOn: isoDateSchema,
			notes: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordOnboardingOrientationInput = z.infer<
	typeof recordOnboardingOrientationInputSchema
>;

export const recordOnboardingEquipmentHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			equipmentHandoffId: humanResourcesOnboardingEquipmentHandoffIdSchema,
			handedOverOn: isoDateSchema,
			summary: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordOnboardingEquipmentHandoffInput = z.infer<
	typeof recordOnboardingEquipmentHandoffInputSchema
>;

export const recordOnboardingAccessHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			accessHandoffId: humanResourcesOnboardingAccessHandoffIdSchema,
			grantedOn: isoDateSchema,
			summary: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordOnboardingAccessHandoffInput = z.infer<
	typeof recordOnboardingAccessHandoffInputSchema
>;

export const getOnboardingOrientationByCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		})
		.strict();

export type GetOnboardingOrientationByCaseInput = z.infer<
	typeof getOnboardingOrientationByCaseInputSchema
>;

export const getOnboardingEquipmentHandoffByCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		})
		.strict();

export type GetOnboardingEquipmentHandoffByCaseInput = z.infer<
	typeof getOnboardingEquipmentHandoffByCaseInputSchema
>;

export const getOnboardingAccessHandoffByCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			onboardingCaseId: humanResourcesOnboardingCaseIdSchema,
		})
		.strict();

export type GetOnboardingAccessHandoffByCaseInput = z.infer<
	typeof getOnboardingAccessHandoffByCaseInputSchema
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
		reason: lifecycleReasonSchema,
		evidenceReference: lifecycleEvidenceReferenceSchema.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ExtendProbationInput = z.infer<typeof extendProbationInputSchema>;

export const recordProbationAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			probationReviewId: humanResourcesProbationReviewIdSchema,
			reviewedOn: isoDateSchema,
			reason: lifecycleReasonSchema,
			evidenceReference: lifecycleEvidenceReferenceSchema.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordProbationAssessmentInput = z.infer<
	typeof recordProbationAssessmentInputSchema
>;

export const recordProbationOutcomeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			probationReviewId: humanResourcesProbationReviewIdSchema,
			outcome: probationOutcomeSchema,
			outcomeRecordedOn: isoDateSchema,
			reason: lifecycleReasonSchema,
			evidenceReference: lifecycleEvidenceReferenceSchema.optional(),
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

export const listProbationReviewsByEmploymentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export type ListProbationReviewsByEmploymentInput = z.infer<
	typeof listProbationReviewsByEmploymentInputSchema
>;

export const listProbationAssessmentsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			probationReviewId: humanResourcesProbationReviewIdSchema,
		})
		.strict();

export type ListProbationAssessmentsInput = z.infer<
	typeof listProbationAssessmentsInputSchema
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
		legalEntityKey: z.string().trim().min(1).max(64),
		businessUnitKey: z.string().trim().min(1).max(64),
		locationKey: z.string().trim().min(1).max(64),
		costCentreKey: z.string().trim().min(1).max(64),
		projectKey: z.string().trim().min(1).max(64),
		effectiveOn: isoDateSchema,
		reason: z.string().trim().min(1).max(500),
	})
	.strict();

export type TransferAssignmentInput = z.infer<
	typeof transferAssignmentInputSchema
>;

// Termination schemas
export const proposeTerminationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employmentId: humanResourcesEmploymentIdSchema,
			reasonCode: z.string().trim().min(1).max(64),
			reasonDetail: z.string().trim().min(1).max(2000),
			effectiveOn: isoDateSchema,
			rehireEligible: z.boolean(),
		})
		.strict();

export type ProposeTerminationInput = z.infer<
	typeof proposeTerminationInputSchema
>;

export const approveTerminationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			terminationId: humanResourcesTerminationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveTerminationInput = z.infer<
	typeof approveTerminationInputSchema
>;

export const finalizeTerminationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			terminationId: humanResourcesTerminationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
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

export const recordOffboardingAccessRevocationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			accessRevocationId: humanResourcesOffboardingAccessRevocationIdSchema,
			revokedOn: isoDateSchema,
			summary: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordOffboardingAccessRevocationInput = z.infer<
	typeof recordOffboardingAccessRevocationInputSchema
>;

export const recordOffboardingPayrollHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			payrollHandoffId: humanResourcesOffboardingPayrollHandoffIdSchema,
			readyOn: isoDateSchema,
			summary: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordOffboardingPayrollHandoffInput = z.infer<
	typeof recordOffboardingPayrollHandoffInputSchema
>;

export const getOffboardingAccessRevocationByCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type GetOffboardingAccessRevocationByCaseInput = z.infer<
	typeof getOffboardingAccessRevocationByCaseInputSchema
>;

export const getOffboardingPayrollHandoffByCaseInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offboardingCaseId: humanResourcesOffboardingCaseIdSchema,
		})
		.strict();

export type GetOffboardingPayrollHandoffByCaseInput = z.infer<
	typeof getOffboardingPayrollHandoffByCaseInputSchema
>;
