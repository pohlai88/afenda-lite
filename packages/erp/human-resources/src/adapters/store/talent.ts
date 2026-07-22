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
import type {
	CareerPlanStatus,
	CompetencyScaleCode,
	CompetencyStatus,
	SuccessionCandidateStatus,
	SuccessionPlanStatus,
	SuccessionReadinessCode,
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
	IdempotentTalentPoolMemberRecord,
	IdempotentTalentPoolRecord,
	IdempotentTalentProfileRecord,
	JobCompetency,
	JobCompetencyListPage,
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionCandidateListPage,
	SuccessionPlan,
	SuccessionPlanListPage,
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
	TalentProfile,
	TalentProfileAssessment,
} from "../types";

/**
 * Persistence contract for Talent management and succession.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type CompetencyCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	category: string | null;
	scaleCode: CompetencyScaleCode;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CompetencyAssessmentCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	competencyId: HumanResourcesCompetencyId;
	scaleCode: CompetencyScaleCode;
	level: number;
	assessorUserId: string;
	evidenceSource: string;
	effectiveOn: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CompetencyAssessmentSupersedeRecord = {
	organizationId: string;
	sourceAssessmentId: HumanResourcesCompetencyAssessmentId;
	level: number;
	assessorUserId: string;
	evidenceSource: string;
	effectiveOn: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type TalentProfileCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	summary: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type TalentPoolCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type TalentPoolMemberCreateRecord = {
	organizationId: string;
	poolId: HumanResourcesTalentPoolId;
	employeeId: HumanResourcesEmployeeId;
	nominatorUserId: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type CareerPlanCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	ownerUserId: string;
	code: string;
	title: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type SuccessionPlanCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	positionId: HumanResourcesPositionId;
	allowsExternalCandidates: boolean;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type SuccessionCandidateCreateRecord = {
	organizationId: string;
	successionPlanId: HumanResourcesSuccessionPlanId;
	employeeId: HumanResourcesEmployeeId | null;
	externalCandidateRef: string | null;
	nominatorUserId: string;
	readiness: SuccessionReadinessCode;
	readinessEffectiveOn: string;
	evidenceSummary: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type HumanResourcesTalentStore = {
	// Talent — Competency
	getCompetencyById(input: {
		organizationId: string;
		competencyId: HumanResourcesCompetencyId;
	}): Promise<Result<Competency | null>>;

	findCompetencyByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompetencyRecord | null>>;

	createCompetency(
		record: CompetencyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	updateCompetency(
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			name?: string;
			description?: string | null;
			category?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	retireCompetency(
		input: {
			organizationId: string;
			competencyId: HumanResourcesCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Competency>>;

	listCompetencies(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompetencyStatus;
	}): Promise<Result<CompetencyListPage>>;
	// Talent — Job competency
	mapCompetencyToJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			competencyId: HumanResourcesCompetencyId;
			requiredLevel: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobCompetency>>;

	removeCompetencyFromJob(
		input: {
			organizationId: string;
			jobCompetencyId: HumanResourcesJobCompetencyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobCompetency>>;

	listJobCompetencies(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
		page: number;
		pageSize: number;
	}): Promise<Result<JobCompetencyListPage>>;
	// Talent — Competency assessment
	getCompetencyAssessmentById(input: {
		organizationId: string;
		assessmentId: HumanResourcesCompetencyAssessmentId;
	}): Promise<Result<CompetencyAssessment | null>>;

	findCurrentCompetencyAssessment(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		competencyId: HumanResourcesCompetencyId;
	}): Promise<Result<CompetencyAssessment | null>>;

	findCompetencyAssessmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompetencyAssessmentRecord | null>>;

	createCompetencyAssessment(
		record: CompetencyAssessmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompetencyAssessment>>;

	supersedeCompetencyAssessment(
		record: CompetencyAssessmentSupersedeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CompetencyAssessment>>;

	getEmployeeCompetencyProfile(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<EmployeeCompetencyProfile>>;
	// Talent — Talent profile
	getTalentProfileById(input: {
		organizationId: string;
		talentProfileId: HumanResourcesTalentProfileId;
	}): Promise<Result<TalentProfile | null>>;

	findTalentProfileByEmployeeId(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<TalentProfile | null>>;

	findTalentProfileByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentProfileRecord | null>>;

	createTalentProfile(
		record: TalentProfileCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	updateTalentProfile(
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			summary?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	archiveTalentProfile(
		input: {
			organizationId: string;
			talentProfileId: HumanResourcesTalentProfileId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfile>>;

	getTalentProfileByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<TalentProfile | null>>;
	// Talent — Talent profile assessment
	recordTalentProfileAssessment(
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
		meta: { correlationId: string },
	): Promise<Result<TalentProfileAssessment>>;

	confirmTalentProfileAssessment(
		input: {
			organizationId: string;
			assessmentId: HumanResourcesTalentProfileAssessmentId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentProfileAssessment>>;
	// Talent — Talent pool
	getTalentPoolById(input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
	}): Promise<Result<TalentPool | null>>;

	findTalentPoolByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentPoolRecord | null>>;

	createTalentPool(
		record: TalentPoolCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;

	updateTalentPool(
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			name?: string;
			description?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;

	closeTalentPool(
		input: {
			organizationId: string;
			poolId: HumanResourcesTalentPoolId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPool>>;
	// Talent — Talent pool member
	findTalentPoolMemberByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTalentPoolMemberRecord | null>>;

	nominateTalentPoolMember(
		record: TalentPoolMemberCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	approveTalentPoolMember(
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			approverUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	removeTalentPoolMember(
		input: {
			organizationId: string;
			memberId: HumanResourcesTalentPoolMemberId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TalentPoolMember>>;

	listTalentPoolMembers(input: {
		organizationId: string;
		poolId: HumanResourcesTalentPoolId;
		page: number;
		pageSize: number;
		status?: TalentPoolMemberStatus;
	}): Promise<Result<TalentPoolMemberListPage>>;
	// Talent — Career plan
	findCareerPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCareerPlanRecord | null>>;

	createCareerPlan(
		record: CareerPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	updateCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	acknowledgeCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	closeCareerPlan(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlan>>;

	getCareerPlanById(input: {
		organizationId: string;
		careerPlanId: HumanResourcesCareerPlanId;
	}): Promise<Result<CareerPlanWithActions | null>>;

	listEmployeeCareerPlans(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: CareerPlanStatus;
	}): Promise<Result<CareerPlanListPage>>;
	// Talent — Career plan action
	addCareerPlanAction(
		input: {
			organizationId: string;
			careerPlanId: HumanResourcesCareerPlanId;
			title: string;
			dueOn: string | null;
			learningAssignmentId: HumanResourcesLearningAssignmentId | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlanAction>>;

	completeCareerPlanAction(
		input: {
			organizationId: string;
			actionId: HumanResourcesCareerPlanActionId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CareerPlanAction>>;

	getCareerPlanActionById(input: {
		organizationId: string;
		actionId: HumanResourcesCareerPlanActionId;
	}): Promise<Result<CareerPlanAction | null>>;
	// Talent — Succession plan
	findSuccessionPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSuccessionPlanRecord | null>>;

	createSuccessionPlan(
		record: SuccessionPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	updateSuccessionPlan(
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			title?: string;
			allowsExternalCandidates?: boolean;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	closeSuccessionPlan(
		input: {
			organizationId: string;
			successionPlanId: HumanResourcesSuccessionPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionPlan>>;

	getSuccessionPlanById(input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
	}): Promise<Result<SuccessionPlan | null>>;

	listSuccessionPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		positionId?: HumanResourcesPositionId;
		status?: SuccessionPlanStatus;
	}): Promise<Result<SuccessionPlanListPage>>;
	// Talent — Succession candidate
	findSuccessionCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentSuccessionCandidateRecord | null>>;

	nominateSuccessionCandidate(
		record: SuccessionCandidateCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	assessSuccessionReadiness(
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
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	approveSuccessionCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	removeSuccessionCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesSuccessionCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SuccessionCandidate>>;

	listSuccessionCandidates(input: {
		organizationId: string;
		successionPlanId: HumanResourcesSuccessionPlanId;
		page: number;
		pageSize: number;
		status?: SuccessionCandidateStatus;
	}): Promise<Result<SuccessionCandidateListPage>>;

	getPositionSuccessionCoverage(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<PositionSuccessionCoverage>>;
};
