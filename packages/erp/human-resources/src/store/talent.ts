import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesCareerPlanActionId,
	HumanResourcesCareerPlanId,
	HumanResourcesCompetencyAssessmentId,
	HumanResourcesCompetencyId,
	HumanResourcesEmployeeId,
	HumanResourcesJobCompetencyId,
	HumanResourcesJobId,
	HumanResourcesLearningAssignmentId,
	HumanResourcesPositionId,
	HumanResourcesSuccessionCandidateId,
	HumanResourcesSuccessionPlanId,
	HumanResourcesTalentPoolId,
	HumanResourcesTalentPoolMemberId,
	HumanResourcesTalentProfileAssessmentId,
	HumanResourcesTalentProfileId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type {
	CareerPlanStatus,
	CompetencyScaleCode,
	CompetencyStatus,
	SuccessionCandidateStatus,
	SuccessionPlanStatus,
	SuccessionReadinessCode,
	TalentMobilityDimension,
	TalentMobilityPreference,
	TalentPoolMemberStatus,
	TalentProfileAssessmentMethodCode,
} from "../shared/talent-status";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanListPage,
	CareerPlanWithActions,
	Competency,
	CompetencyAssessment,
	CompetencyListPage,
	EmployeeCompetencyProfile,
	IdempotentCareerPlanRecord,
	IdempotentCompetencyAssessmentRecord,
	IdempotentCompetencyRecord,
	IdempotentSuccessionCandidateRecord,
	IdempotentSuccessionPlanRecord,
	IdempotentTalentCriticalRoleReadinessRecord,
	IdempotentTalentPoolMemberRecord,
	IdempotentTalentPoolRecord,
	IdempotentTalentProfileMobilityRecord,
	IdempotentTalentProfileRecord,
	JobCompetency,
	JobCompetencyListPage,
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionCandidateListPage,
	SuccessionPlan,
	SuccessionPlanListPage,
	TalentCriticalRoleReadiness,
	TalentCriticalRoleReadinessListPage,
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileAssessmentListPage,
	TalentProfileMobility,
	TalentProfileMobilityListPage,
} from "../types";

