import { z } from "zod";
import {
	humanResourcesBenefitEnrollmentIdSchema,
	humanResourcesBenefitPlanIdSchema,
	humanResourcesCompensationGradeIdSchema,
	humanResourcesCompensationReviewIdSchema,
	humanResourcesEmployeeCompensationIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesSalaryBandIdSchema,
} from "../brands";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

const moneyAmountSchema = z.string().regex(/^\d+(\.\d{1,4})?$/);
const currencyCodeSchema = z
	.string()
	.trim()
	.length(3)
	.transform((value) => value.toUpperCase());

export const createCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			code: z.string().trim().min(1).max(50),
			name: z.string().trim().min(1).max(200),
		})
		.strict();

export type CreateCompensationGradeInput = z.infer<
	typeof createCompensationGradeInputSchema
>;

export const updateCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			name: z.string().trim().min(1).max(200).optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type UpdateCompensationGradeInput = z.infer<
	typeof updateCompensationGradeInputSchema
>;

export const archiveCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ArchiveCompensationGradeInput = z.infer<
	typeof archiveCompensationGradeInputSchema
>;

export const createSalaryBandInputSchema = humanResourcesMutationContextSchema
	.extend({
		gradeId: humanResourcesCompensationGradeIdSchema,
		currencyCode: currencyCodeSchema,
		minAmount: moneyAmountSchema,
		midAmount: moneyAmountSchema,
		maxAmount: moneyAmountSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.strict();

export type CreateSalaryBandInput = z.infer<typeof createSalaryBandInputSchema>;

export const supersedeSalaryBandInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			currencyCode: currencyCodeSchema,
			minAmount: moneyAmountSchema,
			midAmount: moneyAmountSchema,
			maxAmount: moneyAmountSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
		})
		.strict();

export type SupersedeSalaryBandInput = z.infer<
	typeof supersedeSalaryBandInputSchema
>;

export const archiveSalaryBandInputSchema = humanResourcesMutationContextSchema
	.extend({
		salaryBandId: humanResourcesSalaryBandIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ArchiveSalaryBandInput = z.infer<
	typeof archiveSalaryBandInputSchema
>;

export const createEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			gradeId: humanResourcesCompensationGradeIdSchema.nullable().optional(),
			salaryBandId: humanResourcesSalaryBandIdSchema.nullable().optional(),
			baseAmount: moneyAmountSchema,
			currencyCode: currencyCodeSchema,
			effectiveFrom: isoDateSchema,
			reason: z.string().trim().min(1).max(500),
			sourceReviewId: humanResourcesCompensationReviewIdSchema
				.nullable()
				.optional(),
		})
		.strict();

export type CreateEmployeeCompensationInput = z.infer<
	typeof createEmployeeCompensationInputSchema
>;

export const endEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			endsOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndEmployeeCompensationInput = z.infer<
	typeof endEmployeeCompensationInputSchema
>;

export const createCompensationReviewDraftInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
		})
		.strict();

export type CreateCompensationReviewDraftInput = z.infer<
	typeof createCompensationReviewDraftInputSchema
>;

export const recordCompensationRecommendationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			proposedBaseAmount: moneyAmountSchema,
			proposedCurrencyCode: currencyCodeSchema,
			proposedGradeId: humanResourcesCompensationGradeIdSchema
				.nullable()
				.optional(),
			proposedSalaryBandId: humanResourcesSalaryBandIdSchema
				.nullable()
				.optional(),
			effectiveFrom: isoDateSchema,
			recommendationNote: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type RecordCompensationRecommendationInput = z.infer<
	typeof recordCompensationRecommendationInputSchema
>;

export const finalizeCompensationReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type FinalizeCompensationReviewInput = z.infer<
	typeof finalizeCompensationReviewInputSchema
>;

export const applyApprovedCompensationResultInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
			reason: z.string().trim().min(1).max(500),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export type ApplyApprovedCompensationResultInput = z.infer<
	typeof applyApprovedCompensationResultInputSchema
>;

export const createBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(50),
		name: z.string().trim().min(1).max(200),
		eligibilityNote: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

export type CreateBenefitPlanInput = z.infer<
	typeof createBenefitPlanInputSchema
>;

export const updateBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		planId: humanResourcesBenefitPlanIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		eligibilityNote: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type UpdateBenefitPlanInput = z.infer<
	typeof updateBenefitPlanInputSchema
>;

export const archiveBenefitPlanInputSchema = humanResourcesMutationContextSchema
	.extend({
		planId: humanResourcesBenefitPlanIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type ArchiveBenefitPlanInput = z.infer<
	typeof archiveBenefitPlanInputSchema
>;

export const enrolBenefitInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		employeeId: humanResourcesEmployeeIdSchema,
		employmentId: humanResourcesEmploymentIdSchema,
		planId: humanResourcesBenefitPlanIdSchema,
		effectiveFrom: isoDateSchema,
	})
	.strict();

export type EnrolBenefitInput = z.infer<typeof enrolBenefitInputSchema>;

export const endBenefitEnrollmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
			endsOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndBenefitEnrollmentInput = z.infer<
	typeof endBenefitEnrollmentInputSchema
>;

export const cancelBenefitEnrollmentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type CancelBenefitEnrollmentInput = z.infer<
	typeof cancelBenefitEnrollmentInputSchema
>;

export const getApprovedCompensationHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
		})
		.strict();

export type GetApprovedCompensationHandoffInput = z.infer<
	typeof getApprovedCompensationHandoffInputSchema
>;
