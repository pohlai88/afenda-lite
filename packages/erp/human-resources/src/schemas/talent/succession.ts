import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesSuccessionCandidateIdSchema,
	humanResourcesSuccessionPlanIdSchema,
} from "../../brands";
import {
	successionCandidateStatusSchema,
	successionPlanStatusSchema,
	successionReadinessCodeSchema,
} from "../../shared/talent-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../common";

// Succession schemas
export const createSuccessionPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			positionId: humanResourcesPositionIdSchema,
			allowsExternalCandidates: z.boolean().optional(),
		})
		.strict();

export type CreateSuccessionPlanInput = z.infer<
	typeof createSuccessionPlanInputSchema
>;

export const updateSuccessionPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			allowsExternalCandidates: z.boolean().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateSuccessionPlanInput = z.infer<
	typeof updateSuccessionPlanInputSchema
>;

export const successionPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SuccessionPlanStatusTransitionInput = z.infer<
	typeof successionPlanStatusTransitionInputSchema
>;

export const nominateSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			employeeId: humanResourcesEmployeeIdSchema.nullable().optional(),
			externalCandidateRef: z
				.string()
				.trim()
				.min(1)
				.max(200)
				.nullable()
				.optional(),
			nominatorUserId: z.string().trim().min(1),
			readiness: successionReadinessCodeSchema,
			readinessEffectiveOn: isoDateSchema,
			evidenceSummary: z.string().trim().min(1).max(4000),
		})
		.strict();

export type NominateSuccessionCandidateInput = z.infer<
	typeof nominateSuccessionCandidateInputSchema
>;

export const assessSuccessionReadinessInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			readiness: successionReadinessCodeSchema,
			readinessEffectiveOn: isoDateSchema,
			evidenceSummary: z.string().trim().min(1).max(4000),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AssessSuccessionReadinessInput = z.infer<
	typeof assessSuccessionReadinessInputSchema
>;

export const approveSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveSuccessionCandidateInput = z.infer<
	typeof approveSuccessionCandidateInputSchema
>;

export const removeSuccessionCandidateInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			candidateId: humanResourcesSuccessionCandidateIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveSuccessionCandidateInput = z.infer<
	typeof removeSuccessionCandidateInputSchema
>;

export const getSuccessionPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
		})
		.strict();

export type GetSuccessionPlanByIdInput = z.infer<
	typeof getSuccessionPlanByIdInputSchema
>;

export const listSuccessionPlansInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			positionId: humanResourcesPositionIdSchema.optional(),
			status: successionPlanStatusSchema.optional(),
		})
		.strict();

export type ListSuccessionPlansInput = z.infer<
	typeof listSuccessionPlansInputSchema
>;

export const listSuccessionCandidatesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			successionPlanId: humanResourcesSuccessionPlanIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			status: successionCandidateStatusSchema.optional(),
		})
		.strict();

export type ListSuccessionCandidatesInput = z.infer<
	typeof listSuccessionCandidatesInputSchema
>;

export const getPositionSuccessionCoverageInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			positionId: humanResourcesPositionIdSchema,
		})
		.strict();

export type GetPositionSuccessionCoverageInput = z.infer<
	typeof getPositionSuccessionCoverageInputSchema
>;
