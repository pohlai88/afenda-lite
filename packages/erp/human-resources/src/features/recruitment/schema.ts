import { z } from "zod";
import {
	humanResourcesApplicationIdSchema,
	humanResourcesCandidateIdSchema,
	humanResourcesCompensationProposalIdSchema,
	humanResourcesDepartmentIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesInterviewIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesRequisitionIdSchema,
} from "../../kernel/identity/brands";
import {
	humanResourcesActorUserIdSchema,
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
	isoDateTimeSchema,
} from "../../kernel/validation/common";
import {
	applicationStatusSchema,
	candidateConsentSourceSchema,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	offerStatusSchema,
	requisitionStatusSchema,
} from "./status";

// Requisition schemas
export const createDraftRequisitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			jobId: humanResourcesJobIdSchema.nullable().optional(),
			positionId: humanResourcesPositionIdSchema.nullable().optional(),
			departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
			hiringManagerEmployeeId: humanResourcesEmployeeIdSchema
				.nullable()
				.optional(),
		})
		.strict();

export type CreateDraftRequisitionInput = z.infer<
	typeof createDraftRequisitionInputSchema
>;

export const amendRequisitionInputSchema = humanResourcesMutationContextSchema
	.extend({
		requisitionId: humanResourcesRequisitionIdSchema,
		title: z.string().trim().min(1).max(200).optional(),
		jobId: humanResourcesJobIdSchema.nullable().optional(),
		positionId: humanResourcesPositionIdSchema.nullable().optional(),
		departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
		hiringManagerEmployeeId: humanResourcesEmployeeIdSchema
			.nullable()
			.optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendRequisitionInput = z.infer<typeof amendRequisitionInputSchema>;

export const assignHiringManagerInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requisitionId: humanResourcesRequisitionIdSchema,
			hiringManagerEmployeeId: humanResourcesEmployeeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AssignHiringManagerInput = z.infer<
	typeof assignHiringManagerInputSchema
>;

export const requisitionStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requisitionId: humanResourcesRequisitionIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RequisitionStatusTransitionInput = z.infer<
	typeof requisitionStatusTransitionInputSchema
>;

export const getRequisitionInputSchema = humanResourcesMutationContextSchema
	.extend({
		requisitionId: humanResourcesRequisitionIdSchema,
	})
	.strict();

export type GetRequisitionInput = z.infer<typeof getRequisitionInputSchema>;

export const listRequisitionsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: requisitionStatusSchema.optional(),
	})
	.strict();

export type ListRequisitionsInput = z.infer<typeof listRequisitionsInputSchema>;

// Candidate schemas
export const createCandidateInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		displayName: z.string().trim().min(1).max(200),
		email: z.string().trim().email().max(320),
		phone: z.string().trim().min(1).max(40).nullable().optional(),
		consentPolicyVersion: z.string().trim().min(1).max(64),
		consentCapturedAt: z.string().datetime({ offset: true }),
		consentSource: candidateConsentSourceSchema,
		retentionUntil: z.string().date(),
	})
	.strict()
	.refine(
		(value) => value.retentionUntil >= value.consentCapturedAt.slice(0, 10),
		{
			message: "Candidate retention date must not precede consent capture",
			path: ["retentionUntil"],
		},
	);

export type CreateCandidateInput = z.infer<typeof createCandidateInputSchema>;

export const updateCandidateProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesCandidateIdSchema,
			displayName: z.string().trim().min(1).max(200).optional(),
			phone: z.string().trim().min(1).max(40).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateCandidateProfileInput = z.infer<
	typeof updateCandidateProfileInputSchema
>;

export const withdrawCandidateConsentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesCandidateIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type WithdrawCandidateConsentInput = z.infer<
	typeof withdrawCandidateConsentInputSchema
>;

export const changeCandidateRetentionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesCandidateIdSchema,
			retentionUntil: z.string().date(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ChangeCandidateRetentionInput = z.infer<
	typeof changeCandidateRetentionInputSchema
>;

export const anonymizeCandidateInputSchema = humanResourcesMutationContextSchema
	.extend({
		candidateId: humanResourcesCandidateIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
		asOf: z.string().date().optional(),
	})
	.strict();

export type AnonymizeCandidateInput = z.infer<
	typeof anonymizeCandidateInputSchema
>;

export const getCandidateInputSchema = humanResourcesMutationContextSchema
	.extend({
		candidateId: humanResourcesCandidateIdSchema,
	})
	.strict();

export type GetCandidateInput = z.infer<typeof getCandidateInputSchema>;

export const listCandidatesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: candidateStatusSchema.optional(),
		retentionDueAsOf: z.string().date().optional(),
		query: z.string().trim().min(1).max(200).optional(),
	})
	.strict();

export type ListCandidatesInput = z.infer<typeof listCandidatesInputSchema>;

export const detectCandidateDuplicatesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			email: z.string().trim().email().max(320).optional(),
			displayName: z.string().trim().min(1).max(200).optional(),
		})
		.strict()
		.refine(
			(value) => value.email !== undefined || value.displayName !== undefined,
			{
				message: "Provide email and/or displayName for duplicate detection",
			},
		);

export type DetectCandidateDuplicatesInput = z.infer<
	typeof detectCandidateDuplicatesInputSchema
>;

// Application schemas
export const createApplicationInputSchema = humanResourcesMutationContextSchema
	.extend({
		candidateId: humanResourcesCandidateIdSchema,
		requisitionId: humanResourcesRequisitionIdSchema,
	})
	.strict();

