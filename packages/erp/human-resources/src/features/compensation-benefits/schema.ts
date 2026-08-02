import { handoffMoneyAmountSchema } from "@afenda/events/schemas";
import { z } from "zod";
import {
	humanResourcesApplicationIdSchema,
	humanResourcesBenefitEnrollmentDependentIdSchema,
	humanResourcesBenefitEnrollmentIdSchema,
	humanResourcesBenefitPlanIdSchema,
	humanResourcesCompensationGradeIdSchema,
	humanResourcesCompensationGradeProgressionRuleIdSchema,
	humanResourcesCompensationProposalIdSchema,
	humanResourcesCompensationReviewCycleIdSchema,
	humanResourcesCompensationReviewIdSchema,
	humanResourcesEmployeeCompensationIdSchema,
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesSalaryBandIdSchema,
} from "../../kernel/identity/brands";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../../kernel/validation/common";
import { employmentStatusSchema } from "../workforce-records/employment/employment-status";
import {
	benefitDependentRelationshipSchema,
	compensationReviewCycleStatusSchema,
	payFrequencySchema,
} from "./status";

const moneyAmountSchema = handoffMoneyAmountSchema;
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
			supersededSalaryBandId: humanResourcesSalaryBandIdSchema.optional(),
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

export const getCompensationGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
		})
		.strict();

export type GetCompensationGradeInput = z.infer<
	typeof getCompensationGradeInputSchema
>;

export const listCompensationGradesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
			status: z.enum(["active", "archived"]).optional(),
		})
		.strict();

export type ListCompensationGradesInput = z.infer<
	typeof listCompensationGradesInputSchema
>;

export const getSalaryBandInputSchema = humanResourcesMutationContextSchema
	.extend({
		salaryBandId: humanResourcesSalaryBandIdSchema,
	})
	.strict();

export type GetSalaryBandInput = z.infer<typeof getSalaryBandInputSchema>;

export const listSalaryBandsByGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
			status: z.enum(["active", "superseded", "archived"]).optional(),
		})
		.strict();

export type ListSalaryBandsByGradeInput = z.infer<
	typeof listSalaryBandsByGradeInputSchema
>;

export const findSalaryBandByGradeAndCurrencyAsOfInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			gradeId: humanResourcesCompensationGradeIdSchema,
			currencyCode: currencyCodeSchema,
			asOf: isoDateSchema,
		})
		.strict();

export type FindSalaryBandByGradeAndCurrencyAsOfInput = z.infer<
	typeof findSalaryBandByGradeAndCurrencyAsOfInputSchema
>;

export const createCompensationGradeProgressionRuleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			fromGradeId: humanResourcesCompensationGradeIdSchema,
			toGradeId: humanResourcesCompensationGradeIdSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			minMonthsInGrade: z.number().int().nonnegative().nullable().optional(),
		})
		.strict();

export type CreateCompensationGradeProgressionRuleInput = z.infer<
	typeof createCompensationGradeProgressionRuleInputSchema
>;

export const archiveCompensationGradeProgressionRuleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			progressionRuleId: humanResourcesCompensationGradeProgressionRuleIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ArchiveCompensationGradeProgressionRuleInput = z.infer<
	typeof archiveCompensationGradeProgressionRuleInputSchema
>;

export const getCompensationGradeProgressionRuleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			progressionRuleId: humanResourcesCompensationGradeProgressionRuleIdSchema,
		})
		.strict();

export type GetCompensationGradeProgressionRuleInput = z.infer<
	typeof getCompensationGradeProgressionRuleInputSchema
>;

export const listCompensationGradeProgressionRulesFromGradeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			fromGradeId: humanResourcesCompensationGradeIdSchema,
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
			asOf: isoDateSchema.optional(),
		})
		.strict();

export type ListCompensationGradeProgressionRulesFromGradeInput = z.infer<
	typeof listCompensationGradeProgressionRulesFromGradeInputSchema
>;

export const listEligibleProgressionTargetsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			fromGradeId: humanResourcesCompensationGradeIdSchema,
			asOf: isoDateSchema,
		})
		.strict();

export type ListEligibleProgressionTargetsInput = z.infer<
	typeof listEligibleProgressionTargetsInputSchema
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
			payFrequency: payFrequencySchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			reason: z.string().trim().min(1).max(500),
			confidentialNote: z.string().trim().max(4000).nullable().optional(),
			sourceReviewId: humanResourcesCompensationReviewIdSchema
				.nullable()
				.optional(),
		})
		.strict();

