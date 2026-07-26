import type { HumanResourcesFieldProjection } from "../shared/authorization-types";
import { TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES } from "../shared/field-projection";
import type {
	CareerPlan,
	CareerPlanListPage,
	CareerPlanWithActions,
	CompetencyAssessment,
	EmployeeCompetencyProfile,
	SuccessionCandidate,
	SuccessionCandidateListPage,
	TalentCriticalRoleReadiness,
	TalentCriticalRoleReadinessListPage,
	TalentPoolMember,
	TalentPoolMemberListPage,
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileAssessmentListPage,
	TalentProfileMobility,
	TalentProfileMobilityListPage,
} from "../types";

export const TALENT_PROFILE_SENSITIVE_FIELD_NAMES = [
	"currentClassification",
] as const;

export const TALENT_PROFILE_MOBILITY_SENSITIVE_FIELD_NAMES = [
	"preferenceCode",
	"scopeDetail",
	"evidenceSummary",
] as const;

export const CRITICAL_ROLE_READINESS_SENSITIVE_FIELD_NAMES = [
	"readiness",
	"readinessEffectiveOn",
	"evidenceSummary",
] as const;

export const TALENT_PROFILE_ASSESSMENT_SENSITIVE_FIELD_NAMES = [
	"classification",
	"evidenceSummary",
] as const;

export const SUCCESSION_CANDIDATE_SENSITIVE_FIELD_NAMES = [
	"readiness",
	"readinessEffectiveOn",
	"evidenceSummary",
] as const;

function redactDeniedFields<T extends Record<string, unknown>>(
	data: T,
	projection: HumanResourcesFieldProjection | undefined,
	sensitiveFields: readonly string[],
): T {
	if (projection === undefined) {
		return data;
	}
	const denied = new Set(projection.deniedFields);
	const result = { ...data };
	for (const field of sensitiveFields) {
		if (denied.has(field) && field in result) {
			(result as Record<string, unknown>)[field] = null;
		}
	}
	return result;
}

