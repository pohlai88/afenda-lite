import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesPerformanceCycleId,
	HumanResourcesPerformanceGoalId,
	HumanResourcesPerformanceImprovementPlanId,
	HumanResourcesPerformanceReviewId,
} from "../brands";
import type { PerformanceRatingScale } from "../shared/performance-rating";
import type {
	PerformanceAssessmentKind,
	PerformanceCheckpointOutcome,
	PerformanceCycleStatus,
	PerformanceGoalStatus,
	PerformanceImprovementPlanStatus,
	PerformanceReviewStatus,
	PerformanceWeightingModel,
} from "../shared/performance-status";

export type PerformanceCycle = {
	id: HumanResourcesPerformanceCycleId;
	organizationId: string;
	code: string;
	name: string;
	periodStart: string;
	periodEnd: string;
	ratingScale: PerformanceRatingScale;
	weightingModel: PerformanceWeightingModel;
	status: PerformanceCycleStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceCycleParticipant = {
	id: string;
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	status: "active" | "removed";
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceGoal = {
	id: HumanResourcesPerformanceGoalId;
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
	status: PerformanceGoalStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceGoalProgress = {
	id: string;
	organizationId: string;
	goalId: HumanResourcesPerformanceGoalId;
	recordedAt: Date;
	progressNote: string;
	progressValue: string | null;
	recordedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceReview = {
	id: HumanResourcesPerformanceReviewId;
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	overallRating: string | null;
	acknowledgementNote: string | null;
	status: PerformanceReviewStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceReviewParticipant = {
	id: string;
	organizationId: string;
	reviewId: HumanResourcesPerformanceReviewId;
	role: "self" | "manager" | "delegated";
	employeeId: HumanResourcesEmployeeId | null;
	userId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceAssessment = {
	id: string;
	organizationId: string;
	reviewId: HumanResourcesPerformanceReviewId;
	kind: PerformanceAssessmentKind;
	rating: string | null;
	commentsSensitive: string | null;
	submittedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceImprovementPlan = {
	id: HumanResourcesPerformanceImprovementPlanId;
	organizationId: string;
	reviewId: HumanResourcesPerformanceReviewId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	performanceGap: string;
	expectedOutcome: string;
	measurableActions: string;
	supportResources: string;
	dueDate: string;
	accountableManagerEmployeeId: HumanResourcesEmployeeId;
	status: PerformanceImprovementPlanStatus;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceImprovementCheckpoint = {
	id: string;
	organizationId: string;
	planId: HumanResourcesPerformanceImprovementPlanId;
	sequenceNumber: number;
	dueDate: string;
	outcome: PerformanceCheckpointOutcome;
	notes: string | null;
	recordedBy: string | null;
	recordedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type PerformanceCycleListPage = {
	cycles: PerformanceCycle[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceGoalListPage = {
	goals: PerformanceGoal[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceReviewListPage = {
	reviews: PerformanceReview[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceImprovementPlanListPage = {
	plans: PerformanceImprovementPlan[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type PerformanceAssessmentView = {
	kind: PerformanceAssessmentKind;
	rating: string | null;
	commentsSensitive: string | null;
	submittedAt: Date | null;
};

export type PerformanceReviewView = PerformanceReview & {
	assessments: PerformanceAssessmentView[];
};

export type EmployeePerformanceHistory = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	cycles: PerformanceCycle[];
	goals: PerformanceGoal[];
	reviews: PerformanceReviewView[];
	improvementPlans: PerformanceImprovementPlan[];
};
