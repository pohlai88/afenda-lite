import type { Result } from "@afenda/errors/result";
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
export type PerformanceCycleCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	ratingScale: PerformanceRatingScale;
	weightingModel: PerformanceWeightingModel;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentPerformanceCycleRecord = {
	cycle: PerformanceCycle;
	createRequestFingerprint: string;
};

export type PerformanceGoalCreateRecord = {
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	title: string;
	description: string | null;
	weight: string | null;
	periodStart: string;
	periodEnd: string;
	exceptionOutsideCycle: boolean;
	goalKind: PerformanceGoalKind;
	alignedToGoalId: HumanResourcesGoalId | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentPerformanceGoalRecord = {
	goal: PerformanceGoal;
	createRequestFingerprint: string;
};

export type ImprovementPlanCreateRecord = {
	organizationId: string;
	reviewId: HumanResourcesReviewId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	performanceGap: string;
	expectedOutcome: string;
	measurableActions: string;
	supportResources: string;
	dueDate: string;
	milestones: Array<{ dueDate: string }>;
	accountableManagerEmployeeId: HumanResourcesEmployeeId;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentImprovementPlanRecord = {
	plan: PerformanceImprovementPlan;
	createRequestFingerprint: string;
};

export type HumanResourcesPerformanceStore = {
	// Performance Cycle
	getPerformanceCycleById(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycle | null>>;

	findPerformanceCycleByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPerformanceCycleRecord | null>>;

	createPerformanceCycle(
		record: PerformanceCycleCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	updatePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			name?: string;
			periodStart?: string;
			periodEnd?: string;
			ratingScale?: PerformanceRatingScale;
			weightingModel?: PerformanceWeightingModel;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	openPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	closePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	cancelPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	publishPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycle>>;

	setPerformanceCycleReviewPeriods(
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
	): Promise<Result<PerformanceCycleReviewPeriod[]>>;

	listPerformanceCycleReviewPeriods(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycleReviewPeriod[]>>;

	setPerformanceCycleEligibility(
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
	): Promise<Result<PerformanceCycleEligibility>>;

	getPerformanceCycleEligibility(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycleEligibility | null>>;

	enrollEligibleCycleParticipants(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			asOfDate: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycleParticipant[]>>;

	addCycleParticipant(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			actorUserId: string;
			asOfDate?: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycleParticipant>>;

	removeCycleParticipant(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			participantId: HumanResourcesPerformanceCycleParticipantId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceCycleParticipant>>;

	listPerformanceCycles(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: PerformanceCycleStatus;
	}): Promise<Result<PerformanceCycleListPage>>;

	listCycleParticipants(input: {
		organizationId: string;
		cycleId: HumanResourcesPerformanceCycleId;
	}): Promise<Result<PerformanceCycleParticipant[]>>;
	// Performance Goal
	getPerformanceGoalById(input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
	}): Promise<Result<PerformanceGoal | null>>;

	findPerformanceGoalByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPerformanceGoalRecord | null>>;

	createPerformanceGoal(
		record: PerformanceGoalCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	updatePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			title?: string;
			description?: string | null;
			weight?: string | null;
			periodStart?: string;
			periodEnd?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	submitPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	approvePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	rejectPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	recordGoalProgress(
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
	): Promise<Result<PerformanceGoalProgress>>;

	activatePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	alignPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			alignedToGoalId: HumanResourcesGoalId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	closePerformanceGoal(
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
	): Promise<Result<PerformanceGoal>>;

	cancelPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceGoal>>;

	listEmployeeGoals(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: PerformanceGoalStatus;
	}): Promise<Result<PerformanceGoalListPage>>;

	listGoalProgress(input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceGoalProgressListPage>>;
	// Performance Review
	startPerformanceReview(
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
	): Promise<Result<PerformanceReview>>;

	submitSelfAssessment(
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
	): Promise<Result<PerformanceReview>>;

	submitManagerAssessment(
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
	): Promise<Result<PerformanceReview>>;

	addDelegatedReviewer(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			delegatedEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceReview>>;

	submitDelegatedAssessment(
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
	): Promise<Result<PerformanceReview>>;

	calibratePerformanceReview(
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
	): Promise<Result<PerformanceReview>>;

	returnPerformanceReviewForCorrection(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceReview>>;

	acknowledgePerformanceReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			acknowledgementNote: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceReview>>;

	finalizePerformanceReview(
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
	): Promise<Result<PerformanceReview>>;

	reopenPerformanceReview(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			reason: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceReview>>;

	getPerformanceReviewById(input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		includeConfidential: boolean;
	}): Promise<Result<PerformanceReviewDetail | null>>;

	listEmployeePerformanceReviews(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		includeConfidential: boolean;
	}): Promise<Result<PerformanceReviewListPage>>;

	listReviewsPendingManagerAction(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceReviewListPage>>;
	// Performance Improvement Plan
	getImprovementPlanById(input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
	}): Promise<Result<PerformanceImprovementPlan | null>>;

	findImprovementPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentImprovementPlanRecord | null>>;

	createImprovementPlan(
		record: ImprovementPlanCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	openImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	acknowledgeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	recordImprovementCheckpoint(
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
	): Promise<Result<PerformanceImprovementCheckpoint>>;

	amendImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			performanceGap?: string;
			expectedOutcome?: string;
			measurableActions?: string;
			supportResources?: string;
			dueDate?: string;
			extensionReason?: string;
			extensionEvidenceReference?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	completeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
			outcomeReason?: string;
			outcomeEvidenceReference?: string | null;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	closeImprovementPlanUnsuccessful(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
			outcomeReason?: string;
			outcomeEvidenceReference?: string | null;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	cancelImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<PerformanceImprovementPlan>>;

	listActiveImprovementPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceImprovementPlanListPage>>;

	listImprovementPlanCheckpoints(input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
	}): Promise<Result<PerformanceImprovementCheckpointListPage>>;

	getEmployeePerformanceHistory(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		includeConfidential: boolean;
	}): Promise<Result<EmployeePerformanceHistory>>;
};
