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

export const EMPLOYEE_COMPENSATION_STATUSES = ["active", "ended"] as const;
export type EmployeeCompensationStatus =
	(typeof EMPLOYEE_COMPENSATION_STATUSES)[number];

export const COMPENSATION_REVIEW_STATUSES = [
	"draft",
	"recorded",
	"finalized",
] as const;
export type CompensationReviewStatus =
	(typeof COMPENSATION_REVIEW_STATUSES)[number];

export const BENEFIT_PLAN_STATUSES = ["active", "archived"] as const;
export type BenefitPlanStatus = (typeof BENEFIT_PLAN_STATUSES)[number];

export const BENEFIT_ENROLLMENT_STATUSES = [
	"active",
	"ended",
	"cancelled",
] as const;
export type BenefitEnrollmentStatus =
	(typeof BENEFIT_ENROLLMENT_STATUSES)[number];

export const compensationGradeStatusSchema = z.enum(
	COMPENSATION_GRADE_STATUSES,
);
export const salaryBandStatusSchema = z.enum(SALARY_BAND_STATUSES);
export const employeeCompensationStatusSchema = z.enum(
	EMPLOYEE_COMPENSATION_STATUSES,
);
export const compensationReviewStatusSchema = z.enum(
	COMPENSATION_REVIEW_STATUSES,
);
export const benefitPlanStatusSchema = z.enum(BENEFIT_PLAN_STATUSES);
export const benefitEnrollmentStatusSchema = z.enum(
	BENEFIT_ENROLLMENT_STATUSES,
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

export function isCompensationReviewDraft(
	status: CompensationReviewStatus,
): boolean {
	return status === "draft";
}

export function isCompensationReviewFinalized(
	status: CompensationReviewStatus,
): boolean {
	return status === "finalized";
}

export function isBenefitPlanActive(status: BenefitPlanStatus): boolean {
	return status === "active";
}

export function isBenefitEnrollmentActive(
	status: BenefitEnrollmentStatus,
): boolean {
	return status === "active";
}
