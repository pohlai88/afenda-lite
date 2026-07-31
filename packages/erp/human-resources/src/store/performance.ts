import type { Result } from "@afenda/errors";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesGoalId,
	HumanResourcesImprovementPlanId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesReviewId,
	HumanResourcesReviewParticipantId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { EmploymentStatus } from "../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type { PerformanceRatingScale } from "../shared/performance-rating";
import type {
	PerformanceCycleReviewPeriodKind,
	PerformanceCycleStatus,
	PerformanceGoalKind,
	PerformanceGoalStatus,
	PerformanceWeightingModel,
} from "../shared/performance-status";
import type {
	EmployeePerformanceHistory,
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceGoalProgressListPage,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementCheckpointListPage,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
} from "../types";

/**
 * Persistence contract for Performance management.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface PerformanceCycleCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	name: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	ratingScale: PerformanceRatingScale;
	weightingModel: PerformanceWeightingModel;
}

export interface IdempotentPerformanceCycleRecord {
	createRequestFingerprint: string;
	cycle: PerformanceCycle;
}

export interface PerformanceGoalCreateRecord {
	alignedToGoalId: HumanResourcesGoalId | null;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	cycleId: HumanResourcesPerformanceCycleId;
	description: string | null;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	exceptionOutsideCycle: boolean;
	goalKind: PerformanceGoalKind;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	title: string;
	weight: string | null;
}

export interface IdempotentPerformanceGoalRecord {
	createRequestFingerprint: string;
	goal: PerformanceGoal;
}

export interface ImprovementPlanCreateRecord {
	accountableManagerEmployeeId: HumanResourcesEmployeeId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	dueDate: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	expectedOutcome: string;
	measurableActions: string;
	milestones: Array<{ dueDate: string }>;
	organizationId: string;
	performanceGap: string;
	reviewId: HumanResourcesReviewId;
	supportResources: string;
}

export interface IdempotentImprovementPlanRecord {
	createRequestFingerprint: string;
	plan: PerformanceImprovementPlan;
}

export interface HumanResourcesPerformanceStore {
	acknowledgeImprovementPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	acknowledgePerformanceReview: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			acknowledgementNote: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	activatePerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	addCycleParticipant: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			actorUserId: string;
			asOfDate?: string | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycleParticipant>>;

	addDelegatedReviewer: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			delegatedEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	alignPerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			alignedToGoalId: HumanResourcesGoalId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	amendImprovementPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			performanceGap?: string | undefined;
			expectedOutcome?: string | undefined;
			measurableActions?: string | undefined;
			supportResources?: string | undefined;
			dueDate?: string | undefined;
			extensionReason?: string | undefined;
			extensionEvidenceReference?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	approvePerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	calibratePerformanceReview: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			overallRating: string;
			calibrationNote: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	cancelImprovementPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	cancelPerformanceCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	cancelPerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	closeImprovementPlanUnsuccessful: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
			outcomeReason?: string | undefined;
			outcomeEvidenceReference?: string | null | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	closePerformanceCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	closePerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			completionNote: string | null;
			completionEvidenceReference: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	completeImprovementPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
			outcomeReason?: string | undefined;
			outcomeEvidenceReference?: string | null | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	createImprovementPlan: (
		record: ImprovementPlanCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	createPerformanceCycle: (
		record: PerformanceCycleCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	createPerformanceGoal: (
		record: PerformanceGoalCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	enrollEligibleCycleParticipants: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			asOfDate: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycleParticipant[]>>;

	finalizePerformanceReview: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			overallRating: string;
			finalizeIdempotencyKey: string;
			finalizeRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	findImprovementPlanByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentImprovementPlanRecord | null>>;

	findPerformanceCycleByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPerformanceCycleRecord | null>>;

	findPerformanceGoalByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPerformanceGoalRecord | null>>;

	getEmployeePerformanceHistory: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		includeConfidential: boolean;
	}) => Promise<Result<EmployeePerformanceHistory>>;
	// Performance Improvement Plan
	getImprovementPlanById: (input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
	}) => Promise<Result<PerformanceImprovementPlan | null>>;
	// Performance Cycle
	getPerformanceCycleById: (input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}) => Promise<Result<PerformanceCycle | null>>;

	getPerformanceCycleEligibility: (input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}) => Promise<Result<PerformanceCycleEligibility | null>>;
	// Performance Goal
	getPerformanceGoalById: (input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
	}) => Promise<Result<PerformanceGoal | null>>;

	getPerformanceReviewById: (input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		includeConfidential: boolean;
	}) => Promise<Result<PerformanceReviewDetail | null>>;

	listActiveImprovementPlans: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}) => Promise<Result<PerformanceImprovementPlanListPage>>;

	listCycleParticipants: (input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}) => Promise<Result<PerformanceCycleParticipant[]>>;

	listEmployeeGoals: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: PerformanceGoalStatus | undefined;
	}) => Promise<Result<PerformanceGoalListPage>>;

	listEmployeePerformanceReviews: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		includeConfidential: boolean;
	}) => Promise<Result<PerformanceReviewListPage>>;

	listGoalProgress: (input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
		page: number;
		pageSize: number;
	}) => Promise<Result<PerformanceGoalProgressListPage>>;

	listImprovementPlanCheckpoints: (input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
	}) => Promise<Result<PerformanceImprovementCheckpointListPage>>;

	listPerformanceCycleReviewPeriods: (input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}) => Promise<Result<PerformanceCycleReviewPeriod[]>>;

	listPerformanceCycles: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PerformanceCycleStatus | undefined;
	}) => Promise<Result<PerformanceCycleListPage>>;

	listReviewsPendingManagerAction: (input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}) => Promise<Result<PerformanceReviewListPage>>;

	openImprovementPlan: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementPlan>>;

	openPerformanceCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	publishPerformanceCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	recordGoalProgress: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			progressNote: string;
			progressValue: string | null;
			evidenceReference: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoalProgress>>;

	recordImprovementCheckpoint: (
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			sequenceNumber: number;
			outcome: "met" | "missed";
			notes: string | null;
			evidenceReference: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceImprovementCheckpoint>>;

	rejectPerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	removeCycleParticipant: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			participantId: HumanResourcesPerformanceCycleParticipantId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycleParticipant>>;

	reopenPerformanceReview: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			reason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	returnPerformanceReviewForCorrection: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	setPerformanceCycleEligibility: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycleEligibility>>;

	setPerformanceCycleReviewPeriods: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			periods: Array<{
				kind: PerformanceCycleReviewPeriodKind;
				periodStart: string;
				periodEnd: string;
			}>;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycleReviewPeriod[]>>;
	// Performance Review
	startPerformanceReview: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			managerEmployeeId: HumanResourcesEmployeeId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	submitDelegatedAssessment: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			participantId: HumanResourcesReviewParticipantId;
			rating: string;
			commentsSensitive: string | null;
			delegatedEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	submitManagerAssessment: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			rating: string;
			commentsSensitive: string | null;
			actorUserId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	submitPerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;

	submitSelfAssessment: (
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			rating: string;
			commentsSensitive: string | null;
			actorUserId: string;
			actorEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceReview>>;

	updatePerformanceCycle: (
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			name?: string | undefined;
			periodStart?: string | undefined;
			periodEnd?: string | undefined;
			ratingScale?: PerformanceRatingScale | undefined;
			weightingModel?: PerformanceWeightingModel | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceCycle>>;

	updatePerformanceGoal: (
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			title?: string | undefined;
			description?: string | null | undefined;
			weight?: string | null | undefined;
			periodStart?: string | undefined;
			periodEnd?: string | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<PerformanceGoal>>;
}
