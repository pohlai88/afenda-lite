import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesGoalId,
	HumanResourcesImprovementPlanId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceCycleParticipantId,
	HumanResourcesReviewId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { PerformanceRatingScale } from "../shared/performance-rating";
import type {
	PerformanceCycleStatus,
	PerformanceGoalStatus,
	PerformanceWeightingModel,
} from "../shared/performance-status";
import type {
	EmployeePerformanceHistory,
	PerformanceCycle,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceImprovementCheckpoint,
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
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	updatePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			name?: string;
			periodStart?: string;
			periodEnd?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	openPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	closePerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	cancelPerformanceCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceCycle>>;

	addCycleParticipant(
		input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	submitPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	approvePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	rejectPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	recordGoalProgress(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			progressNote: string;
			progressValue: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoalProgress>>;

	closePerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	cancelPerformanceGoal(
		input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceGoal>>;

	listEmployeeGoals(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
		status?: PerformanceGoalStatus;
	}): Promise<Result<PerformanceGoalListPage>>;
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<PerformanceReview>>;

	returnPerformanceReviewForCorrection(
		input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
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
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	openImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	acknowledgeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	recordImprovementCheckpoint(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			sequenceNumber: number;
			outcome: "met" | "missed";
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementCheckpoint>>;

	amendImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			measurableActions?: string;
			supportResources?: string;
			dueDate?: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	completeImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	closeImprovementPlanUnsuccessful(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	cancelImprovementPlan(
		input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PerformanceImprovementPlan>>;

	listActiveImprovementPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
	}): Promise<Result<PerformanceImprovementPlanListPage>>;

	getEmployeePerformanceHistory(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		includeConfidential: boolean;
	}): Promise<Result<EmployeePerformanceHistory>>;
};
