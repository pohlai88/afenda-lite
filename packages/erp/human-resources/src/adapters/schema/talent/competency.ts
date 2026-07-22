import { z } from "zod";
import {
	humanResourcesCompetencyAssessmentIdSchema,
	humanResourcesCompetencyIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesJobCompetencyIdSchema,
	humanResourcesJobIdSchema,
} from "../../brands";
import {
	competencyScaleCodeSchema,
	competencyStatusSchema,
} from "../../shared/talent-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../common";

// Competency schemas
export const createCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(200),
		description: z.string().trim().max(2000).nullable().optional(),
		category: z.string().trim().max(100).nullable().optional(),
		scaleCode: competencyScaleCodeSchema,
	})
	.strict();

export type CreateCompetencyInput = z.infer<typeof createCompetencyInputSchema>;

export const updateCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		category: z.string().trim().max(100).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateCompetencyInput = z.infer<typeof updateCompetencyInputSchema>;

export const retireCompetencyInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type RetireCompetencyInput = z.infer<typeof retireCompetencyInputSchema>;

export const mapCompetencyToJobInputSchema = humanResourcesMutationContextSchema
	.extend({
		jobId: humanResourcesJobIdSchema,
		competencyId: humanResourcesCompetencyIdSchema,
		requiredLevel: z.number().int().min(1).max(5),
	})
	.strict();

export type MapCompetencyToJobInput = z.infer<
	typeof mapCompetencyToJobInputSchema
>;

export const removeCompetencyFromJobInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			jobCompetencyId: humanResourcesJobCompetencyIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RemoveCompetencyFromJobInput = z.infer<
	typeof removeCompetencyFromJobInputSchema
>;

export const assessEmployeeCompetencyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			competencyId: humanResourcesCompetencyIdSchema,
			assessorUserId: z.string().trim().min(1),
			evidenceSource: z.string().trim().min(1).max(2000),
			scaleCode: competencyScaleCodeSchema,
			level: z.number().int().min(1).max(5),
			effectiveOn: isoDateSchema,
		})
		.strict();

export type AssessEmployeeCompetencyInput = z.infer<
	typeof assessEmployeeCompetencyInputSchema
>;

export const supersedeCompetencyAssessmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			assessmentId: humanResourcesCompetencyAssessmentIdSchema,
			assessorUserId: z.string().trim().min(1),
			evidenceSource: z.string().trim().min(1).max(2000),
			level: z.number().int().min(1).max(5),
			effectiveOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type SupersedeCompetencyAssessmentInput = z.infer<
	typeof supersedeCompetencyAssessmentInputSchema
>;

export const getCompetencyByIdInputSchema = humanResourcesMutationContextSchema
	.extend({
		competencyId: humanResourcesCompetencyIdSchema,
	})
	.strict();

export type GetCompetencyByIdInput = z.infer<
	typeof getCompetencyByIdInputSchema
>;

export const listCompetenciesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: competencyStatusSchema.optional(),
	})
	.strict();

export type ListCompetenciesInput = z.infer<typeof listCompetenciesInputSchema>;

export const listJobCompetenciesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			jobId: humanResourcesJobIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export type ListJobCompetenciesInput = z.infer<
	typeof listJobCompetenciesInputSchema
>;

export const getEmployeeCompetencyProfileInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export type GetEmployeeCompetencyProfileInput = z.infer<
	typeof getEmployeeCompetencyProfileInputSchema
>;
