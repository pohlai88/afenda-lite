import { z } from "zod";

export const COMPENSATION_GRADE_STATUSES = ["active", "archived"] as const;
export type CompensationGradeStatus =
	(typeof COMPENSATION_GRADE_STATUSES)[number];

export const SALARY_BAND_STATUSES = [
	"active",
	"superseded",
	"archived",
] as const;
export type SalaryBandStatus = (typeof SALARY_BAND_STATUSES)[number];

export const PAY_FREQUENCIES = [
	"weekly",
	"biweekly",
	"semimonthly",
	"monthly",
	"annual",
] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const EMPLOYEE_COMPENSATION_STATUSES = [
	"draft",
	"scheduled",
	"active",
	"ended",
	"superseded",
] as const;
export type EmployeeCompensationStatus =
	(typeof EMPLOYEE_COMPENSATION_STATUSES)[number];

export const COMPENSATION_PROPOSAL_STATUSES = ["draft", "approved"] as const;
export type CompensationProposalStatus =
	(typeof COMPENSATION_PROPOSAL_STATUSES)[number];

export const COMPENSATION_REVIEW_STATUSES = [
	"draft",
	"recorded",
	"finalized",
] as const;
export type CompensationReviewStatus =
	(typeof COMPENSATION_REVIEW_STATUSES)[number];

export const COMPENSATION_REVIEW_CYCLE_STATUSES = [
	"draft",
	"open",
	"closed",
	"cancelled",
] as const;
export type CompensationReviewCycleStatus =
	(typeof COMPENSATION_REVIEW_CYCLE_STATUSES)[number];

export const BENEFIT_PLAN_STATUSES = ["active", "archived"] as const;
export type BenefitPlanStatus = (typeof BENEFIT_PLAN_STATUSES)[number];

export const COMPENSATION_GRADE_PROGRESSION_RULE_STATUSES = [
	"active",
	"archived",
] as const;
export type CompensationGradeProgressionRuleStatus =
	(typeof COMPENSATION_GRADE_PROGRESSION_RULE_STATUSES)[number];

export const BENEFIT_ENROLLMENT_STATUSES = [
	"active",
	"ended",
	"cancelled",
	"waived",
] as const;
export type BenefitEnrollmentStatus =
	(typeof BENEFIT_ENROLLMENT_STATUSES)[number];

export const BENEFIT_DEPENDENT_RELATIONSHIPS = [
	"spouse",
	"child",
	"other",
] as const;
export type BenefitDependentRelationship =
	(typeof BENEFIT_DEPENDENT_RELATIONSHIPS)[number];

export const compensationGradeStatusSchema = z.enum(
	COMPENSATION_GRADE_STATUSES,
);
export const salaryBandStatusSchema = z.enum(SALARY_BAND_STATUSES);
export const payFrequencySchema = z.enum(PAY_FREQUENCIES);
export const employeeCompensationStatusSchema = z.enum(
	EMPLOYEE_COMPENSATION_STATUSES,
);
export const compensationProposalStatusSchema = z.enum(
	COMPENSATION_PROPOSAL_STATUSES,
);
export const compensationReviewStatusSchema = z.enum(
	COMPENSATION_REVIEW_STATUSES,
);
export const compensationReviewCycleStatusSchema = z.enum(
	COMPENSATION_REVIEW_CYCLE_STATUSES,
);
export const benefitPlanStatusSchema = z.enum(BENEFIT_PLAN_STATUSES);
export const compensationGradeProgressionRuleStatusSchema = z.enum(
	COMPENSATION_GRADE_PROGRESSION_RULE_STATUSES,
);
export const benefitEnrollmentStatusSchema = z.enum(
	BENEFIT_ENROLLMENT_STATUSES,
);
export const benefitDependentRelationshipSchema = z.enum(
	BENEFIT_DEPENDENT_RELATIONSHIPS,
);

export function isCompensationGradeActive(
	status: CompensationGradeStatus,
): boolean {
	return status === "active";
}

export function isSalaryBandActive(status: SalaryBandStatus): boolean {
	return status === "active";
}

export function isEmployeeCompensationActive(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "active";
}

export function isEmployeeCompensationDraft(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "draft";
}

export function isEmployeeCompensationScheduled(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "scheduled";
}

export function isCompensationProposalDraft(
	status: CompensationProposalStatus,
): boolean {
	return status === "draft";
}

export function isCompensationProposalApproved(
	status: CompensationProposalStatus,
): boolean {
	return status === "approved";
}

export function isCompensationReviewDraft(
	status: CompensationReviewStatus,
): boolean {
	return status === "draft";
}

export function isCompensationReviewRecorded(
	status: CompensationReviewStatus,
): boolean {
	return status === "recorded";
}

export function isCompensationReviewFinalized(
	status: CompensationReviewStatus,
): boolean {
	return status === "finalized";
}

export function isCompensationReviewCycleOpen(
	status: CompensationReviewCycleStatus,
): boolean {
	return status === "open";
}

export function isBenefitPlanActive(status: BenefitPlanStatus): boolean {
	return status === "active";
}

export function isCompensationGradeProgressionRuleActive(
	status: CompensationGradeProgressionRuleStatus,
): boolean {
	return status === "active";
}

export function isBenefitEnrollmentActive(
	status: BenefitEnrollmentStatus,
): boolean {
	return status === "active";
}

export function isBenefitEnrollmentWaived(
	status: BenefitEnrollmentStatus,
): boolean {
	return status === "waived";
}

export function isBenefitEnrollmentOpen(
	status: BenefitEnrollmentStatus,
): boolean {
	return status === "active" || status === "waived";
}