/**
 * Persistence contract for Talent management and succession.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface CompetencyCreateRecord {
	category: string | null;
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	description: string | null;
	name: string;
	organizationId: string;
	scaleCode: CompetencyScaleCode;
}

export interface CompetencyAssessmentCreateRecord {
	assessorUserId: string;
	competencyId: HumanResourcesCompetencyId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	effectiveOn: string;
	employeeId: HumanResourcesEmployeeId;
	evidenceSource: string;
	expiresOn: string | null;
	level: number;
	organizationId: string;
	scaleCode: CompetencyScaleCode;
}

export interface CompetencyAssessmentSupersedeRecord {
	assessorUserId: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	effectiveOn: string;
	evidenceSource: string;
	expectedVersion: number;
	expiresOn: string | null;
	level: number;
	organizationId: string;
	sourceAssessmentId: HumanResourcesCompetencyAssessmentId;
}

export interface TalentProfileCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
	summary: string | null;
}

export interface TalentPoolCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	description: string | null;
	name: string;
	organizationId: string;
}

export interface TalentPoolMemberCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	nominatorUserId: string;
	organizationId: string;
	poolId: HumanResourcesTalentPoolId;
}

export interface TalentProfileMobilityCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	dimension: TalentMobilityDimension;
	effectiveFrom: string;
	effectiveTo: string | null;
	evidenceSummary: string;
	organizationId: string;
	preferenceCode: TalentMobilityPreference;
	scopeDetail: string | null;
	talentProfileId: HumanResourcesTalentProfileId;
}

export interface CriticalRoleReadinessCreateRecord {
	assessorUserId: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	evidenceSummary: string;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	talentProfileId: HumanResourcesTalentProfileId;
}

export interface CareerPlanCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	organizationId: string;
	ownerUserId: string;
	title: string;
}

export interface SuccessionPlanCreateRecord {
	allowsExternalCandidates: boolean;
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	organizationId: string;
	positionId: HumanResourcesPositionId;
	title: string;
}

export interface SuccessionCandidateCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId | null;
	evidenceSummary: string;
	externalCandidateRef: string | null;
	nominatorUserId: string;
	organizationId: string;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	successionPlanId: HumanResourcesSuccessionPlanId;
}

export interface HumanResourcesTalentStore {
	acknowledgeCareerPlan: (
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlan>>;
	// Talent — Career plan action
	addCareerPlanAction: (
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title: string;
			dueOn: string | null;
			learningAssignmentId: HumanResourcesLearningAssignmentId | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlanAction>>;

	approveSuccessionCandidate: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionCandidate>>;

	approveTalentPoolMember: (
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			approverUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPoolMember>>;

	archiveTalentProfile: (
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfile>>;

	assessSuccessionReadiness: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			readiness: SuccessionReadinessCode;
			readinessEffectiveOn: string;
			evidenceSummary: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionCandidate>>;

	closeCareerPlan: (
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlan>>;

	closeSuccessionPlan: (
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionPlan>>;

	closeTalentPool: (
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPool>>;

	completeCareerPlanAction: (
		input: {
			organizationId: string;
			actionId: HumanResourcesCareerPlanActionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlanAction>>;

	confirmTalentProfileAssessment: (
		input: {
			organizationId: string;
			assessmentId: HumanResourcesTalentProfileAssessmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfileAssessment>>;

	createCareerPlan: (
		record: CareerPlanCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlan>>;

	createCompetency: (
		record: CompetencyCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Competency>>;

	createCompetencyAssessment: (
		record: CompetencyAssessmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompetencyAssessment>>;

	createSuccessionPlan: (
		record: SuccessionPlanCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionPlan>>;

	createTalentPool: (
		record: TalentPoolCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPool>>;

	createTalentProfile: (
		record: TalentProfileCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfile>>;

	expireCompetencyAssessment: (
		input: {
			organizationId: string;
			assessmentId: HumanResourcesCompetencyAssessmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompetencyAssessment>>;
	// Talent — Career plan
	findCareerPlanByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCareerPlanRecord | null>>;

	findCompetencyAssessmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCompetencyAssessmentRecord | null>>;

	findCompetencyByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCompetencyRecord | null>>;

	findCriticalRoleReadinessByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTalentCriticalRoleReadinessRecord | null>>;

	findCurrentCompetencyAssessment: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		competencyId: HumanResourcesCompetencyId;
	}) => Promise<Result<CompetencyAssessment | null>>;
	// Talent — Succession candidate
	findSuccessionCandidateByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentSuccessionCandidateRecord | null>>;
	// Talent — Succession plan
	findSuccessionPlanByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentSuccessionPlanRecord | null>>;

	findTalentPoolByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTalentPoolRecord | null>>;
	// Talent — Talent pool member
	findTalentPoolMemberByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTalentPoolMemberRecord | null>>;

	findTalentProfileByEmployeeId: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<TalentProfile | null>>;

	findTalentProfileByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTalentProfileRecord | null>>;

	findTalentProfileMobilityByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTalentProfileMobilityRecord | null>>;

	getCareerPlanActionById: (input: {
		organizationId: string;
		actionId: HumanResourcesCareerPlanActionId;
	}) => Promise<Result<CareerPlanAction | null>>;

	getCareerPlanById: (input: {
		organizationId: string;
		careerPlanId: HumanResourcesCareerPlanId;
	}) => Promise<Result<CareerPlanWithActions | null>>;
	// Talent — Competency assessment
	getCompetencyAssessmentById: (input: {
		organizationId: string;
		assessmentId: HumanResourcesCompetencyAssessmentId;
	}) => Promise<Result<CompetencyAssessment | null>>;
	// Talent — Competency
	getCompetencyById: (input: {
		organizationId: string;
		competencyId: HumanResourcesCompetencyId;
	}) => Promise<Result<Competency | null>>;

	getEmployeeCompetencyProfile: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<EmployeeCompetencyProfile>>;

	getPositionSuccessionCoverage: (input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}) => Promise<Result<PositionSuccessionCoverage>>;

	getSuccessionPlanById: (input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
	}) => Promise<Result<SuccessionPlan | null>>;
	// Talent — Talent pool
	getTalentPoolById: (input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
	}) => Promise<Result<TalentPool | null>>;

	getTalentProfileByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<TalentProfile | null>>;
	// Talent — Talent profile
	getTalentProfileById: (input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}) => Promise<Result<TalentProfile | null>>;

	listCompetencies: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompetencyStatus | undefined;
	}) => Promise<Result<CompetencyListPage>>;

	listCriticalRoleReadiness: (input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}) => Promise<Result<TalentCriticalRoleReadinessListPage>>;

	listEmployeeCareerPlans: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: CareerPlanStatus | undefined;
	}) => Promise<Result<CareerPlanListPage>>;

	listJobCompetencies: (input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
		page: number;
		pageSize: number;
	}) => Promise<Result<JobCompetencyListPage>>;

	listSuccessionCandidates: (input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
		page: number;
		pageSize: number;
		status?: SuccessionCandidateStatus | undefined;
	}) => Promise<Result<SuccessionCandidateListPage>>;

	listSuccessionPlans: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		positionId?: HumanResourcesPositionId | undefined;
		status?: SuccessionPlanStatus | undefined;
	}) => Promise<Result<SuccessionPlanListPage>>;

	listTalentPoolMembers: (input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
		page: number;
		pageSize: number;
		status?: TalentPoolMemberStatus | undefined;
	}) => Promise<Result<TalentPoolMemberListPage>>;

	listTalentProfileAssessments: (input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}) => Promise<Result<TalentProfileAssessmentListPage>>;

	listTalentProfileMobility: (input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}) => Promise<Result<TalentProfileMobilityListPage>>;
	// Talent — Job competency
	mapCompetencyToJob: (
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			competencyId: HumanResourcesCompetencyId;
			requiredLevel: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobCompetency>>;

	nominateSuccessionCandidate: (
		record: SuccessionCandidateCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionCandidate>>;

	nominateTalentPoolMember: (
		record: TalentPoolMemberCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPoolMember>>;

	recordCriticalRoleReadiness: (
		record: CriticalRoleReadinessCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentCriticalRoleReadiness>>;
	// Talent — Talent profile assessment
	recordTalentProfileAssessment: (
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			methodCode: TalentProfileAssessmentMethodCode;
			classification: string;
			evidenceSummary: string;
			assessorUserId: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfileAssessment>>;

	recordTalentProfileMobility: (
		record: TalentProfileMobilityCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfileMobility>>;

	removeCompetencyFromJob: (
		input: {
			organizationId: string;
			jobCompetencyId: HumanResourcesJobCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobCompetency>>;

	removeSuccessionCandidate: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionCandidate>>;

	removeTalentPoolMember: (
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPoolMember>>;

	retireCompetency: (
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Competency>>;

	supersedeCompetencyAssessment: (
		record: CompetencyAssessmentSupersedeRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CompetencyAssessment>>;

	updateCareerPlan: (
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CareerPlan>>;

	updateCompetency: (
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			name?: string | undefined;
			description?: string | null | undefined;
			category?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Competency>>;

	updateSuccessionPlan: (
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			title?: string | undefined;
			allowsExternalCandidates?: boolean | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<SuccessionPlan>>;

	updateTalentPool: (
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			name?: string | undefined;
			description?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentPool>>;

	updateTalentProfile: (
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			summary?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<TalentProfile>>;
}
