import { z } from "zod";

export const COMPETENCY_STATUSES = ["active", "retired"] as const;
export type CompetencyStatus = (typeof COMPETENCY_STATUSES)[number];

export const COMPETENCY_SCALE_CODES = [
	"five_point",
	"behavioral_anchor",
] as const;
export type CompetencyScaleCode = (typeof COMPETENCY_SCALE_CODES)[number];

export const JOB_COMPETENCY_STATUSES = ["active", "removed"] as const;
export type JobCompetencyStatus = (typeof JOB_COMPETENCY_STATUSES)[number];

export const COMPETENCY_ASSESSMENT_STATUSES = [
	"current",
	"superseded",
] as const;
export type CompetencyAssessmentStatus =
	(typeof COMPETENCY_ASSESSMENT_STATUSES)[number];

export const TALENT_PROFILE_STATUSES = ["active", "archived"] as const;
export type TalentProfileStatus = (typeof TALENT_PROFILE_STATUSES)[number];

export const TALENT_PROFILE_ASSESSMENT_STATUSES = [
	"draft",
	"confirmed",
	"superseded",
] as const;
export type TalentProfileAssessmentStatus =
	(typeof TALENT_PROFILE_ASSESSMENT_STATUSES)[number];

export const TALENT_PROFILE_ASSESSMENT_METHOD_CODES = [
	"calibration_panel",
	"assessment_center",
	"manager_evidence_review",
] as const;
export type TalentProfileAssessmentMethodCode =
	(typeof TALENT_PROFILE_ASSESSMENT_METHOD_CODES)[number];

export const TALENT_POOL_STATUSES = ["open", "closed"] as const;
export type TalentPoolStatus = (typeof TALENT_POOL_STATUSES)[number];

export const TALENT_POOL_MEMBER_STATUSES = [
	"nominated",
	"approved",
	"removed",
] as const;
export type TalentPoolMemberStatus =
	(typeof TALENT_POOL_MEMBER_STATUSES)[number];

export const CAREER_PLAN_STATUSES = [
	"draft",
	"acknowledged",
	"active",
	"closed",
] as const;
export type CareerPlanStatus = (typeof CAREER_PLAN_STATUSES)[number];

export const CAREER_PLAN_ACTION_STATUSES = [
	"open",
	"done",
	"cancelled",
] as const;
export type CareerPlanActionStatus =
	(typeof CAREER_PLAN_ACTION_STATUSES)[number];

export const SUCCESSION_PLAN_STATUSES = ["draft", "active", "closed"] as const;
export type SuccessionPlanStatus = (typeof SUCCESSION_PLAN_STATUSES)[number];

export const SUCCESSION_CANDIDATE_STATUSES = [
	"nominated",
	"approved",
	"removed",
] as const;
export type SuccessionCandidateStatus =
	(typeof SUCCESSION_CANDIDATE_STATUSES)[number];

export const SUCCESSION_READINESS_CODES = [
	"not_ready",
	"ready_soon",
	"ready_now",
	"emerging",
] as const;
export type SuccessionReadinessCode =
	(typeof SUCCESSION_READINESS_CODES)[number];

export const competencyStatusSchema = z.enum(COMPETENCY_STATUSES);
export const competencyScaleCodeSchema = z.enum(COMPETENCY_SCALE_CODES);
export const jobCompetencyStatusSchema = z.enum(JOB_COMPETENCY_STATUSES);
export const competencyAssessmentStatusSchema = z.enum(
	COMPETENCY_ASSESSMENT_STATUSES,
);
export const talentProfileStatusSchema = z.enum(TALENT_PROFILE_STATUSES);
export const talentProfileAssessmentStatusSchema = z.enum(
	TALENT_PROFILE_ASSESSMENT_STATUSES,
);
export const talentProfileAssessmentMethodCodeSchema = z.enum(
	TALENT_PROFILE_ASSESSMENT_METHOD_CODES,
);
export const talentPoolStatusSchema = z.enum(TALENT_POOL_STATUSES);
export const talentPoolMemberStatusSchema = z.enum(TALENT_POOL_MEMBER_STATUSES);
export const careerPlanStatusSchema = z.enum(CAREER_PLAN_STATUSES);
export const careerPlanActionStatusSchema = z.enum(CAREER_PLAN_ACTION_STATUSES);
export const successionPlanStatusSchema = z.enum(SUCCESSION_PLAN_STATUSES);
export const successionCandidateStatusSchema = z.enum(
	SUCCESSION_CANDIDATE_STATUSES,
);
export const successionReadinessCodeSchema = z.enum(SUCCESSION_READINESS_CODES);

/** Maximum age (days) before a succession readiness assessment is considered stale. */
export const SUCCESSION_READINESS_MAX_AGE_DAYS = 365;

export function isCompetencyActive(status: CompetencyStatus): boolean {
	return status === "active";
}

export function isJobCompetencyActive(status: JobCompetencyStatus): boolean {
	return status === "active";
}

export function isCompetencyAssessmentCurrent(
	status: CompetencyAssessmentStatus,
): boolean {
	return status === "current";
}

export function isTalentProfileActive(status: TalentProfileStatus): boolean {
	return status === "active";
}

export function isTalentPoolOpen(status: TalentPoolStatus): boolean {
	return status === "open";
}

export function isTalentPoolMemberActive(
	status: TalentPoolMemberStatus,
): boolean {
	return status === "nominated" || status === "approved";
}

export function isCareerPlanOpen(status: CareerPlanStatus): boolean {
	return status !== "closed";
}

export function isCareerPlanActionOpen(
	status: CareerPlanActionStatus,
): boolean {
	return status === "open";
}

export function isSuccessionPlanActive(status: SuccessionPlanStatus): boolean {
	return status === "active";
}

export function isSuccessionCandidateActive(
	status: SuccessionCandidateStatus,
): boolean {
	return status === "nominated" || status === "approved";
}
