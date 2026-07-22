import { z } from "zod";
import {
	humanResourcesApplicationIdSchema,
	humanResourcesCandidateIdSchema,
	humanResourcesDepartmentIdSchema,
	humanResourcesInterviewIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesOfferIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesRequisitionIdSchema,
} from "../brands";
import {
	applicationStatusSchema,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	offerStatusSchema,
	requisitionStatusSchema,
} from "../shared/recruitment-status";
import {
	humanResourcesActorUserIdSchema,
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
	isoDateTimeSchema,
} from "./common";

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
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type AmendRequisitionInput = z.infer<typeof amendRequisitionInputSchema>;

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
	})
	.strict();

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
	})
	.strict();

export type ListCandidatesInput = z.infer<typeof listCandidatesInputSchema>;

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
		})
		.strict();

export type ApplicationStatusTransitionInput = z.infer<
	typeof applicationStatusTransitionInputSchema
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
			privateNotes: z.string().trim().max(4000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordInterviewEvaluationInput = z.infer<
	typeof recordInterviewEvaluationInputSchema
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
	})
	.strict();

export type CreateOfferInput = z.infer<typeof createOfferInputSchema>;

export const amendOfferDraftInputSchema = humanResourcesMutationContextSchema
	.extend({
		offerId: humanResourcesOfferIdSchema,
		termsSummary: z.string().trim().min(1).max(2000).optional(),
		expiresOn: isoDateSchema.optional(),
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