export function projectTalentProfileFromDecision(
	profile: TalentProfile | null,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfile | null {
	if (profile === null) {
		return null;
	}
	if (!options.includeSensitive) {
		return { ...profile, currentClassification: null };
	}
	return redactDeniedFields(
		profile,
		projection,
		TALENT_PROFILE_SENSITIVE_FIELD_NAMES,
	);
}

export function projectTalentProfileAssessmentFromDecision(
	assessment: TalentProfileAssessment,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfileAssessment {
	if (!options.includeSensitive) {
		return {
			...assessment,
			classification: "",
			evidenceSummary: "",
		};
	}
	return redactDeniedFields(
		assessment as unknown as Record<string, unknown>,
		projection,
		TALENT_PROFILE_ASSESSMENT_SENSITIVE_FIELD_NAMES,
	) as TalentProfileAssessment;
}

export function projectTalentProfileAssessmentListFromDecision(
	page: TalentProfileAssessmentListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfileAssessmentListPage {
	return {
		assessments: page.assessments.map((assessment) =>
			projectTalentProfileAssessmentFromDecision(
				assessment,
				projection,
				options,
			),
		),
	};
}

export function projectTalentProfileMobilityFromDecision(
	mobility: TalentProfileMobility,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfileMobility {
	if (!options.includeSensitive) {
		return {
			...mobility,
			preferenceCode: "not_open",
			scopeDetail: null,
			evidenceSummary: "",
		};
	}
	return redactDeniedFields(
		mobility as unknown as Record<string, unknown>,
		projection,
		TALENT_PROFILE_MOBILITY_SENSITIVE_FIELD_NAMES,
	) as TalentProfileMobility;
}

export function projectTalentProfileMobilityListFromDecision(
	page: TalentProfileMobilityListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfileMobilityListPage {
	return {
		mobilities: page.mobilities.map((mobility) =>
			projectTalentProfileMobilityFromDecision(mobility, projection, options),
		),
	};
}

export function projectCriticalRoleReadinessFromDecision(
	readiness: TalentCriticalRoleReadiness,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentCriticalRoleReadiness {
	if (!options.includeSensitive) {
		return {
			...readiness,
			readiness: "not_ready",
			readinessEffectiveOn: "",
			evidenceSummary: "",
		};
	}
	return redactDeniedFields(
		readiness as unknown as Record<string, unknown>,
		projection,
		CRITICAL_ROLE_READINESS_SENSITIVE_FIELD_NAMES,
	) as TalentCriticalRoleReadiness;
}

export function projectCriticalRoleReadinessListFromDecision(
	page: TalentCriticalRoleReadinessListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentCriticalRoleReadinessListPage {
	return {
		readinessRecords: page.readinessRecords.map((readiness) =>
			projectCriticalRoleReadinessFromDecision(readiness, projection, options),
		),
	};
}

export function projectCompetencyAssessmentFromDecision(
	assessment: CompetencyAssessment,
	projection: HumanResourcesFieldProjection | undefined,
): CompetencyAssessment {
	return redactDeniedFields(
		assessment as unknown as Record<string, unknown>,
		projection,
		TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
	) as CompetencyAssessment;
}

export function projectEmployeeCompetencyProfileFromDecision(
	profile: EmployeeCompetencyProfile,
	projection: HumanResourcesFieldProjection | undefined,
): EmployeeCompetencyProfile {
	return {
		...profile,
		assessments: profile.assessments.map((assessment) =>
			projectCompetencyAssessmentFromDecision(assessment, projection),
		),
	};
}

export function projectSuccessionCandidateFromDecision(
	candidate: SuccessionCandidate,
	projection: HumanResourcesFieldProjection | undefined,
): SuccessionCandidate {
	return redactDeniedFields(
		candidate as unknown as Record<string, unknown>,
		projection,
		[
			...SUCCESSION_CANDIDATE_SENSITIVE_FIELD_NAMES,
			...TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
		],
	) as SuccessionCandidate;
}

export function projectSuccessionCandidateListFromDecision(
	page: SuccessionCandidateListPage,
	projection: HumanResourcesFieldProjection | undefined,
): SuccessionCandidateListPage {
	return {
		...page,
		candidates: page.candidates.map((candidate) =>
			projectSuccessionCandidateFromDecision(candidate, projection),
		),
	};
}

export function projectCareerPlanFromDecision(
	plan: CareerPlan,
	projection: HumanResourcesFieldProjection | undefined,
): CareerPlan {
	return redactDeniedFields(
		plan as unknown as Record<string, unknown>,
		projection,
		TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
	) as CareerPlan;
}

export function projectCareerPlanWithActionsFromDecision(
	plan: CareerPlanWithActions,
	projection: HumanResourcesFieldProjection | undefined,
): CareerPlanWithActions {
	const projected = projectCareerPlanFromDecision(plan, projection);
	return {
		...projected,
		actions: plan.actions,
	};
}

export function projectCareerPlanListFromDecision(
	page: CareerPlanListPage,
	projection: HumanResourcesFieldProjection | undefined,
): CareerPlanListPage {
	return {
		...page,
		careerPlans: page.careerPlans.map((plan) =>
			projectCareerPlanFromDecision(plan, projection),
		),
	};
}

export function projectTalentPoolMemberFromDecision(
	member: TalentPoolMember,
	projection: HumanResourcesFieldProjection | undefined,
): TalentPoolMember {
	return redactDeniedFields(
		member as unknown as Record<string, unknown>,
		projection,
		TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
	) as TalentPoolMember;
}

export function projectTalentPoolMemberListFromDecision(
	page: TalentPoolMemberListPage,
	projection: HumanResourcesFieldProjection | undefined,
): TalentPoolMemberListPage {
	return {
		...page,
		members: page.members.map((member) =>
			projectTalentPoolMemberFromDecision(member, projection),
		),
	};
}

export function talentSuccessionReadRequestedFields(): string[] {
	return [...TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES];
}

/** Request public row keys alongside sensitive fields so field_access_denied cannot trigger on reads. */
export function talentSensitiveQueryRequestedFields(
	sensitiveFields: readonly string[] = TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
): string[] {
	return ["organizationId", "employeeId", ...sensitiveFields];
}
