import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrPerformanceAssessment,
	hrPerformanceCycle,
	hrPerformanceCycleParticipant,
	hrPerformanceGoal,
	type hrPerformanceGoalProgress,
	hrPerformanceImprovementCheckpoint,
	hrPerformanceImprovementPlan,
	hrPerformanceReview,
	hrPerformanceReviewParticipant,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesGoalId,
	type HumanResourcesImprovementPlanId,
	type HumanResourcesPerformanceCycleId,
	type HumanResourcesReviewId,
	humanResourcesAssessmentIdSchema,
	humanResourcesGoalProgressIdSchema,
	humanResourcesImprovementCheckpointIdSchema,
	humanResourcesPerformanceCycleParticipantIdSchema,
	humanResourcesReviewParticipantIdSchema,
	parseHumanResourcesAssessmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesGoalId,
	parseHumanResourcesGoalProgressId,
	parseHumanResourcesImprovementCheckpointId,
	parseHumanResourcesImprovementPlanId,
	parseHumanResourcesPerformanceCycleId,
	parseHumanResourcesPerformanceCycleParticipantId,
	parseHumanResourcesReviewId,
	parseHumanResourcesReviewParticipantId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import {
	assertCheckpointOutcomeTransition,
	assertCycleStatusTransition,
	assertGoalDatesWithinCycle,
	assertGoalEditable,
	assertGoalStatusTransition,
	assertGoalWeightsSumTo100,
	assertImprovementPlanStatusTransition,
	assertReviewNotFinalized,
	assertReviewStatusTransition,
	assertValidCyclePeriod,
} from "../../shared/performance-guards";
import {
	parseRatingScale,
	validateRatingInScale,
} from "../../shared/performance-rating";
import {
	isPerformanceCycleOpen,
	isPerformanceGoalProgressable,
	isPerformanceReviewFinalized,
	performanceAssessmentKindSchema,
	performanceCheckpointOutcomeSchema,
	performanceCycleParticipantStatusSchema,
	performanceCycleStatusSchema,
	performanceGoalStatusSchema,
	performanceImprovementPlanStatusSchema,
	performanceReviewStatusSchema,
	performanceWeightingModelSchema,
} from "../../shared/performance-status";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { HumanResourcesStore } from "../../store";
import type {
	PerformanceAssessment,
	PerformanceCycle,
	PerformanceCycleParticipant,
	PerformanceGoal,
	PerformanceGoalProgress,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementPlan,
	PerformanceReview,
	PerformanceReviewParticipant,
} from "../../types";
import { projectPerformanceReviewDetail } from "../../types";

type PerformanceHost = {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
};

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

export type DrizzlePerformanceMethods = Pick<
	HumanResourcesStore,
	| "getPerformanceCycleById"
	| "findPerformanceCycleByIdempotencyKey"
	| "createPerformanceCycle"
	| "updatePerformanceCycle"
	| "openPerformanceCycle"
	| "closePerformanceCycle"
	| "cancelPerformanceCycle"
	| "addCycleParticipant"
	| "removeCycleParticipant"
	| "listPerformanceCycles"
	| "listCycleParticipants"
	| "getPerformanceGoalById"
	| "findPerformanceGoalByIdempotencyKey"
	| "createPerformanceGoal"
	| "updatePerformanceGoal"
	| "submitPerformanceGoal"
	| "approvePerformanceGoal"
	| "rejectPerformanceGoal"
	| "recordGoalProgress"
	| "closePerformanceGoal"
	| "cancelPerformanceGoal"
	| "listEmployeeGoals"
	| "startPerformanceReview"
	| "submitSelfAssessment"
	| "submitManagerAssessment"
	| "returnPerformanceReviewForCorrection"
	| "acknowledgePerformanceReview"
	| "finalizePerformanceReview"
	| "reopenPerformanceReview"
	| "getPerformanceReviewById"
	| "listEmployeePerformanceReviews"
	| "listReviewsPendingManagerAction"
	| "getImprovementPlanById"
	| "findImprovementPlanByIdempotencyKey"
	| "createImprovementPlan"
	| "openImprovementPlan"
	| "acknowledgeImprovementPlan"
	| "recordImprovementCheckpoint"
	| "amendImprovementPlan"
	| "completeImprovementPlan"
	| "closeImprovementPlanUnsuccessful"
	| "cancelImprovementPlan"
	| "listActiveImprovementPlans"
	| "getEmployeePerformanceHistory"
>;

type CycleSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	period_start: string;
	period_end: string;
	rating_scale: unknown;
	weighting_model: string;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type ParticipantSqlRow = {
	id: string;
	organization_id: string;
	cycle_id: string;
	employee_id: string;
	employment_id: string;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type GoalSqlRow = {
	id: string;
	organization_id: string;
	cycle_id: string;
	employee_id: string;
	employment_id: string;
	title: string;
	description: string | null;
	weight: string | null;
	period_start: string;
	period_end: string;
	exception_outside_cycle: boolean;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type GoalProgressSqlRow = {
	id: string;
	organization_id: string;
	goal_id: string;
	recorded_at: Date;
	progress_note: string;
	progress_value: string | null;
	recorded_by: string;
	created_at: Date;
	updated_at: Date;
};

type ReviewSqlRow = {
	id: string;
	organization_id: string;
	cycle_id: string;
	employee_id: string;
	employment_id: string;
	overall_rating: string | null;
	acknowledgement_note: string | null;
	status: string;
	finalize_idempotency_key: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type ReviewParticipantSqlRow = {
	id: string;
	organization_id: string;
	review_id: string;
	role: string;
	employee_id: string | null;
	user_id: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type AssessmentSqlRow = {
	id: string;
	organization_id: string;
	review_id: string;
	kind: string;
	rating: string | null;
	comments_sensitive: string | null;
	submitted_at: Date | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type PlanSqlRow = {
	id: string;
	organization_id: string;
	review_id: string;
	employee_id: string;
	employment_id: string;
	performance_gap: string;
	expected_outcome: string;
	measurable_actions: string;
	support_resources: string;
	due_date: string;
	accountable_manager_employee_id: string;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CheckpointSqlRow = {
	id: string;
	organization_id: string;
	plan_id: string;
	sequence_number: number;
	due_date: string;
	outcome: string;
	notes: string | null;
	recorded_by: string | null;
	recorded_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

function mapCycleSql(row: CycleSqlRow): Result<PerformanceCycle> {
	const id = parseHumanResourcesPerformanceCycleId(row.id);
	if (!id.ok) return id;
	const ratingScale = parseRatingScale(row.rating_scale);
	if (!ratingScale.ok) return ratingScale;
	const status = performanceCycleStatusSchema.safeParse(row.status);
	if (!status.success) return fail("INTERNAL_ERROR", "Invalid cycle status");
	const weightingModel = performanceWeightingModelSchema.safeParse(
		row.weighting_model,
	);
	if (!weightingModel.success) {
		return fail("INTERNAL_ERROR", "Invalid weighting model");
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		ratingScale: ratingScale.data,
		weightingModel: weightingModel.data,
		status: status.data,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCycle(
	row: typeof hrPerformanceCycle.$inferSelect,
): Result<PerformanceCycle> {
	return mapCycleSql({
		id: row.id,
		organization_id: row.organizationId,
		code: row.code,
		name: row.name,
		period_start: row.periodStart,
		period_end: row.periodEnd,
		rating_scale: row.ratingScale,
		weighting_model: row.weightingModel,
		status: row.status,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapParticipantSql(
	row: ParticipantSqlRow,
): Result<PerformanceCycleParticipant> {
	const id = parseHumanResourcesPerformanceCycleParticipantId(row.id);
	if (!id.ok) return id;
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) return cycleId;
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) return employmentId;
	const status = performanceCycleParticipantStatusSchema.safeParse(row.status);
	if (!status.success)
		return fail("INTERNAL_ERROR", "Invalid participant status");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		status: status.data,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapParticipant(
	row: typeof hrPerformanceCycleParticipant.$inferSelect,
): Result<PerformanceCycleParticipant> {
	return mapParticipantSql({
		id: row.id,
		organization_id: row.organizationId,
		cycle_id: row.cycleId,
		employee_id: row.employeeId,
		employment_id: row.employmentId,
		status: row.status,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapGoalSql(row: GoalSqlRow): Result<PerformanceGoal> {
	const id = parseHumanResourcesGoalId(row.id);
	if (!id.ok) return id;
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) return cycleId;
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) return employmentId;
	const status = performanceGoalStatusSchema.safeParse(row.status);
	if (!status.success) return fail("INTERNAL_ERROR", "Invalid goal status");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		title: row.title,
		description: row.description,
		weight: row.weight,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		exceptionOutsideCycle: row.exception_outside_cycle,
		status: status.data,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapGoal(
	row: typeof hrPerformanceGoal.$inferSelect,
): Result<PerformanceGoal> {
	return mapGoalSql({
		id: row.id,
		organization_id: row.organizationId,
		cycle_id: row.cycleId,
		employee_id: row.employeeId,
		employment_id: row.employmentId,
		title: row.title,
		description: row.description,
		weight: row.weight,
		period_start: row.periodStart,
		period_end: row.periodEnd,
		exception_outside_cycle: row.exceptionOutsideCycle,
		status: row.status,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapGoalProgressSql(
	row: GoalProgressSqlRow,
): Result<PerformanceGoalProgress> {
	const id = parseHumanResourcesGoalProgressId(row.id);
	if (!id.ok) return id;
	const goalId = parseHumanResourcesGoalId(row.goal_id);
	if (!goalId.ok) return goalId;
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		goalId: goalId.data,
		recordedAt: row.recorded_at,
		progressNote: row.progress_note,
		progressValue: row.progress_value,
		recordedBy: row.recorded_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function _mapGoalProgress(
	row: typeof hrPerformanceGoalProgress.$inferSelect,
): Result<PerformanceGoalProgress> {
	return mapGoalProgressSql({
		id: row.id,
		organization_id: row.organizationId,
		goal_id: row.goalId,
		recorded_at: row.recordedAt,
		progress_note: row.progressNote,
		progress_value: row.progressValue,
		recorded_by: row.recordedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapReviewSql(row: ReviewSqlRow): Result<PerformanceReview> {
	const id = parseHumanResourcesReviewId(row.id);
	if (!id.ok) return id;
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) return cycleId;
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) return employmentId;
	const status = performanceReviewStatusSchema.safeParse(row.status);
	if (!status.success) return fail("INTERNAL_ERROR", "Invalid review status");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		overallRating: row.overall_rating,
		acknowledgementNote: row.acknowledgement_note,
		status: status.data,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapReview(
	row: typeof hrPerformanceReview.$inferSelect,
): Result<PerformanceReview> {
	return mapReviewSql({
		id: row.id,
		organization_id: row.organizationId,
		cycle_id: row.cycleId,
		employee_id: row.employeeId,
		employment_id: row.employmentId,
		overall_rating: row.overallRating,
		acknowledgement_note: row.acknowledgementNote,
		status: row.status,
		finalize_idempotency_key: row.finalizeIdempotencyKey,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapReviewParticipantSql(
	row: ReviewParticipantSqlRow,
): Result<PerformanceReviewParticipant> {
	const id = parseHumanResourcesReviewParticipantId(row.id);
	if (!id.ok) return id;
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) return reviewId;
	let employeeId: HumanResourcesEmployeeId | null = null;
	if (row.employee_id !== null) {
		const parsed = parseHumanResourcesEmployeeId(row.employee_id);
		if (!parsed.ok) return parsed;
		employeeId = parsed.data;
	}
	const role = row.role as PerformanceReviewParticipant["role"];
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		reviewId: reviewId.data,
		role,
		employeeId,
		userId: row.user_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapAssessmentSql(
	row: AssessmentSqlRow,
): Result<PerformanceAssessment> {
	const id = parseHumanResourcesAssessmentId(row.id);
	if (!id.ok) return id;
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) return reviewId;
	const kind = performanceAssessmentKindSchema.safeParse(row.kind);
	if (!kind.success) return fail("INTERNAL_ERROR", "Invalid assessment kind");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		reviewId: reviewId.data,
		kind: kind.data,
		rating: row.rating,
		commentsSensitive: row.comments_sensitive,
		submittedAt: row.submitted_at,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapAssessment(
	row: typeof hrPerformanceAssessment.$inferSelect,
): Result<PerformanceAssessment> {
	return mapAssessmentSql({
		id: row.id,
		organization_id: row.organizationId,
		review_id: row.reviewId,
		kind: row.kind,
		rating: row.rating,
		comments_sensitive: row.commentsSensitive,
		submitted_at: row.submittedAt,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapPlanSql(row: PlanSqlRow): Result<PerformanceImprovementPlan> {
	const id = parseHumanResourcesImprovementPlanId(row.id);
	if (!id.ok) return id;
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) return reviewId;
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) return employmentId;
	const managerId = parseHumanResourcesEmployeeId(
		row.accountable_manager_employee_id,
	);
	if (!managerId.ok) return managerId;
	const status = performanceImprovementPlanStatusSchema.safeParse(row.status);
	if (!status.success)
		return fail("INTERNAL_ERROR", "Invalid improvement plan status");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		reviewId: reviewId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		performanceGap: row.performance_gap,
		expectedOutcome: row.expected_outcome,
		measurableActions: row.measurable_actions,
		supportResources: row.support_resources,
		dueDate: row.due_date,
		accountableManagerEmployeeId: managerId.data,
		status: status.data,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapPlan(
	row: typeof hrPerformanceImprovementPlan.$inferSelect,
): Result<PerformanceImprovementPlan> {
	return mapPlanSql({
		id: row.id,
		organization_id: row.organizationId,
		review_id: row.reviewId,
		employee_id: row.employeeId,
		employment_id: row.employmentId,
		performance_gap: row.performanceGap,
		expected_outcome: row.expectedOutcome,
		measurable_actions: row.measurableActions,
		support_resources: row.supportResources,
		due_date: row.dueDate,
		accountable_manager_employee_id: row.accountableManagerEmployeeId,
		status: row.status,
		create_idempotency_key: row.createIdempotencyKey,
		create_request_fingerprint: row.createRequestFingerprint,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapCheckpointSql(
	row: CheckpointSqlRow,
): Result<PerformanceImprovementCheckpoint> {
	const id = parseHumanResourcesImprovementCheckpointId(row.id);
	if (!id.ok) return id;
	const planId = parseHumanResourcesImprovementPlanId(row.plan_id);
	if (!planId.ok) return planId;
	const outcome = performanceCheckpointOutcomeSchema.safeParse(row.outcome);
	if (!outcome.success)
		return fail("INTERNAL_ERROR", "Invalid checkpoint outcome");
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		planId: planId.data,
		sequenceNumber: row.sequence_number,
		dueDate: row.due_date,
		outcome: outcome.data,
		notes: row.notes,
		recordedBy: row.recorded_by,
		recordedAt: row.recorded_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function _mapCheckpoint(
	row: typeof hrPerformanceImprovementCheckpoint.$inferSelect,
): Result<PerformanceImprovementCheckpoint> {
	return mapCheckpointSql({
		id: row.id,
		organization_id: row.organizationId,
		plan_id: row.planId,
		sequence_number: row.sequenceNumber,
		due_date: row.dueDate,
		outcome: row.outcome,
		notes: row.notes,
		recorded_by: row.recordedBy,
		recorded_at: row.recordedAt,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function redactReviewList(
	reviews: PerformanceReview[],
	includeConfidential: boolean,
): PerformanceReview[] {
	if (includeConfidential) {
		return reviews.map((review) => ({ ...review }));
	}
	return reviews.map((review) => ({
		...review,
		overallRating: null,
	}));
}

async function assertEmployeeEmployment(
	host: PerformanceHost,
	organizationId: string,
	employeeId: HumanResourcesEmployeeId,
	employmentId: HumanResourcesEmploymentId,
): Promise<Result<true>> {
	const employee = await host.getEmployeeById({ organizationId, employeeId });
	if (!employee.ok || employee.data === null) {
		return notFound(
			"Employee not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const employment = await host.getEmploymentById({
		organizationId,
		employmentId,
	});
	if (!employment.ok || employment.data === null) {
		return notFound(
			"Employment not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	if (employment.data.employeeId !== employeeId) {
		return invalidInput("Employment does not belong to employee");
	}
	return ok(true);
}

async function isActiveParticipantDb(
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
	employmentId: HumanResourcesEmploymentId,
): Promise<Result<boolean>> {
	try {
		const rows = await db
			.select({ id: hrPerformanceCycleParticipant.id })
			.from(hrPerformanceCycleParticipant)
			.where(
				and(
					eq(hrPerformanceCycleParticipant.organizationId, organizationId),
					eq(hrPerformanceCycleParticipant.cycleId, cycleId),
					eq(hrPerformanceCycleParticipant.employmentId, employmentId),
					eq(hrPerformanceCycleParticipant.status, "active"),
				),
			)
			.limit(1);
		return ok(rows.length > 0);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to check cycle participant");
	}
}

function newBrandId<T>(schema: {
	safeParse: (v: string) => { success: boolean; data?: T };
}): Result<T> {
	const parsed = schema.safeParse(randomUUID());
	if (!parsed.success || parsed.data === undefined) {
		return fail(
			"VALIDATION_ERROR",
			"Invalid generated identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok(parsed.data);
}

async function mutateGoalStatus(
	host: DrizzlePerformanceMethods & PerformanceHost,
	input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceGoal["status"],
	meta: { correlationId: string },
): Promise<Result<PerformanceGoal>> {
	const existing = await host.getPerformanceGoalById({
		organizationId: input.organizationId,
		goalId: input.goalId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) {
		return notFound(
			"Performance goal not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertGoalStatusTransition(
		existing.data.status,
		nextStatus,
	);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const currentStatus = existing.data.status;

	try {
		const [rows] = await runNeonHttpTransaction<[GoalSqlRow[]]>((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					UPDATE hr_performance_goal
					SET status = ${nextStatus},
						version = ${nextVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.goalId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
						AND status = ${currentStatus}
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_performance_goal', id, 'UPDATE', '[]'::jsonb
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Performance goal",
			});
		}
		return mapGoalSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to update performance goal status",
		);
	}
}

async function mutateReviewStatus(
	host: DrizzlePerformanceMethods & PerformanceHost,
	input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceReview["status"],
	meta: { correlationId: string },
): Promise<Result<PerformanceReview>> {
	const detail = await host.getPerformanceReviewById({
		organizationId: input.organizationId,
		reviewId: input.reviewId,
		includeConfidential: true,
	});
	if (!detail.ok) return detail;
	if (detail.data === null) {
		return notFound(
			"Performance review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const review = detail.data.review;
	const immutable = assertReviewNotFinalized(review.status);
	if (!immutable.ok) return immutable;
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertReviewStatusTransition(review.status, nextStatus);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const currentStatus = review.status;

	try {
		const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					UPDATE hr_performance_review
					SET status = ${nextStatus},
						version = ${nextVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.reviewId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
						AND status = ${currentStatus}
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_performance_review', id, 'UPDATE', '[]'::jsonb
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Performance review",
			});
		}
		return mapReviewSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to update performance review status",
		);
	}
}

async function mutatePlanStatus(
	host: DrizzlePerformanceMethods & PerformanceHost,
	input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceImprovementPlan["status"],
	meta: { correlationId: string },
): Promise<Result<PerformanceImprovementPlan>> {
	const existing = await host.getImprovementPlanById({
		organizationId: input.organizationId,
		planId: input.planId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) {
		return notFound(
			"Improvement plan not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertImprovementPlanStatusTransition(
		existing.data.status,
		nextStatus,
	);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	const auditId = randomUUID();
	const currentStatus = existing.data.status;

	try {
		const [rows] = await runNeonHttpTransaction<[PlanSqlRow[]]>((sqlTag) => [
			sqlTag`
				WITH mutated AS (
					UPDATE hr_performance_improvement_plan
					SET status = ${nextStatus},
						version = ${nextVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.planId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
						AND status = ${currentStatus}
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_performance_improvement_plan', id, 'UPDATE', '[]'::jsonb
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Improvement plan",
			});
		}
		return mapPlanSql(row);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to update improvement plan status",
		);
	}
}

async function submitAssessment(
	host: DrizzlePerformanceMethods & PerformanceHost,
	input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		rating: string;
		commentsSensitive: string | null;
		actorUserId: string;
		actorEmployeeId: HumanResourcesEmployeeId;
		expectedVersion: number;
	},
	kind: PerformanceAssessment["kind"],
	nextStatus: PerformanceReview["status"],
	meta: { correlationId: string },
): Promise<Result<PerformanceReview>> {
	const detail = await host.getPerformanceReviewById({
		organizationId: input.organizationId,
		reviewId: input.reviewId,
		includeConfidential: true,
	});
	if (!detail.ok) return detail;
	if (detail.data === null) {
		return notFound(
			"Performance review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const review = detail.data.review;
	const immutable = assertReviewNotFinalized(review.status);
	if (!immutable.ok) return immutable;
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertReviewStatusTransition(review.status, nextStatus);
	if (!transition.ok) return transition;

	const cycle = await host.getPerformanceCycleById({
		organizationId: input.organizationId,
		cycleId: review.cycleId,
	});
	if (!cycle.ok) return cycle;
	if (cycle.data === null) {
		return notFound(
			"Performance cycle not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const ratingCheck = validateRatingInScale(
		input.rating,
		cycle.data.ratingScale,
	);
	if (!ratingCheck.ok) return ratingCheck;

	const assessment = detail.data.assessments.find((item) => item.kind === kind);
	if (!assessment) {
		return invalidState(`Missing ${kind} assessment`);
	}
	const participant = detail.data.participants.find(
		(item) => item.role === kind && item.employeeId === input.actorEmployeeId,
	);
	if (!participant) {
		return invalidInput(`Actor is not the assigned ${kind} participant`);
	}

	const nextReviewVersion = input.expectedVersion + 1;
	const nextAssessmentVersion = assessment.version + 1;
	const auditId = randomUUID();
	const submittedAt = new Date();
	const currentReviewStatus = review.status;

	try {
		const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>((sqlTag) => [
			sqlTag`
				WITH updated_assessment AS (
					UPDATE hr_performance_assessment
					SET rating = ${input.rating},
						comments_sensitive = ${input.commentsSensitive},
						submitted_at = ${submittedAt},
						version = ${nextAssessmentVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${assessment.id}
						AND organization_id = ${input.organizationId}
						AND review_id = ${input.reviewId}
						AND kind = ${kind}
					RETURNING review_id
				),
				mutated AS (
					UPDATE hr_performance_review
					SET status = ${nextStatus},
						version = ${nextReviewVersion},
						updated_by = ${input.actorUserId},
						updated_at = now()
					WHERE id = ${input.reviewId}
						AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
						AND status = ${currentReviewStatus}
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes
					)
					SELECT
						${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
						'human-resources', 'hr_performance_review', id, 'UPDATE', '[]'::jsonb
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited, updated_assessment
			`,
		]);
		const row = rows[0];
		if (!row) {
			return missAfterOptimisticUpdate({
				found: true,
				entityLabel: "Performance review",
			});
		}
		return mapReviewSql(row);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to submit assessment");
	}
}

export const drizzlePerformanceMethods: DrizzlePerformanceMethods &
	ThisType<PerformanceHost & DrizzlePerformanceMethods> = {
	async getPerformanceCycleById(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceCycle)
				.where(
					and(
						eq(hrPerformanceCycle.organizationId, input.organizationId),
						eq(hrPerformanceCycle.id, input.cycleId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCycle(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load performance cycle");
		}
	},

	async findPerformanceCycleByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceCycle)
				.where(
					and(
						eq(hrPerformanceCycle.organizationId, input.organizationId),
						eq(hrPerformanceCycle.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const cycle = mapCycle(row);
			if (!cycle.ok) return cycle;
			return ok({
				cycle: cycle.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find cycle by idempotency key",
			);
		}
	},

	async createPerformanceCycle(record, _ports, meta) {
		const existing = await this.findPerformanceCycleByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.cycle);
			}
			return conflict("Idempotency key already used with different data");
		}

		const periodCheck = assertValidCyclePeriod({
			periodStart: record.periodStart,
			periodEnd: record.periodEnd,
		});
		if (!periodCheck.ok) return periodCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesPerformanceCycleId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const ratingScaleJson = JSON.stringify(record.ratingScale);

		try {
			const [rows] = await runNeonHttpTransaction<[CycleSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_cycle (
							id, organization_id, code, name, period_start, period_end,
							rating_scale, weighting_model, status,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.name},
							${record.periodStart}, ${record.periodEnd},
							${ratingScaleJson}::jsonb, ${record.weightingModel}, 'draft',
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						WHERE NOT EXISTS (
							SELECT 1 FROM hr_performance_cycle existing
							WHERE existing.organization_id = ${record.organizationId}
								AND existing.code = ${record.code}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return fail(
					"CONFLICT",
					"Performance cycle with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return mapCycleSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findPerformanceCycleByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.cycle);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Performance cycle with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			return mapPersistenceFailure(error, "Failed to create performance cycle");
		}
	},

	async updatePerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (existing.data.status !== "draft") {
			return invalidState("Performance cycle can only be edited while draft");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const periodStart = input.periodStart ?? existing.data.periodStart;
		const periodEnd = input.periodEnd ?? existing.data.periodEnd;
		const periodCheck = assertValidCyclePeriod({ periodStart, periodEnd });
		if (!periodCheck.ok) return periodCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const name = input.name ?? existing.data.name;

		try {
			const [rows] = await runNeonHttpTransaction<[CycleSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET name = ${name},
							period_start = ${periodStart},
							period_end = ${periodEnd},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.cycleId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'draft'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update performance cycle");
		}
	},

	async openPerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"open",
		);
		if (!transition.ok) return transition;

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_cycle",
			entityId: input.cycleId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[CycleSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET status = 'open',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.cycleId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${cycle.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to open performance cycle");
		}
	},

	async closePerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) return transition;

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CycleSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET status = 'closed',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.cycleId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${cycle.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close performance cycle");
		}
	},

	async cancelPerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"cancelled",
		);
		if (!transition.ok) return transition;

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CycleSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET status = 'cancelled',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.cycleId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${cycle.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to cancel performance cycle");
		}
	},

	async addCycleParticipant(input, _ports, meta) {
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleOpen(cycle.data.status)) {
			return invalidState("Participants can only be added to open cycles");
		}

		const refs = await assertEmployeeEmployment(
			this,
			input.organizationId,
			input.employeeId,
			input.employmentId,
		);
		if (!refs.ok) return refs;

		try {
			const existingRows = await db
				.select()
				.from(hrPerformanceCycleParticipant)
				.where(
					and(
						eq(
							hrPerformanceCycleParticipant.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceCycleParticipant.cycleId, input.cycleId),
						eq(hrPerformanceCycleParticipant.employmentId, input.employmentId),
					),
				)
				.limit(1);
			const existing = existingRows[0];

			if (existing) {
				if (existing.status === "active") {
					return conflict("Participant is already active in this cycle");
				}
				const nextVersion = existing.version + 1;
				const auditId = randomUUID();
				const [rows] = await runNeonHttpTransaction<[ParticipantSqlRow[]]>(
					(sqlTag) => [
						sqlTag`
						WITH mutated AS (
							UPDATE hr_performance_cycle_participant
							SET status = 'active',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${existing.id}
								AND organization_id = ${input.organizationId}
								AND version = ${existing.version}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_performance_cycle_participant', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
					],
				);
				const row = rows[0];
				if (!row) {
					return missAfterOptimisticUpdate({
						found: true,
						entityLabel: "Cycle participant",
					});
				}
				return mapParticipantSql(row);
			}

			const idResult = newBrandId(
				humanResourcesPerformanceCycleParticipantIdSchema,
			);
			if (!idResult.ok) return idResult;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction<[ParticipantSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_cycle_participant (
							id, organization_id, cycle_id, employee_id, employment_id,
							status, version, created_by, updated_by
						) VALUES (
							${idResult.data}, ${input.organizationId}, ${input.cycleId},
							${input.employeeId}, ${input.employmentId},
							'active', 1, ${input.actorUserId}, ${input.actorUserId}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle_participant', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Participant is already active in this cycle");
			}
			return mapParticipantSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Participant is already active in this cycle");
			}
			return mapPersistenceFailure(error, "Failed to add cycle participant");
		}
	},

	async removeCycleParticipant(input, _ports, meta) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceCycleParticipant)
				.where(
					and(
						eq(
							hrPerformanceCycleParticipant.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceCycleParticipant.id, input.participantId),
						eq(hrPerformanceCycleParticipant.cycleId, input.cycleId),
					),
				)
				.limit(1);
			const existing = rows[0];
			if (!existing) {
				return notFound(
					"Cycle participant not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
			const versionCheck = assertExpectedVersion(
				existing.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;
			if (existing.status === "removed") {
				return invalidState("Participant is already removed");
			}

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();
			const [updated] = await runNeonHttpTransaction<[ParticipantSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle_participant
						SET status = 'removed',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.participantId}
							AND organization_id = ${input.organizationId}
							AND cycle_id = ${input.cycleId}
							AND version = ${input.expectedVersion}
							AND status = 'active'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_cycle_participant', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = updated[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Cycle participant",
				});
			}
			return mapParticipantSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to remove cycle participant");
		}
	},

	async listPerformanceCycles(input) {
		try {
			let query = db
				.select()
				.from(hrPerformanceCycle)
				.where(eq(hrPerformanceCycle.organizationId, input.organizationId))
				.$dynamic();
			if (input.status !== undefined) {
				query = query.where(eq(hrPerformanceCycle.status, input.status));
			}
			const rows = await query.orderBy(desc(hrPerformanceCycle.createdAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const cycles: PerformanceCycle[] = [];
			for (const row of paged) {
				const mapped = mapCycle(row);
				if (!mapped.ok) return mapped;
				cycles.push(mapped.data);
			}
			return ok({
				cycles,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list performance cycles");
		}
	},

	async listCycleParticipants(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceCycleParticipant)
				.where(
					and(
						eq(
							hrPerformanceCycleParticipant.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceCycleParticipant.cycleId, input.cycleId),
					),
				);
			const participants: PerformanceCycleParticipant[] = [];
			for (const row of rows) {
				const mapped = mapParticipant(row);
				if (!mapped.ok) return mapped;
				participants.push(mapped.data);
			}
			return ok(participants);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list cycle participants");
		}
	},

	async getPerformanceGoalById(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceGoal)
				.where(
					and(
						eq(hrPerformanceGoal.organizationId, input.organizationId),
						eq(hrPerformanceGoal.id, input.goalId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapGoal(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load performance goal");
		}
	},

	async findPerformanceGoalByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceGoal)
				.where(
					and(
						eq(hrPerformanceGoal.organizationId, input.organizationId),
						eq(hrPerformanceGoal.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const goal = mapGoal(row);
			if (!goal.ok) return goal;
			return ok({
				goal: goal.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find goal by idempotency key",
			);
		}
	},

	async createPerformanceGoal(record, _ports, meta) {
		const existing = await this.findPerformanceGoalByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.goal);
			}
			return conflict("Idempotency key already used with different data");
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: record.organizationId,
			cycleId: record.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleOpen(cycle.data.status)) {
			return invalidState("Goals can only be created in open cycles");
		}
		const active = await isActiveParticipantDb(
			record.organizationId,
			record.cycleId,
			record.employmentId,
		);
		if (!active.ok) return active;
		if (!active.data) {
			return invalidState("Employee is not an active cycle participant");
		}

		const refs = await assertEmployeeEmployment(
			this,
			record.organizationId,
			record.employeeId,
			record.employmentId,
		);
		if (!refs.ok) return refs;

		const datesCheck = assertGoalDatesWithinCycle({
			goalPeriodStart: record.periodStart,
			goalPeriodEnd: record.periodEnd,
			cyclePeriodStart: cycle.data.periodStart,
			cyclePeriodEnd: cycle.data.periodEnd,
			exceptionOutsideCycle: record.exceptionOutsideCycle,
		});
		if (!datesCheck.ok) return datesCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesGoalId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[GoalSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_goal (
							id, organization_id, cycle_id, employee_id, employment_id,
							title, description, weight, period_start, period_end,
							exception_outside_cycle, status,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						) VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.cycleId},
							${record.employeeId}, ${record.employmentId},
							${record.title}, ${record.description}, ${record.weight},
							${record.periodStart}, ${record.periodEnd},
							${record.exceptionOutsideCycle}, 'draft',
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_performance_goal', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row)
				return fail("INTERNAL_ERROR", "Failed to create performance goal");
			return mapGoalSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findPerformanceGoalByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.goal);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to create performance goal");
		}
	},

	async updatePerformanceGoal(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance goal not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const editable = assertGoalEditable(existing.data.status);
		if (!editable.ok) return editable;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: existing.data.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}

		const periodStart = input.periodStart ?? existing.data.periodStart;
		const periodEnd = input.periodEnd ?? existing.data.periodEnd;
		const datesCheck = assertGoalDatesWithinCycle({
			goalPeriodStart: periodStart,
			goalPeriodEnd: periodEnd,
			cyclePeriodStart: cycle.data.periodStart,
			cyclePeriodEnd: cycle.data.periodEnd,
			exceptionOutsideCycle: existing.data.exceptionOutsideCycle,
		});
		if (!datesCheck.ok) return datesCheck;

		const title = input.title ?? existing.data.title;
		const description =
			input.description !== undefined
				? input.description
				: existing.data.description;
		const weight =
			input.weight !== undefined ? input.weight : existing.data.weight;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[GoalSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_goal
						SET title = ${title},
							description = ${description},
							weight = ${weight},
							period_start = ${periodStart},
							period_end = ${periodEnd},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.goalId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_goal', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance goal",
				});
			}
			return mapGoalSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update performance goal");
		}
	},

	async submitPerformanceGoal(input, _ports, meta) {
		return mutateGoalStatus(this, input, "submitted", meta);
	},

	async rejectPerformanceGoal(input, _ports, meta) {
		return mutateGoalStatus(this, input, "rejected", meta);
	},

	async closePerformanceGoal(input, _ports, meta) {
		return mutateGoalStatus(this, input, "closed", meta);
	},

	async cancelPerformanceGoal(input, _ports, meta) {
		return mutateGoalStatus(this, input, "cancelled", meta);
	},

	async approvePerformanceGoal(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance goal not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertGoalStatusTransition(
			existing.data.status,
			"approved",
		);
		if (!transition.ok) return transition;

		const goal = existing.data;
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: goal.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}

		if (cycle.data.weightingModel === "percent100") {
			const peerGoals = await db
				.select()
				.from(hrPerformanceGoal)
				.where(
					and(
						eq(hrPerformanceGoal.organizationId, input.organizationId),
						eq(hrPerformanceGoal.cycleId, goal.cycleId),
						eq(hrPerformanceGoal.employeeId, goal.employeeId),
					),
				);
			const hasPendingSubmitted = peerGoals.some(
				(g) => g.id !== input.goalId && g.status === "submitted",
			);
			if (!hasPendingSubmitted) {
				const weights = peerGoals
					.filter(
						(g) =>
							g.id === input.goalId ||
							g.status === "approved" ||
							g.status === "active",
					)
					.map((g) => (g.id === input.goalId ? goal.weight : g.weight))
					.filter((w): w is string => w !== null);
				const weightCheck = assertGoalWeightsSumTo100(weights);
				if (!weightCheck.ok) return weightCheck;
			}
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_goal",
			entityId: input.goalId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[GoalSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_goal
						SET status = 'approved',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.goalId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${goal.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_goal', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance goal",
				});
			}
			return mapGoalSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to approve performance goal");
		}
	},

	async recordGoalProgress(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance goal not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceGoalProgressable(existing.data.status)) {
			return invalidState("Goal is not in a progressable status");
		}

		const idResult = newBrandId(humanResourcesGoalProgressIdSchema);
		if (!idResult.ok) return idResult;
		const auditId = randomUUID();
		const recordedAt = new Date();

		try {
			const [rows] = await runNeonHttpTransaction<[GoalProgressSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_goal_progress (
							id, organization_id, goal_id, recorded_at,
							progress_note, progress_value, recorded_by
						) VALUES (
							${idResult.data}, ${input.organizationId}, ${input.goalId},
							${recordedAt}, ${input.progressNote}, ${input.progressValue},
							${input.actorUserId}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_goal_progress', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = rows[0];
			if (!row) return fail("INTERNAL_ERROR", "Failed to record goal progress");
			return mapGoalProgressSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record goal progress");
		}
	},

	async listEmployeeGoals(input) {
		try {
			let query = db
				.select()
				.from(hrPerformanceGoal)
				.where(
					and(
						eq(hrPerformanceGoal.organizationId, input.organizationId),
						eq(hrPerformanceGoal.employeeId, input.employeeId),
					),
				)
				.$dynamic();
			if (input.status !== undefined) {
				query = query.where(eq(hrPerformanceGoal.status, input.status));
			}
			const rows = await query.orderBy(desc(hrPerformanceGoal.createdAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const goals: PerformanceGoal[] = [];
			for (const row of paged) {
				const mapped = mapGoal(row);
				if (!mapped.ok) return mapped;
				goals.push(mapped.data);
			}
			return ok({
				goals,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list employee goals");
		}
	},
	async startPerformanceReview(input, _ports, meta) {
		if (input.managerEmployeeId === input.employeeId) {
			return invalidInput("Manager cannot be the same as the review employee");
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleOpen(cycle.data.status)) {
			return invalidState("Reviews can only be started in open cycles");
		}
		const active = await isActiveParticipantDb(
			input.organizationId,
			input.cycleId,
			input.employmentId,
		);
		if (!active.ok) return active;
		if (!active.data) {
			return invalidState("Employee is not an active cycle participant");
		}

		const refs = await assertEmployeeEmployment(
			this,
			input.organizationId,
			input.employeeId,
			input.employmentId,
		);
		if (!refs.ok) return refs;

		try {
			const duplicate = await db
				.select({ id: hrPerformanceReview.id })
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(hrPerformanceReview.cycleId, input.cycleId),
						eq(hrPerformanceReview.employeeId, input.employeeId),
					),
				)
				.limit(1);
			if (duplicate[0]) {
				return conflict(
					"Performance review already exists for this employee in cycle",
				);
			}
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to check duplicate review");
		}

		const reviewIdResult = parseHumanResourcesReviewId(randomUUID());
		if (!reviewIdResult.ok) return reviewIdResult;
		const selfParticipantId = newBrandId(
			humanResourcesReviewParticipantIdSchema,
		);
		const managerParticipantId = newBrandId(
			humanResourcesReviewParticipantIdSchema,
		);
		const selfAssessmentId = newBrandId(humanResourcesAssessmentIdSchema);
		const managerAssessmentId = newBrandId(humanResourcesAssessmentIdSchema);
		if (
			!selfParticipantId.ok ||
			!managerParticipantId.ok ||
			!selfAssessmentId.ok ||
			!managerAssessmentId.ok
		) {
			return fail(
				"INTERNAL_ERROR",
				"Failed to allocate performance review identifiers",
			);
		}

		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH inserted_review AS (
						INSERT INTO hr_performance_review (
							id, organization_id, cycle_id, employee_id, employment_id,
							status, version, created_by, updated_by
						) VALUES (
							${reviewIdResult.data}, ${input.organizationId}, ${input.cycleId},
							${input.employeeId}, ${input.employmentId},
							'draft', 1, ${input.actorUserId}, ${input.actorUserId}
						)
						RETURNING *
					),
					inserted_participants AS (
						INSERT INTO hr_performance_review_participant (
							id, organization_id, review_id, role, employee_id,
							version, created_by, updated_by
						) VALUES
							(
								${selfParticipantId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'self', ${input.employeeId}, 1, ${input.actorUserId}, ${input.actorUserId}
							),
							(
								${managerParticipantId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'manager', ${input.managerEmployeeId}, 1, ${input.actorUserId}, ${input.actorUserId}
							)
						RETURNING review_id
					),
					inserted_assessments AS (
						INSERT INTO hr_performance_assessment (
							id, organization_id, review_id, kind,
							version, created_by, updated_by
						) VALUES
							(
								${selfAssessmentId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'self', 1, ${input.actorUserId}, ${input.actorUserId}
							),
							(
								${managerAssessmentId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'manager', 1, ${input.actorUserId}, ${input.actorUserId}
							)
						RETURNING review_id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_review', id, 'CREATE', '[]'::jsonb
						FROM inserted_review
						RETURNING id
					)
					SELECT inserted_review.* FROM inserted_review, audited
				`,
				],
			);
			const row = rows[0];
			if (!row)
				return fail("INTERNAL_ERROR", "Failed to start performance review");
			return mapReviewSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict(
					"Performance review already exists for this employee in cycle",
				);
			}
			return mapPersistenceFailure(error, "Failed to start performance review");
		}
	},

	async submitSelfAssessment(input, _ports, meta) {
		return submitAssessment(this, input, "self", "self_submitted", meta);
	},

	async submitManagerAssessment(input, _ports, meta) {
		const review = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!review.ok) return review;
		if (review.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (input.managerEmployeeId === review.data.review.employeeId) {
			return invalidInput("Manager cannot be the same as the review employee");
		}
		return submitAssessment(
			this,
			{
				organizationId: input.organizationId,
				reviewId: input.reviewId,
				rating: input.rating,
				commentsSensitive: input.commentsSensitive,
				actorUserId: input.actorUserId,
				actorEmployeeId: input.managerEmployeeId,
				expectedVersion: input.expectedVersion,
			},
			"manager",
			"manager_submitted",
			meta,
		);
	},

	async returnPerformanceReviewForCorrection(input, _ports, meta) {
		return mutateReviewStatus(this, input, "returned", meta);
	},

	async acknowledgePerformanceReview(input, _ports, meta) {
		const existing = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const review = existing.data.review;
		const immutable = assertReviewNotFinalized(review.status);
		if (!immutable.ok) return immutable;
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertReviewStatusTransition(
			review.status,
			"acknowledged",
		);
		if (!transition.ok) return transition;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_review
						SET acknowledgement_note = ${input.acknowledgementNote},
							status = 'acknowledged',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${review.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_review', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance review",
				});
			}
			return mapReviewSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to acknowledge performance review",
			);
		}
	},

	async finalizePerformanceReview(input, _ports, meta) {
		try {
			const idemRows = await db
				.select()
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(
							hrPerformanceReview.finalizeIdempotencyKey,
							input.finalizeIdempotencyKey,
						),
					),
				)
				.limit(1);
			const idemRow = idemRows[0];
			if (idemRow) {
				return mapReview(idemRow);
			}
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to check finalize idempotency",
			);
		}

		const detail = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!detail.ok) return detail;
		if (detail.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const review = detail.data.review;
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertReviewStatusTransition(review.status, "finalized");
		if (!transition.ok) return transition;

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: review.cycleId,
		});
		if (!cycle.ok) return cycle;
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const ratingCheck = validateRatingInScale(
			input.overallRating,
			cycle.data.ratingScale,
		);
		if (!ratingCheck.ok) return ratingCheck;

		const selfAssessment = detail.data.assessments.find(
			(a) => a.kind === "self",
		);
		const managerAssessment = detail.data.assessments.find(
			(a) => a.kind === "manager",
		);
		if (!selfAssessment || !managerAssessment) {
			return invalidState("Review is missing required assessments");
		}
		if (!selfAssessment.submittedAt || !managerAssessment.submittedAt) {
			return invalidState(
				"Both self and manager assessments must be submitted",
			);
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_review",
			entityId: input.reviewId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_review
						SET overall_rating = ${input.overallRating},
							status = 'finalized',
							finalize_idempotency_key = ${input.finalizeIdempotencyKey},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${review.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_review', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance review",
				});
			}
			return mapReviewSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const replay = await db
					.select()
					.from(hrPerformanceReview)
					.where(
						and(
							eq(hrPerformanceReview.organizationId, input.organizationId),
							eq(
								hrPerformanceReview.finalizeIdempotencyKey,
								input.finalizeIdempotencyKey,
							),
						),
					)
					.limit(1);
				const replayRow = replay[0];
				if (replayRow) return mapReview(replayRow);
			}
			return mapPersistenceFailure(
				error,
				"Failed to finalize performance review",
			);
		}
	},

	async reopenPerformanceReview(input, _ports, meta) {
		const existing = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const review = existing.data.review;
		if (!isPerformanceReviewFinalized(review.status)) {
			return invalidState("Only finalized reviews can be reopened");
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertReviewStatusTransition(review.status, "reopened");
		if (!transition.ok) return transition;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_review",
			entityId: input.reviewId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[ReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_review
						SET status = 'reopened',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${review.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_review', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance review",
				});
			}
			return mapReviewSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to reopen performance review",
			);
		}
	},

	async getPerformanceReviewById(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(hrPerformanceReview.id, input.reviewId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const review = mapReview(row);
			if (!review.ok) return review;

			const participantRows = await db
				.select()
				.from(hrPerformanceReviewParticipant)
				.where(
					and(
						eq(
							hrPerformanceReviewParticipant.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceReviewParticipant.reviewId, input.reviewId),
					),
				);
			const participants: PerformanceReviewParticipant[] = [];
			for (const p of participantRows) {
				const mapped = mapReviewParticipantSql({
					id: p.id,
					organization_id: p.organizationId,
					review_id: p.reviewId,
					role: p.role,
					employee_id: p.employeeId,
					user_id: p.userId,
					version: p.version,
					created_by: p.createdBy,
					updated_by: p.updatedBy,
					created_at: p.createdAt,
					updated_at: p.updatedAt,
				});
				if (!mapped.ok) return mapped;
				participants.push(mapped.data);
			}

			const assessmentRows = await db
				.select()
				.from(hrPerformanceAssessment)
				.where(
					and(
						eq(hrPerformanceAssessment.organizationId, input.organizationId),
						eq(hrPerformanceAssessment.reviewId, input.reviewId),
					),
				);
			const assessments: PerformanceAssessment[] = [];
			for (const a of assessmentRows) {
				const mapped = mapAssessment(a);
				if (!mapped.ok) return mapped;
				assessments.push(mapped.data);
			}

			return ok(
				projectPerformanceReviewDetail(
					{ review: review.data, participants, assessments },
					input.includeConfidential,
				),
			);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load performance review");
		}
	},

	async listEmployeePerformanceReviews(input) {
		try {
			const query = db
				.select()
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(hrPerformanceReview.employeeId, input.employeeId),
					),
				)
				.$dynamic();
			const rows = await query.orderBy(desc(hrPerformanceReview.createdAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const reviews: PerformanceReview[] = [];
			for (const row of paged) {
				const mapped = mapReview(row);
				if (!mapped.ok) return mapped;
				reviews.push(mapped.data);
			}
			return ok({
				reviews: redactReviewList(reviews, input.includeConfidential),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employee performance reviews",
			);
		}
	},

	async listReviewsPendingManagerAction(input) {
		try {
			const participantRows = await db
				.select()
				.from(hrPerformanceReviewParticipant)
				.where(
					and(
						eq(
							hrPerformanceReviewParticipant.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceReviewParticipant.role, "manager"),
						eq(
							hrPerformanceReviewParticipant.employeeId,
							input.managerEmployeeId,
						),
					),
				);
			const reviewIds = participantRows.map((p) => p.reviewId);
			if (reviewIds.length === 0) {
				return ok({
					reviews: [],
					totalCount: 0,
					page: input.page,
					pageSize: input.pageSize,
				});
			}

			const rows = await db
				.select()
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(hrPerformanceReview.status, "self_submitted"),
					),
				)
				.orderBy(desc(hrPerformanceReview.createdAt));

			const idSet = new Set(reviewIds);
			const filtered = rows.filter((r) => idSet.has(r.id));
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = filtered.slice(start, start + input.pageSize);
			const reviews: PerformanceReview[] = [];
			for (const row of paged) {
				const mapped = mapReview(row);
				if (!mapped.ok) return mapped;
				reviews.push(mapped.data);
			}
			return ok({
				reviews,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list reviews pending manager action",
			);
		}
	},

	async getImprovementPlanById(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceImprovementPlan)
				.where(
					and(
						eq(
							hrPerformanceImprovementPlan.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceImprovementPlan.id, input.planId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load improvement plan");
		}
	},

	async findImprovementPlanByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceImprovementPlan)
				.where(
					and(
						eq(
							hrPerformanceImprovementPlan.organizationId,
							input.organizationId,
						),
						eq(
							hrPerformanceImprovementPlan.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const plan = mapPlan(row);
			if (!plan.ok) return plan;
			return ok({
				plan: plan.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find plan by idempotency key",
			);
		}
	},

	async createImprovementPlan(record, _ports, meta) {
		const existing = await this.findImprovementPlanByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.plan);
			}
			return conflict("Idempotency key already used with different data");
		}

		const reviewRows = await db
			.select()
			.from(hrPerformanceReview)
			.where(
				and(
					eq(hrPerformanceReview.organizationId, record.organizationId),
					eq(hrPerformanceReview.id, record.reviewId),
				),
			)
			.limit(1);
		const reviewRow = reviewRows[0];
		if (!reviewRow) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const review = mapReview(reviewRow);
		if (!review.ok) return review;
		if (!isPerformanceReviewFinalized(review.data.status)) {
			return invalidState("Improvement plans require a finalized review");
		}

		const refs = await assertEmployeeEmployment(
			this,
			record.organizationId,
			record.employeeId,
			record.employmentId,
		);
		if (!refs.ok) return refs;

		const idResult = parseHumanResourcesImprovementPlanId(randomUUID());
		if (!idResult.ok) return idResult;
		const checkpointId = newBrandId(
			humanResourcesImprovementCheckpointIdSchema,
		);
		if (!checkpointId.ok) return checkpointId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[PlanSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH inserted_plan AS (
						INSERT INTO hr_performance_improvement_plan (
							id, organization_id, review_id, employee_id, employment_id,
							performance_gap, expected_outcome, measurable_actions, support_resources,
							due_date, accountable_manager_employee_id, status,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						) VALUES (
							${idResult.data}, ${record.organizationId}, ${record.reviewId},
							${record.employeeId}, ${record.employmentId},
							${record.performanceGap}, ${record.expectedOutcome},
							${record.measurableActions}, ${record.supportResources},
							${record.dueDate}, ${record.accountableManagerEmployeeId}, 'draft',
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					inserted_checkpoint AS (
						INSERT INTO hr_performance_improvement_checkpoint (
							id, organization_id, plan_id, sequence_number, due_date, outcome
						)
						SELECT
							${checkpointId.data}, organization_id, id, 1, due_date, 'pending'
						FROM inserted_plan
						RETURNING plan_id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_performance_improvement_plan', id, 'CREATE', '[]'::jsonb
						FROM inserted_plan
						RETURNING id
					)
					SELECT inserted_plan.* FROM inserted_plan, audited
				`,
			]);
			const row = rows[0];
			if (!row)
				return fail("INTERNAL_ERROR", "Failed to create improvement plan");
			return mapPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findImprovementPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.plan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to create improvement plan");
		}
	},

	async openImprovementPlan(input, _ports, meta) {
		const existing = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Improvement plan not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertImprovementPlanStatusTransition(
			existing.data.status,
			"open",
		);
		if (!transition.ok) return transition;

		const plan = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_improvement_plan",
			entityId: input.planId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[PlanSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_plan
						SET status = 'open',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.planId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${plan.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_improvement_plan', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Improvement plan",
				});
			}
			return mapPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to open improvement plan");
		}
	},

	async acknowledgeImprovementPlan(input, _ports, meta) {
		return mutatePlanStatus(this, input, "acknowledged", meta);
	},

	async recordImprovementCheckpoint(input, _ports, meta) {
		const plan = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null) {
			return notFound(
				"Improvement plan not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}

		try {
			const rows = await db
				.select()
				.from(hrPerformanceImprovementCheckpoint)
				.where(
					and(
						eq(
							hrPerformanceImprovementCheckpoint.organizationId,
							input.organizationId,
						),
						eq(hrPerformanceImprovementCheckpoint.planId, input.planId),
						eq(
							hrPerformanceImprovementCheckpoint.sequenceNumber,
							input.sequenceNumber,
						),
					),
				)
				.limit(1);
			const existing = rows[0];
			if (!existing) {
				return notFound(
					"Improvement checkpoint not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}

			const priorOutcome = performanceCheckpointOutcomeSchema.parse(
				existing.outcome,
			);
			const nextOutcome = performanceCheckpointOutcomeSchema.parse(
				input.outcome,
			);
			const outcomeCheck = assertCheckpointOutcomeTransition(
				priorOutcome,
				nextOutcome,
			);
			if (!outcomeCheck.ok) return outcomeCheck;

			const auditId = randomUUID();
			const recordedAt = new Date();

			const [updated] = await runNeonHttpTransaction<[CheckpointSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_checkpoint
						SET outcome = ${input.outcome},
							notes = ${input.notes},
							recorded_by = ${input.actorUserId},
							recorded_at = ${recordedAt},
							updated_at = now()
						WHERE id = ${existing.id}
							AND organization_id = ${input.organizationId}
							AND outcome = ${existing.outcome}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_improvement_checkpoint', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
				],
			);
			const row = updated[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Improvement checkpoint",
				});
			}
			return mapCheckpointSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record improvement checkpoint",
			);
		}
	},

	async amendImprovementPlan(input, _ports, meta) {
		const existing = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Improvement plan not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (
			existing.data.status === "completed" ||
			existing.data.status === "unsuccessful"
		) {
			return invalidState("Completed improvement plans cannot be amended");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const measurableActions =
			input.measurableActions !== undefined
				? input.measurableActions
				: existing.data.measurableActions;
		const supportResources =
			input.supportResources !== undefined
				? input.supportResources
				: existing.data.supportResources;
		const dueDate = input.dueDate ?? existing.data.dueDate;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[PlanSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_plan
						SET measurable_actions = ${measurableActions},
							support_resources = ${supportResources},
							due_date = ${dueDate},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.planId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_improvement_plan', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Improvement plan",
				});
			}
			return mapPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend improvement plan");
		}
	},

	async completeImprovementPlan(input, _ports, meta) {
		const existing = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound(
				"Improvement plan not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const transition = assertImprovementPlanStatusTransition(
			existing.data.status,
			"completed",
		);
		if (!transition.ok) return transition;

		const plan = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_performance_improvement_plan",
			entityId: input.planId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[PlanSqlRow[]]>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_plan
						SET status = 'completed',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.planId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = ${plan.status}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_performance_improvement_plan', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Improvement plan",
				});
			}
			return mapPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to complete improvement plan",
			);
		}
	},

	async closeImprovementPlanUnsuccessful(input, _ports, meta) {
		return mutatePlanStatus(this, input, "unsuccessful", meta);
	},

	async cancelImprovementPlan(input, _ports, meta) {
		return mutatePlanStatus(this, input, "cancelled", meta);
	},

	async listActiveImprovementPlans(input) {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceImprovementPlan)
				.where(
					eq(hrPerformanceImprovementPlan.organizationId, input.organizationId),
				)
				.orderBy(desc(hrPerformanceImprovementPlan.createdAt));
			const filtered = rows.filter(
				(p) => p.status === "open" || p.status === "acknowledged",
			);
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = filtered.slice(start, start + input.pageSize);
			const plans: PerformanceImprovementPlan[] = [];
			for (const row of paged) {
				const mapped = mapPlan(row);
				if (!mapped.ok) return mapped;
				plans.push(mapped.data);
			}
			return ok({
				plans,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list active improvement plans",
			);
		}
	},

	async getEmployeePerformanceHistory(input) {
		try {
			const reviewRows = await db
				.select()
				.from(hrPerformanceReview)
				.where(
					and(
						eq(hrPerformanceReview.organizationId, input.organizationId),
						eq(hrPerformanceReview.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrPerformanceReview.createdAt));

			const entries = [];
			for (const reviewRow of reviewRows) {
				const reviewMapped = mapReview(reviewRow);
				if (!reviewMapped.ok) return reviewMapped;

				const detailResult = await this.getPerformanceReviewById({
					organizationId: input.organizationId,
					reviewId: reviewMapped.data.id,
					includeConfidential: input.includeConfidential,
				});
				if (!detailResult.ok) return detailResult;
				if (detailResult.data === null) continue;

				const goalRows = await db
					.select()
					.from(hrPerformanceGoal)
					.where(
						and(
							eq(hrPerformanceGoal.organizationId, input.organizationId),
							eq(hrPerformanceGoal.employeeId, input.employeeId),
							eq(hrPerformanceGoal.cycleId, reviewMapped.data.cycleId),
						),
					);
				const goals: PerformanceGoal[] = [];
				for (const g of goalRows) {
					const mapped = mapGoal(g);
					if (!mapped.ok) return mapped;
					goals.push(mapped.data);
				}

				const planRows = await db
					.select()
					.from(hrPerformanceImprovementPlan)
					.where(
						and(
							eq(
								hrPerformanceImprovementPlan.organizationId,
								input.organizationId,
							),
							eq(hrPerformanceImprovementPlan.reviewId, reviewMapped.data.id),
						),
					);
				const improvementPlans: PerformanceImprovementPlan[] = [];
				for (const p of planRows) {
					const mapped = mapPlan(p);
					if (!mapped.ok) return mapped;
					improvementPlans.push(mapped.data);
				}

				entries.push({
					review: detailResult.data.review,
					overallRating: input.includeConfidential
						? reviewMapped.data.overallRating
						: null,
					assessments: detailResult.data.assessments,
					goals,
					improvementPlans,
				});
			}

			return ok({
				employeeId: input.employeeId,
				entries,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee performance history",
			);
		}
	},
};

export function attachDrizzlePerformance(target: PerformanceHost): void {
	Object.assign(target, drizzlePerformanceMethods);
}