export type CreateEmployeeCompensationInput = z.infer<
	typeof createEmployeeCompensationInputSchema
>;

export const amendEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			baseAmount: moneyAmountSchema.optional(),
			currencyCode: currencyCodeSchema.optional(),
			payFrequency: payFrequencySchema.optional(),
			effectiveFrom: isoDateSchema.optional(),
			effectiveTo: isoDateSchema.nullable().optional(),
			reason: z.string().trim().min(1).max(500).optional(),
			gradeId: humanResourcesCompensationGradeIdSchema.nullish(),
			salaryBandId: humanResourcesSalaryBandIdSchema.nullish(),
			confidentialNote: z.string().trim().max(4000).nullish(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AmendEmployeeCompensationInput = z.infer<
	typeof amendEmployeeCompensationInputSchema
>;

export const approveEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveEmployeeCompensationInput = z.infer<
	typeof approveEmployeeCompensationInputSchema
>;

export const scheduleEmployeeCompensationChangeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			baseAmount: moneyAmountSchema,
			currencyCode: currencyCodeSchema,
			payFrequency: payFrequencySchema,
			effectiveFrom: isoDateSchema,
			reason: z.string().trim().min(1).max(500),
			gradeId: humanResourcesCompensationGradeIdSchema.nullable().optional(),
			salaryBandId: humanResourcesSalaryBandIdSchema.nullable().optional(),
			confidentialNote: z.string().trim().max(4000).nullable().optional(),
		})
		.strict();

export type ScheduleEmployeeCompensationChangeInput = z.infer<
	typeof scheduleEmployeeCompensationChangeInputSchema
>;

export const activateEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ActivateEmployeeCompensationInput = z.infer<
	typeof activateEmployeeCompensationInputSchema
>;

export const correctEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			compensationId: humanResourcesEmployeeCompensationIdSchema,
			baseAmount: moneyAmountSchema,
			currencyCode: currencyCodeSchema,
			payFrequency: payFrequencySchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			reason: z.string().trim().min(1).max(500),
			evidenceReference: z.string().trim().max(500).nullable().optional(),
			gradeId: humanResourcesCompensationGradeIdSchema.nullable().optional(),
			salaryBandId: humanResourcesSalaryBandIdSchema.nullable().optional(),
			confidentialNote: z.string().trim().max(4000).nullable().optional(),
		})
		.strict();

export type CorrectEmployeeCompensationInput = z.infer<
	typeof correctEmployeeCompensationInputSchema
>;

export const getEmployeeCompensationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			compensationId: humanResourcesEmployeeCompensationIdSchema,
		})
		.strict();

export type GetEmployeeCompensationInput = z.infer<
	typeof getEmployeeCompensationInputSchema
>;

export const listEmployeeCompensationsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
		})
		.strict();

export type ListEmployeeCompensationsInput = z.infer<
	typeof listEmployeeCompensationsInputSchema
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
			cycleId: humanResourcesCompensationReviewCycleIdSchema,
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

export const createCompensationReviewCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			name: z.string().trim().min(1).max(200),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			budgetTotalAmount: moneyAmountSchema,
			budgetCurrencyCode: currencyCodeSchema,
		})
		.strict();

export type CreateCompensationReviewCycleInput = z.infer<
	typeof createCompensationReviewCycleInputSchema
>;

export const compensationReviewCycleStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesCompensationReviewCycleIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getCompensationReviewCycleInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			cycleId: humanResourcesCompensationReviewCycleIdSchema,
		})
		.strict();

export type GetCompensationReviewCycleInput = z.infer<
	typeof getCompensationReviewCycleInputSchema
>;

export const listCompensationReviewCyclesInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
			status: compensationReviewCycleStatusSchema.optional(),
		})
		.strict();

export type ListCompensationReviewCyclesInput = z.infer<
	typeof listCompensationReviewCyclesInputSchema
>;

export const getCompensationReviewInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reviewId: humanResourcesCompensationReviewIdSchema,
		})
		.strict();

export type GetCompensationReviewInput = z.infer<
	typeof getCompensationReviewInputSchema
>;

export const listCompensationReviewsByEmployeeInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
		})
		.strict();

