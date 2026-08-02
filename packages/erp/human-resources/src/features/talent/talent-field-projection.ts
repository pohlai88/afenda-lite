import type { HumanResourcesFieldProjection } from "../../kernel/authorization/authorization-types";
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
} from "../../kernel/contracts";
import { TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES } from "../../kernel/privacy/field-projection";

export type ProjectedTalentProfileAssessment = Omit<
	TalentProfileAssessment,
	"classification" | "evidenceSummary"
> & {
	classification: string | null;
	evidenceSummary: string | null;
};

export type ProjectedTalentProfileAssessmentListPage = Omit<
	TalentProfileAssessmentListPage,
	"assessments"
> & {
	assessments: ProjectedTalentProfileAssessment[];
};

export type ProjectedTalentProfileMobility = Omit<
	TalentProfileMobility,
	"preferenceCode" | "scopeDetail" | "evidenceSummary"
> & {
	preferenceCode: TalentProfileMobility["preferenceCode"] | null;
	scopeDetail: string | null;
	evidenceSummary: string | null;
};

export type ProjectedTalentProfileMobilityListPage = Omit<
	TalentProfileMobilityListPage,
	"mobilities"
> & {
	mobilities: ProjectedTalentProfileMobility[];
};

export type ProjectedTalentCriticalRoleReadiness = Omit<
	TalentCriticalRoleReadiness,
	"readiness" | "readinessEffectiveOn" | "evidenceSummary"
> & {
	readiness: TalentCriticalRoleReadiness["readiness"] | null;
	readinessEffectiveOn: string | null;
	evidenceSummary: string | null;
};

export type ProjectedTalentCriticalRoleReadinessListPage = Omit<
	TalentCriticalRoleReadinessListPage,
	"readinessRecords"
> & {
	readinessRecords: ProjectedTalentCriticalRoleReadiness[];
};

export type ProjectedCompetencyAssessment = Omit<
	CompetencyAssessment,
	"level" | "evidenceSource"
> & {
	level: number | null;
	evidenceSource: string | null;
};

export type ProjectedEmployeeCompetencyProfile = Omit<
	EmployeeCompetencyProfile,
	"assessments"
> & {
	assessments: ProjectedCompetencyAssessment[];
};

export type ProjectedSuccessionCandidate = Omit<
	SuccessionCandidate,
	"readiness" | "readinessEffectiveOn" | "evidenceSummary"
> & {
	readiness: SuccessionCandidate["readiness"] | null;
	readinessEffectiveOn: string | null;
	evidenceSummary: string | null;
};

export type ProjectedSuccessionCandidateListPage = Omit<
	SuccessionCandidateListPage,
	"candidates"
> & {
	candidates: ProjectedSuccessionCandidate[];
};

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

function isFieldDenied(
	projection: HumanResourcesFieldProjection | undefined,
	field: string,
): boolean {
	return projection?.deniedFields.includes(field) ?? false;
}

export function projectTalentProfileFromDecision(
	profile: TalentProfile | null,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): TalentProfile | null {
	if (profile === null) {
		return null;
	}
	return {
		...profile,
		currentClassification:
			!options.includeSensitive ||
			isFieldDenied(projection, "currentClassification")
				? null
				: profile.currentClassification,
	};
}

export function projectTalentProfileAssessmentFromDecision(
	assessment: TalentProfileAssessment,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): ProjectedTalentProfileAssessment {
	return {
		...assessment,
		classification:
			!options.includeSensitive || isFieldDenied(projection, "classification")
				? null
				: assessment.classification,
		evidenceSummary:
			!options.includeSensitive || isFieldDenied(projection, "evidenceSummary")
				? null
				: assessment.evidenceSummary,
	};
}

export function projectTalentProfileAssessmentListFromDecision(
	page: TalentProfileAssessmentListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): ProjectedTalentProfileAssessmentListPage {
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
): ProjectedTalentProfileMobility {
	return {
		...mobility,
		preferenceCode:
			!options.includeSensitive || isFieldDenied(projection, "preferenceCode")
				? null
				: mobility.preferenceCode,
		scopeDetail:
			!options.includeSensitive || isFieldDenied(projection, "scopeDetail")
				? null
				: mobility.scopeDetail,
		evidenceSummary:
			!options.includeSensitive || isFieldDenied(projection, "evidenceSummary")
				? null
				: mobility.evidenceSummary,
	};
}

export function projectTalentProfileMobilityListFromDecision(
	page: TalentProfileMobilityListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): ProjectedTalentProfileMobilityListPage {
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
): ProjectedTalentCriticalRoleReadiness {
	return {
		...readiness,
		readiness:
			!options.includeSensitive || isFieldDenied(projection, "readiness")
				? null
				: readiness.readiness,
		readinessEffectiveOn:
			!options.includeSensitive ||
			isFieldDenied(projection, "readinessEffectiveOn")
				? null
				: readiness.readinessEffectiveOn,
		evidenceSummary:
			!options.includeSensitive || isFieldDenied(projection, "evidenceSummary")
				? null
				: readiness.evidenceSummary,
	};
}

export function projectCriticalRoleReadinessListFromDecision(
	page: TalentCriticalRoleReadinessListPage,
	projection: HumanResourcesFieldProjection | undefined,
	options: { includeSensitive: boolean },
): ProjectedTalentCriticalRoleReadinessListPage {
	return {
		readinessRecords: page.readinessRecords.map((readiness) =>
			projectCriticalRoleReadinessFromDecision(readiness, projection, options),
		),
	};
}

export function projectCompetencyAssessmentFromDecision(
	assessment: CompetencyAssessment,
	projection: HumanResourcesFieldProjection | undefined,
): ProjectedCompetencyAssessment {
	return {
		...assessment,
		level: isFieldDenied(projection, "level") ? null : assessment.level,
		evidenceSource: isFieldDenied(projection, "evidenceSource")
			? null
			: assessment.evidenceSource,
	};
}

export function projectEmployeeCompetencyProfileFromDecision(
	profile: EmployeeCompetencyProfile,
	projection: HumanResourcesFieldProjection | undefined,
): ProjectedEmployeeCompetencyProfile {
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
): ProjectedSuccessionCandidate {
	return {
		...candidate,
		readiness: isFieldDenied(projection, "readiness")
			? null
			: candidate.readiness,
		readinessEffectiveOn: isFieldDenied(projection, "readinessEffectiveOn")
			? null
			: candidate.readinessEffectiveOn,
		evidenceSummary: isFieldDenied(projection, "evidenceSummary")
			? null
			: candidate.evidenceSummary,
	};
}

export function projectSuccessionCandidateListFromDecision(
	page: SuccessionCandidateListPage,
	projection: HumanResourcesFieldProjection | undefined,
): ProjectedSuccessionCandidateListPage {
	return {
		...page,
		candidates: page.candidates.map((candidate) =>
			projectSuccessionCandidateFromDecision(candidate, projection),
		),
	};
}

export function projectCareerPlanFromDecision(
	plan: CareerPlan,
	_projection: HumanResourcesFieldProjection | undefined,
): CareerPlan {
	return { ...plan };
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
	_projection: HumanResourcesFieldProjection | undefined,
): TalentPoolMember {
	return { ...member };
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