export type CreateApplicationInput = z.infer<
	typeof createApplicationInputSchema
>;

export const applicationStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			applicationId: humanResourcesApplicationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
			reason: z.string().trim().min(1).max(2000).optional(),
			reasonCode: z.string().trim().min(1).max(64).optional(),
		})
		.strict();

export type ApplicationStatusTransitionInput = z.infer<
	typeof applicationStatusTransitionInputSchema
>;

export const reopenApplicationInputSchema =
	applicationStatusTransitionInputSchema;

export type ReopenApplicationInput = z.infer<
	typeof reopenApplicationInputSchema
>;

export const listApplicationStatusHistoryInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			applicationId: humanResourcesApplicationIdSchema,
		})
		.strict();

export type ListApplicationStatusHistoryInput = z.infer<
	typeof listApplicationStatusHistoryInputSchema
>;

export const getApplicationInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
	})
	.strict();

export type GetApplicationInput = z.infer<typeof getApplicationInputSchema>;

export const listApplicationsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: applicationStatusSchema.optional(),
		candidateId: humanResourcesCandidateIdSchema.optional(),
		requisitionId: humanResourcesRequisitionIdSchema.optional(),
	})
	.strict();

export type ListApplicationsInput = z.infer<typeof listApplicationsInputSchema>;

// Interview schemas
export const interviewScorecardCriterionSchema = z
	.object({
		criterionCode: z.string().trim().min(1).max(64),
		label: z.string().trim().min(1).max(200),
		rating: z.number().int().min(1).max(5),
		comment: z.string().trim().max(1000).nullable().optional(),
	})
	.strict()
	.transform((value) => ({
		criterionCode: value.criterionCode,
		label: value.label,
		rating: value.rating,
		comment: value.comment ?? null,
	}));

export const interviewScorecardSchema = z
	.object({
		criteria: z
			.array(interviewScorecardCriterionSchema)
			.min(1)
			.max(20)
			.refine(
				(criteria) =>
					new Set(criteria.map((criterion) => criterion.criterionCode)).size ===
					criteria.length,
				{ message: "criterionCode must be unique within scorecard" },
			),
	})
	.strict();

export type InterviewScorecardInput = z.infer<typeof interviewScorecardSchema>;

export const scheduleInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
		scheduledAt: isoDateTimeSchema,
		interviewerActorId: humanResourcesActorUserIdSchema,
	})
	.strict();

export type ScheduleInterviewInput = z.infer<
	typeof scheduleInterviewInputSchema
>;

export const cancelInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		interviewId: humanResourcesInterviewIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type CancelInterviewInput = z.infer<typeof cancelInterviewInputSchema>;

export const recordInterviewEvaluationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			interviewId: humanResourcesInterviewIdSchema,
			result: interviewEvaluationResultSchema,
			scorecard: interviewScorecardSchema,
			privateNotes: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordInterviewEvaluationInput = z.infer<
	typeof recordInterviewEvaluationInputSchema
>;

export const assignInterviewInterviewerInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			interviewId: humanResourcesInterviewIdSchema,
			interviewerActorId: humanResourcesActorUserIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AssignInterviewInterviewerInput = z.infer<
	typeof assignInterviewInterviewerInputSchema
>;

export const getInterviewInputSchema = humanResourcesMutationContextSchema
	.extend({
		interviewId: humanResourcesInterviewIdSchema,
	})
	.strict();

export type GetInterviewInput = z.infer<typeof getInterviewInputSchema>;

export const listInterviewsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		applicationId: humanResourcesApplicationIdSchema.optional(),
	})
	.strict();

export type ListInterviewsInput = z.infer<typeof listInterviewsInputSchema>;

export const getInterviewEvaluationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			interviewId: humanResourcesInterviewIdSchema,
		})
		.strict();

export type GetInterviewEvaluationInput = z.infer<
	typeof getInterviewEvaluationInputSchema
>;

// Offer schemas
export const createOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		applicationId: humanResourcesApplicationIdSchema,
		termsSummary: z.string().trim().min(1).max(2000),
		expiresOn: isoDateSchema,
		compensationProposalId:
			humanResourcesCompensationProposalIdSchema.nullish(),
	})
	.strict();

export type CreateOfferInput = z.infer<typeof createOfferInputSchema>;

export const amendOfferDraftInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
		termsSummary: z.string().trim().min(1).max(2000).optional(),
		expiresOn: isoDateSchema.optional(),
		compensationProposalId:
			humanResourcesCompensationProposalIdSchema.nullish(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendOfferDraftInput = z.infer<typeof amendOfferDraftInputSchema>;

export const offerStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			offerId: humanResourcesOfferIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type OfferStatusTransitionInput = z.infer<
	typeof offerStatusTransitionInputSchema
>;

export const acceptOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
		asOfDate: isoDateSchema.optional(),
	})
	.strict();

export type AcceptOfferInput = z.infer<typeof acceptOfferInputSchema>;

export const getOfferInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
	})
	.strict();

export type GetOfferInput = z.infer<typeof getOfferInputSchema>;

export const listOffersInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: offerStatusSchema.optional(),
		applicationId: humanResourcesApplicationIdSchema.optional(),
	})
	.strict();

export type ListOffersInput = z.infer<typeof listOffersInputSchema>;