export type ListCompensationReviewsByEmployeeInput = z.infer<
	typeof listCompensationReviewsByEmployeeInputSchema
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
		effectiveTo: isoDateSchema.nullable().optional(),
		employeeContributionAmount: z.string().trim().min(1).nullable().optional(),
		employerContributionAmount: z.string().trim().min(1).nullable().optional(),
		contributionCurrencyCode: z.string().trim().length(3).nullable().optional(),
		contributionFrequency: payFrequencySchema.nullable().optional(),
	})
	.strict();

export type EnrolBenefitInput = z.infer<typeof enrolBenefitInputSchema>;

export const setBenefitPlanEligibilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesBenefitPlanIdSchema,
			minTenureDays: z.number().int().nonnegative().nullable(),
			allowedEmploymentStatuses: z.array(employmentStatusSchema).min(1),
		})
		.strict();

export type SetBenefitPlanEligibilityInput = z.infer<
	typeof setBenefitPlanEligibilityInputSchema
>;

export const getBenefitPlanEligibilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesBenefitPlanIdSchema,
		})
		.strict();

export type GetBenefitPlanEligibilityInput = z.infer<
	typeof getBenefitPlanEligibilityInputSchema
>;

export const waiveBenefitInputSchema = humanResourcesMutationContextSchema
	.extend({
		enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
		waiverReason: z.string().trim().min(1).max(2000),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export type WaiveBenefitInput = z.infer<typeof waiveBenefitInputSchema>;

export const addBenefitEnrollmentDependentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			enrollmentId: humanResourcesBenefitEnrollmentIdSchema,
			dependentName: z.string().trim().min(1).max(200),
			relationship: benefitDependentRelationshipSchema,
			effectiveFrom: isoDateSchema,
		})
		.strict();

export type AddBenefitEnrollmentDependentInput = z.infer<
	typeof addBenefitEnrollmentDependentInputSchema
>;

export const endBenefitEnrollmentDependentInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			dependentId: humanResourcesBenefitEnrollmentDependentIdSchema,
			endsOn: isoDateSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type EndBenefitEnrollmentDependentInput = z.infer<
	typeof endBenefitEnrollmentDependentInputSchema
>;

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
			employmentId: humanResourcesEmploymentIdSchema,
			effectiveDate: isoDateSchema,
		})
		.strict();

export type GetApprovedCompensationHandoffInput = z.infer<
	typeof getApprovedCompensationHandoffInputSchema
>;

export const createCompensationProposalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			applicationId: humanResourcesApplicationIdSchema,
			proposedBaseAmount: moneyAmountSchema.optional(),
			proposedCurrencyCode: currencyCodeSchema.optional(),
			proposedGradeId: humanResourcesCompensationGradeIdSchema.nullish(),
			proposedSalaryBandId: humanResourcesSalaryBandIdSchema.nullish(),
			confidentialNote: z.string().trim().max(4000).nullish(),
		})
		.strict();

export type CreateCompensationProposalInput = z.infer<
	typeof createCompensationProposalInputSchema
>;

export const amendCompensationProposalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			proposalId: humanResourcesCompensationProposalIdSchema,
			proposedBaseAmount: moneyAmountSchema.optional(),
			proposedCurrencyCode: currencyCodeSchema.optional(),
			proposedGradeId: humanResourcesCompensationGradeIdSchema.nullish(),
			proposedSalaryBandId: humanResourcesSalaryBandIdSchema.nullish(),
			confidentialNote: z.string().trim().max(4000).nullish(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type AmendCompensationProposalInput = z.infer<
	typeof amendCompensationProposalInputSchema
>;

export const approveCompensationProposalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			proposalId: humanResourcesCompensationProposalIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export type ApproveCompensationProposalInput = z.infer<
	typeof approveCompensationProposalInputSchema
>;

export const getCompensationProposalInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			proposalId: humanResourcesCompensationProposalIdSchema,
		})
		.strict();

export type GetCompensationProposalInput = z.infer<
	typeof getCompensationProposalInputSchema
>;

export const listCompensationProposalsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			applicationId: humanResourcesApplicationIdSchema.optional(),
			page: z.number().int().positive().default(1),
			pageSize: z.number().int().positive().max(100).default(20),
		})
		.strict();

export type ListCompensationProposalsInput = z.infer<
	typeof listCompensationProposalsInputSchema
>;
