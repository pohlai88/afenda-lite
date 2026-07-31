import { randomUUID } from "node:crypto";

import {
	type PreparedDerivedEntityAuditInsertValues,
	type PreparedTransactionalAuditInsertValues,
	prepareDerivedEntityAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	and,
	db,
	desc,
	eq,
	hrPerformanceAssessment,
	hrPerformanceCycle,
	hrPerformanceCycleEligibility,
	hrPerformanceCycleParticipant,
	hrPerformanceCycleReviewPeriod,
	hrPerformanceGoal,
	hrPerformanceGoalProgress,
	hrPerformanceImprovementCheckpoint,
	hrPerformanceImprovementPlan,
	hrPerformanceReview,
	hrPerformanceReviewParticipant,
	runNeonHttpTransaction,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
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
import { projectPerformanceReviewDetailForReader } from "../../performance/performance-field-projection";
import { tenureDaysOn } from "../../shared/benefit-guards";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import { employmentStatusSchema } from "../../shared/employment-status";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	assertEmploymentEligibleForPerformanceCycle,
	isEmploymentEligibleForPerformanceCycle,
	performanceCycleEligibilityAsOfDate,
} from "../../shared/performance-cycle-eligibility";
import {
	assertCheckpointOutcomeTransition,
	assertCyclePublishReady,
	assertCycleStatusTransition,
	assertGoalAlignment,
	assertGoalDatesWithinCycle,
	assertGoalEditable,
	assertGoalStatusTransition,
	assertGoalWeightForModel,
	assertGoalWeightsSumTo100,
	assertImprovementPlanExtension,
	assertImprovementPlanMilestones,
	assertImprovementPlanStatusTransition,
	assertNoPendingCheckpoints,
	assertPriorDelegatedAssessmentsSubmitted,
	assertReviewNotFinalized,
	assertReviewPeriodsNonOverlapping,
	assertReviewPeriodsWithinCycle,
	assertReviewStatusTransition,
	assertValidCyclePeriod,
	nextDelegatedSequenceNumber,
} from "../../shared/performance-guards";
import {
	assertRatingScaleUniqueCodes,
	parseRatingScale,
	validateRatingInScale,
} from "../../shared/performance-rating";
import {
	isPerformanceCycleConfigurable,
	isPerformanceCycleOpen,
	isPerformanceCycleParticipantEnrollable,
	isPerformanceGoalProgressable,
	isPerformanceReviewFinalized,
	performanceAssessmentKindSchema,
	performanceCheckpointOutcomeSchema,
	performanceCycleParticipantStatusSchema,
	performanceCycleReviewPeriodKindSchema,
	performanceCycleStatusSchema,
	performanceGoalKindSchema,
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
import { isResultFailure } from "../../shared/result-guards";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../shared/run-sequential";
import type { HumanResourcesStore } from "../../store";
import type {
	EmployeePerformanceHistoryEntry,
	PerformanceAssessment,
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
	PerformanceGoal,
	PerformanceGoalProgress,
	PerformanceGoalProgressListPage,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementCheckpointListPage,
	PerformanceImprovementPlan,
	PerformanceReview,
	PerformanceReviewParticipant,
} from "../../types";
import {
	PERFORMANCE_REVIEW_MANAGER_SEQUENCE,
	PERFORMANCE_REVIEW_SELF_SEQUENCE,
} from "../../types";

const PERFORMANCE_AUDIT_SOURCE = "human-resources.performance-drizzle";

type PerformanceAuditEntity =
	| "hr_performance_assessment"
	| "hr_performance_cycle"
	| "hr_performance_cycle_eligibility"
	| "hr_performance_cycle_participant"
	| "hr_performance_cycle_review_period"
	| "hr_performance_goal"
	| "hr_performance_goal_progress"
	| "hr_performance_improvement_checkpoint"
	| "hr_performance_improvement_plan"
	| "hr_performance_review"
	| "hr_performance_review_participant";

interface PerformanceAuditInput {
	action: "CREATE" | "DELETE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: PerformanceAuditEntity;
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function performanceAuditEventContext(input: {
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	reasonCode: string;
}) {
	return {
		version: 1 as const,
		outcome: "SUCCEEDED" as const,
		source: PERFORMANCE_AUDIT_SOURCE,
		causationId:
			input.meta.causationId ??
			input.meta.idempotencyKey ??
			input.correlationId,
		reasonCode: input.reasonCode,
	};
}

function preparePerformanceAudit(
	input: PerformanceAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return prepareTransactionalAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: performanceAuditEventContext(input),
	});
}

function prepareDerivedPerformanceAudit(
	input: Omit<PerformanceAuditInput, "entityId">,
): Result<PreparedDerivedEntityAuditInsertValues> {
	return prepareDerivedEntityAuditInsertValues({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: performanceAuditEventContext(input),
	});
}

interface PerformanceHost {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	listEmployees: HumanResourcesStore["listEmployees"];
	listEmploymentsByEmployee: HumanResourcesStore["listEmploymentsByEmployee"];
}

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
	| "publishPerformanceCycle"
	| "setPerformanceCycleReviewPeriods"
	| "listPerformanceCycleReviewPeriods"
	| "setPerformanceCycleEligibility"
	| "getPerformanceCycleEligibility"
	| "enrollEligibleCycleParticipants"
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
	| "activatePerformanceGoal"
	| "alignPerformanceGoal"
	| "closePerformanceGoal"
	| "cancelPerformanceGoal"
	| "listGoalProgress"
	| "listEmployeeGoals"
	| "startPerformanceReview"
	| "submitSelfAssessment"
	| "submitManagerAssessment"
	| "addDelegatedReviewer"
	| "submitDelegatedAssessment"
	| "calibratePerformanceReview"
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
	| "listImprovementPlanCheckpoints"
	| "getEmployeePerformanceHistory"
>;

interface CycleSqlRow {
	code: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	id: string;
	name: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	rating_scale: unknown;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	weighting_model: string;
}

interface ParticipantSqlRow {
	created_at: Date;
	created_by: string;
	cycle_id: string;
	employee_id: string;
	employment_id: string;
	id: string;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface ReviewPeriodSqlRow {
	created_at: Date;
	created_by: string;
	cycle_id: string;
	id: string;
	kind: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	updated_at: Date;
	updated_by: string;
}

interface EligibilitySqlRow {
	allowed_employment_statuses: string;
	created_at: Date;
	created_by: string;
	cycle_id: string;
	id: string;
	min_tenure_days: number | null;
	organization_id: string;
	updated_at: Date;
	updated_by: string;
}

interface GoalSqlRow {
	aligned_to_goal_id: string | null;
	completion_evidence_reference: string | null;
	completion_note: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	cycle_id: string;
	description: string | null;
	employee_id: string;
	employment_id: string;
	exception_outside_cycle: boolean;
	goal_kind: string;
	id: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
	weight: string | null;
}

interface GoalProgressSqlRow {
	created_at: Date;
	evidence_reference: string | null;
	goal_id: string;
	id: string;
	organization_id: string;
	progress_note: string;
	progress_value: string | null;
	recorded_at: Date;
	recorded_by: string;
	updated_at: Date;
}

interface ReviewSqlRow {
	acknowledgement_note: string | null;
	calibration_note: string | null;
	created_at: Date;
	created_by: string;
	cycle_id: string;
	employee_id: string;
	employment_id: string;
	finalize_idempotency_key: string | null;
	id: string;
	organization_id: string;
	overall_rating: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface ReviewParticipantSqlRow {
	created_at: Date;
	created_by: string;
	employee_id: string | null;
	id: string;
	organization_id: string;
	review_id: string;
	role: string;
	sequence_number: number;
	updated_at: Date;
	updated_by: string;
	user_id: string | null;
	version: number;
}

interface AssessmentSqlRow {
	comments_sensitive: string | null;
	created_at: Date;
	created_by: string;
	id: string;
	kind: string;
	organization_id: string;
	participant_id: string;
	rating: string | null;
	review_id: string;
	submitted_at: Date | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface PlanSqlRow {
	accountable_manager_employee_id: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	due_date: string;
	employee_id: string;
	employment_id: string;
	expected_outcome: string;
	id: string;
	last_extension_evidence_reference: string | null;
	last_extension_reason: string | null;
	measurable_actions: string;
	organization_id: string;
	outcome_evidence_reference: string | null;
	outcome_reason: string | null;
	performance_gap: string;
	review_id: string;
	status: string;
	support_resources: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CheckpointSqlRow {
	created_at: Date;
	due_date: string;
	evidence_reference: string | null;
	id: string;
	notes: string | null;
	organization_id: string;
	outcome: string;
	plan_id: string;
	recorded_at: Date | null;
	recorded_by: string | null;
	sequence_number: number;
	updated_at: Date;
}

function mapCycleSql(row: CycleSqlRow): Result<PerformanceCycle> {
	const id = parseHumanResourcesPerformanceCycleId(row.id);
	if (!id.ok) {
		return id;
	}
	const ratingScale = parseRatingScale(row.rating_scale);
	if (!ratingScale.ok) {
		return ratingScale;
	}
	const status = performanceCycleStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const weightingModel = performanceWeightingModelSchema.safeParse(
		row.weighting_model,
	);
	if (!weightingModel.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) {
		return cycleId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = performanceCycleParticipantStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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

function mapReviewPeriodSql(
	row: ReviewPeriodSqlRow,
): Result<PerformanceCycleReviewPeriod> {
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) {
		return cycleId;
	}
	const kind = performanceCycleReviewPeriodKindSchema.safeParse(row.kind);
	if (!kind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		kind: kind.data,
		periodStart: row.period_start,
		periodEnd: row.period_end,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapEligibilitySql(
	row: EligibilitySqlRow,
): Result<PerformanceCycleEligibility> {
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) {
		return cycleId;
	}
	const statuses = row.allowed_employment_statuses
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
	const allowedEmploymentStatuses: PerformanceCycleEligibility["allowedEmploymentStatuses"] =
		[];
	for (const status of statuses) {
		const parsed = employmentStatusSchema.safeParse(status);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		allowedEmploymentStatuses.push(parsed.data);
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		minTenureDays: row.min_tenure_days,
		allowedEmploymentStatuses,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

async function loadCycleReviewPeriods(input: {
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
}): Promise<Result<PerformanceCycleReviewPeriod[]>> {
	try {
		const rows = await db
			.select()
			.from(hrPerformanceCycleReviewPeriod)
			.where(
				and(
					eq(
						hrPerformanceCycleReviewPeriod.organizationId,
						input.organizationId,
					),
					eq(hrPerformanceCycleReviewPeriod.cycleId, input.cycleId),
				),
			);
		const periods: PerformanceCycleReviewPeriod[] = [];
		for (const row of rows) {
			const mapped = mapReviewPeriodSql({
				id: row.id,
				organization_id: row.organizationId,
				cycle_id: row.cycleId,
				kind: row.kind,
				period_start: row.periodStart,
				period_end: row.periodEnd,
				created_by: row.createdBy,
				updated_by: row.updatedBy,
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			});
			if (!mapped.ok) {
				return mapped;
			}
			periods.push(mapped.data);
		}
		return errorResult.ok(periods);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load cycle review periods");
	}
}

async function loadCycleEligibility(input: {
	organizationId: string;
	cycleId: HumanResourcesPerformanceCycleId;
}): Promise<Result<PerformanceCycleEligibility | null>> {
	try {
		const rows = await db
			.select()
			.from(hrPerformanceCycleEligibility)
			.where(
				and(
					eq(
						hrPerformanceCycleEligibility.organizationId,
						input.organizationId,
					),
					eq(hrPerformanceCycleEligibility.cycleId, input.cycleId),
				),
			)
			.limit(1);
		const [row] = rows;
		if (!row) {
			return errorResult.ok(null);
		}
		return mapEligibilitySql({
			id: row.id,
			organization_id: row.organizationId,
			cycle_id: row.cycleId,
			min_tenure_days: row.minTenureDays,
			allowed_employment_statuses: row.allowedEmploymentStatuses,
			created_by: row.createdBy,
			updated_by: row.updatedBy,
			created_at: row.createdAt,
			updated_at: row.updatedAt,
		});
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load cycle eligibility");
	}
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
	if (!id.ok) {
		return id;
	}
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) {
		return cycleId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = performanceGoalStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const goalKind = performanceGoalKindSchema.safeParse(row.goal_kind);
	if (!goalKind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const alignedToGoalId =
		row.aligned_to_goal_id === null
			? errorResult.ok(null)
			: parseHumanResourcesGoalId(row.aligned_to_goal_id);
	if (isResultFailure(alignedToGoalId)) {
		return alignedToGoalId;
	}
	return errorResult.ok({
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
		goalKind: goalKind.data,
		alignedToGoalId: alignedToGoalId.data,
		completionNote: row.completion_note,
		completionEvidenceReference: row.completion_evidence_reference,
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
		goal_kind: row.goalKind,
		aligned_to_goal_id: row.alignedToGoalId,
		completion_note: row.completionNote,
		completion_evidence_reference: row.completionEvidenceReference,
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
	if (!id.ok) {
		return id;
	}
	const goalId = parseHumanResourcesGoalId(row.goal_id);
	if (!goalId.ok) {
		return goalId;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		goalId: goalId.data,
		recordedAt: row.recorded_at,
		progressNote: row.progress_note,
		progressValue: row.progress_value,
		evidenceReference: row.evidence_reference,
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
		evidence_reference: row.evidenceReference,
		recorded_by: row.recordedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

function mapReviewSql(row: ReviewSqlRow): Result<PerformanceReview> {
	const id = parseHumanResourcesReviewId(row.id);
	if (!id.ok) {
		return id;
	}
	const cycleId = parseHumanResourcesPerformanceCycleId(row.cycle_id);
	if (!cycleId.ok) {
		return cycleId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	const status = performanceReviewStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		cycleId: cycleId.data,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		overallRating: row.overall_rating,
		acknowledgementNote: row.acknowledgement_note,
		calibrationNote: row.calibration_note,
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
		calibration_note: row.calibrationNote,
		status: row.status,
		finalize_idempotency_key: row.finalizeIdempotencyKey,
		version: row.version,
		created_by: row.createdBy,
		updated_by: row.updatedBy,
		created_at: row.createdAt,
		updated_at: row.updatedAt,
	});
}

async function findFinalizedReviewReplay(input: {
	finalizeIdempotencyKey: string;
	organizationId: string;
}): Promise<Result<PerformanceReview | null>> {
	try {
		const rows = await db
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
		const [row] = rows;
		return row ? mapReview(row) : errorResult.ok(null);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to check finalize idempotency");
	}
}

function validateReviewFinalizationContent(input: {
	assessments: readonly Pick<PerformanceAssessment, "kind" | "submittedAt">[];
	overallRating: Parameters<typeof validateRatingInScale>[0];
	ratingScale: Parameters<typeof validateRatingInScale>[1];
}): Result<true> {
	const ratingCheck = validateRatingInScale(
		input.overallRating,
		input.ratingScale,
	);
	if (!ratingCheck.ok) {
		return ratingCheck;
	}

	const selfAssessment = input.assessments.find(
		(assessment) => assessment.kind === "self",
	);
	const managerAssessment = input.assessments.find(
		(assessment) => assessment.kind === "manager",
	);
	if (!(selfAssessment && managerAssessment)) {
		return invalidState("Review is missing required assessments");
	}
	if (!(selfAssessment.submittedAt && managerAssessment.submittedAt)) {
		return invalidState("Both self and manager assessments must be submitted");
	}
	return errorResult.ok(true);
}

function mapReviewParticipantSql(
	row: ReviewParticipantSqlRow,
): Result<PerformanceReviewParticipant> {
	const id = parseHumanResourcesReviewParticipantId(row.id);
	if (!id.ok) {
		return id;
	}
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) {
		return reviewId;
	}
	let employeeId: HumanResourcesEmployeeId | null = null;
	if (row.employee_id !== null) {
		const parsed = parseHumanResourcesEmployeeId(row.employee_id);
		if (!parsed.ok) {
			return parsed;
		}
		employeeId = parsed.data;
	}
	const role = row.role as PerformanceReviewParticipant["role"];
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		reviewId: reviewId.data,
		role,
		employeeId,
		userId: row.user_id,
		sequenceNumber: row.sequence_number,
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
	if (!id.ok) {
		return id;
	}
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) {
		return reviewId;
	}
	const participantId = parseHumanResourcesReviewParticipantId(
		row.participant_id,
	);
	if (!participantId.ok) {
		return participantId;
	}
	const kind = performanceAssessmentKindSchema.safeParse(row.kind);
	if (!kind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		reviewId: reviewId.data,
		participantId: participantId.data,
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
		participant_id: row.participantId,
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
	if (!id.ok) {
		return id;
	}
	const reviewId = parseHumanResourcesReviewId(row.review_id);
	if (!reviewId.ok) {
		return reviewId;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
	if (!employmentId.ok) {
		return employmentId;
	}
	const managerId = parseHumanResourcesEmployeeId(
		row.accountable_manager_employee_id,
	);
	if (!managerId.ok) {
		return managerId;
	}
	const status = performanceImprovementPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
		outcomeReason: row.outcome_reason,
		outcomeEvidenceReference: row.outcome_evidence_reference,
		lastExtensionReason: row.last_extension_reason,
		lastExtensionEvidenceReference: row.last_extension_evidence_reference,
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
		outcome_reason: row.outcomeReason,
		outcome_evidence_reference: row.outcomeEvidenceReference,
		last_extension_reason: row.lastExtensionReason,
		last_extension_evidence_reference: row.lastExtensionEvidenceReference,
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
	if (!id.ok) {
		return id;
	}
	const planId = parseHumanResourcesImprovementPlanId(row.plan_id);
	if (!planId.ok) {
		return planId;
	}
	const outcome = performanceCheckpointOutcomeSchema.safeParse(row.outcome);
	if (!outcome.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		planId: planId.data,
		sequenceNumber: row.sequence_number,
		dueDate: row.due_date,
		outcome: outcome.data,
		notes: row.notes,
		evidenceReference: row.evidence_reference,
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
		evidence_reference: row.evidenceReference,
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
	return errorResult.ok(true);
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
		return errorResult.ok(rows.length > 0);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to check cycle participant");
	}
}

function newBrandId<T>(schema: {
	safeParse: (v: string) => { success: boolean; data?: T };
}): Result<T> {
	const parsed = schema.safeParse(randomUUID());
	if (!parsed.success || parsed.data === undefined) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}
	return errorResult.ok(parsed.data);
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
	meta: HumanResourcesMutationMeta,
): Promise<Result<PerformanceGoal>> {
	const existing = await host.getPerformanceGoalById({
		organizationId: input.organizationId,
		goalId: input.goalId,
	});
	if (!existing.ok) {
		return existing;
	}
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
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertGoalStatusTransition(
		existing.data.status,
		nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const nextVersion = input.expectedVersion + 1;
	const preparedAudit = preparePerformanceAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_performance_goal",
		entityId: input.goalId,
		action: "UPDATE",
		oldValue: { status: existing.data.status, version: input.expectedVersion },
		newValue: { status: nextStatus, version: nextVersion },
		meta,
		reasonCode: "PERFORMANCE_GOAL_STATUS_CHANGED",
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const auditId = randomUUID();
	const currentStatus = existing.data.status;

	try {
		const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const [row] = rows;
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

async function loadAlignmentAncestorMap(input: {
	organizationId: string;
	startParentId: HumanResourcesGoalId;
}): Promise<Map<string, { id: string; alignedToGoalId: string | null }>> {
	const map = new Map<string, { id: string; alignedToGoalId: string | null }>();
	const loadAncestor = async (cursor: string | null): Promise<void> => {
		if (cursor === null || map.has(cursor)) {
			return;
		}
		const rows: Array<{
			id: string;
			alignedToGoalId: string | null;
		}> = await db
			.select({
				id: hrPerformanceGoal.id,
				alignedToGoalId: hrPerformanceGoal.alignedToGoalId,
			})
			.from(hrPerformanceGoal)
			.where(
				and(
					eq(hrPerformanceGoal.organizationId, input.organizationId),
					eq(hrPerformanceGoal.id, cursor),
				),
			)
			.limit(1);
		const [row] = rows;
		if (!row) {
			return;
		}
		map.set(row.id, {
			id: row.id,
			alignedToGoalId: row.alignedToGoalId,
		});
		await loadAncestor(row.alignedToGoalId);
	};
	await loadAncestor(input.startParentId);
	return map;
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
	meta: HumanResourcesMutationMeta,
): Promise<Result<PerformanceReview>> {
	const detail = await host.getPerformanceReviewById({
		organizationId: input.organizationId,
		reviewId: input.reviewId,
		includeConfidential: true,
	});
	if (!detail.ok) {
		return detail;
	}
	if (detail.data === null) {
		return notFound(
			"Performance review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const { review } = detail.data;
	const immutable = assertReviewNotFinalized(review.status);
	if (!immutable.ok) {
		return immutable;
	}
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertReviewStatusTransition(review.status, nextStatus);
	if (!transition.ok) {
		return transition;
	}

	const nextVersion = input.expectedVersion + 1;
	const preparedAudit = preparePerformanceAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_performance_review",
		entityId: input.reviewId,
		action: "UPDATE",
		oldValue: { status: review.status, version: input.expectedVersion },
		newValue: { status: nextStatus, version: nextVersion },
		meta,
		reasonCode: "PERFORMANCE_REVIEW_STATUS_CHANGED",
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const auditId = randomUUID();
	const currentStatus = review.status;

	try {
		const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const [row] = rows;
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

async function listImprovementPlanCheckpointsForPlan(input: {
	organizationId: string;
	planId: HumanResourcesImprovementPlanId;
}): Promise<Result<PerformanceImprovementCheckpoint[]>> {
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
				),
			)
			.orderBy(hrPerformanceImprovementCheckpoint.sequenceNumber);
		const checkpoints: PerformanceImprovementCheckpoint[] = [];
		for (const row of rows) {
			const mapped = _mapCheckpoint(row);
			if (!mapped.ok) {
				return mapped;
			}
			checkpoints.push(mapped.data);
		}
		return errorResult.ok(checkpoints);
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to list improvement plan checkpoints",
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
	meta: HumanResourcesMutationMeta,
): Promise<Result<PerformanceImprovementPlan>> {
	const existing = await host.getImprovementPlanById({
		organizationId: input.organizationId,
		planId: input.planId,
	});
	if (!existing.ok) {
		return existing;
	}
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
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertImprovementPlanStatusTransition(
		existing.data.status,
		nextStatus,
	);
	if (!transition.ok) {
		return transition;
	}

	const nextVersion = input.expectedVersion + 1;
	const preparedAudit = preparePerformanceAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_performance_improvement_plan",
		entityId: input.planId,
		action: "UPDATE",
		oldValue: { status: existing.data.status, version: input.expectedVersion },
		newValue: { status: nextStatus, version: nextVersion },
		meta,
		reasonCode: "IMPROVEMENT_PLAN_STATUS_CHANGED",
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const auditId = randomUUID();
	const currentStatus = existing.data.status;

	try {
		const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
					RETURNING id
				)
				SELECT mutated.* FROM mutated, audited
			`,
		]);
		const [row] = rows;
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
	meta: HumanResourcesMutationMeta,
): Promise<Result<PerformanceReview>> {
	const detail = await host.getPerformanceReviewById({
		organizationId: input.organizationId,
		reviewId: input.reviewId,
		includeConfidential: true,
	});
	if (!detail.ok) {
		return detail;
	}
	if (detail.data === null) {
		return notFound(
			"Performance review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	const { review } = detail.data;
	const immutable = assertReviewNotFinalized(review.status);
	if (!immutable.ok) {
		return immutable;
	}
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertReviewStatusTransition(review.status, nextStatus);
	if (!transition.ok) {
		return transition;
	}

	const cycle = await host.getPerformanceCycleById({
		organizationId: input.organizationId,
		cycleId: review.cycleId,
	});
	if (!cycle.ok) {
		return cycle;
	}
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
	if (!ratingCheck.ok) {
		return ratingCheck;
	}

	const assessment = detail.data.assessments.find((item) => item.kind === kind);
	if (!assessment) {
		return invalidState(`Missing ${kind} assessment`);
	}
	const participant = detail.data.participants.find(
		(item) =>
			item.id === assessment.participantId &&
			item.employeeId === input.actorEmployeeId,
	);
	if (!participant) {
		return invalidInput(`Actor is not the assigned ${kind} participant`);
	}

	const nextReviewVersion = input.expectedVersion + 1;
	const nextAssessmentVersion = assessment.version + 1;
	const preparedAssessmentAudit = preparePerformanceAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_performance_assessment",
		entityId: assessment.id,
		action: "UPDATE",
		oldValue: {
			submitted: assessment.submittedAt !== null,
			version: assessment.version,
		},
		newValue: { submitted: true, version: nextAssessmentVersion },
		meta,
		reasonCode: "PERFORMANCE_ASSESSMENT_SUBMITTED",
	});
	if (!preparedAssessmentAudit.ok) {
		return preparedAssessmentAudit;
	}
	const assessmentAudit = preparedAssessmentAudit.data;
	const preparedAudit = preparePerformanceAudit({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: "hr_performance_review",
		entityId: input.reviewId,
		action: "UPDATE",
		oldValue: { status: review.status, version: input.expectedVersion },
		newValue: { status: nextStatus, version: nextReviewVersion },
		meta,
		reasonCode: "PERFORMANCE_REVIEW_ASSESSMENT_SUBMITTED",
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const assessmentAuditId = randomUUID();
	const auditId = randomUUID();
	const submittedAt = new Date();
	const currentReviewStatus = review.status;

	try {
		const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
				updated_assessment_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${assessmentAuditId}, ${assessmentAudit.organizationId},
						${assessmentAudit.actorUserId}, ${assessmentAudit.correlationId},
						${assessmentAudit.module}, ${assessmentAudit.entity},
						${assessmentAudit.entityId}, ${assessmentAudit.action},
						${assessmentAudit.changesJson}::jsonb,
						${assessmentAudit.oldValueJson}::jsonb,
						${assessmentAudit.newValueJson}::jsonb,
						${assessmentAudit.metadataJson}::jsonb,
						${assessmentAudit.ipAddress}, ${assessmentAudit.userAgent}
					FROM updated_assessment
					RETURNING id
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					)
					SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
					RETURNING id
				)
				SELECT mutated.*
				FROM mutated, audited, updated_assessment, updated_assessment_audited
			`,
		]);
		const [row] = rows;
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const cycle = mapCycle(row);
			if (!cycle.ok) {
				return cycle;
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createPerformanceCycle(record, _ports, meta) {
		const existing = await this.findPerformanceCycleByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.cycle);
			}
			return conflict("Idempotency key already used with different data");
		}

		const periodCheck = assertValidCyclePeriod({
			periodStart: record.periodStart,
			periodEnd: record.periodEnd,
		});
		if (!periodCheck.ok) {
			return periodCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesPerformanceCycleId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = preparePerformanceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const ratingScaleJson = JSON.stringify(record.ratingScale);

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findPerformanceCycleByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.cycle);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}
			return mapPersistenceFailure(error, "Failed to create performance cycle");
		}
	},

	async updatePerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleConfigurable(existing.data.status)) {
			return invalidState("Performance cycle can only be edited while draft");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const periodStart = input.periodStart ?? existing.data.periodStart;
		const periodEnd = input.periodEnd ?? existing.data.periodEnd;
		const periodCheck = assertValidCyclePeriod({ periodStart, periodEnd });
		if (!periodCheck.ok) {
			return periodCheck;
		}

		let { ratingScale } = existing.data;
		if (input.ratingScale !== undefined) {
			const scaleCheck = assertRatingScaleUniqueCodes(input.ratingScale);
			if (!scaleCheck.ok) {
				return scaleCheck;
			}
			ratingScale = scaleCheck.data;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: existing.data.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_UPDATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const name = input.name ?? existing.data.name;
		const weightingModel = input.weightingModel ?? existing.data.weightingModel;
		const ratingScaleJson = JSON.stringify(ratingScale);

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET name = ${name},
							period_start = ${periodStart},
							period_end = ${periodEnd},
							rating_scale = ${ratingScaleJson}::jsonb,
							weighting_model = ${weightingModel},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"open",
		);
		if (!transition.ok) {
			return transition;
		}

		const participants = await this.listCycleParticipants({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!participants.ok) {
			return participants;
		}
		const activeParticipants = participants.data.filter(
			(participant) => participant.status === "active",
		);
		if (activeParticipants.length === 0) {
			return invalidState(
				"Performance cycle must have at least one active participant before open",
			);
		}

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: { status: cycle.status, version: input.expectedVersion },
			newValue: { status: "open", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_OPENED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) {
			return transition;
		}

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: { status: cycle.status, version: input.expectedVersion },
			newValue: { status: "closed", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_CLOSED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"cancelled",
		);
		if (!transition.ok) {
			return transition;
		}

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: { status: cycle.status, version: input.expectedVersion },
			newValue: { status: "cancelled", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_CANCELLED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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

	async publishPerformanceCycle(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertCycleStatusTransition(
			existing.data.status,
			"published",
		);
		if (!transition.ok) {
			return transition;
		}

		const eligibility = await loadCycleEligibility({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!eligibility.ok) {
			return eligibility;
		}
		const reviewPeriods = await loadCycleReviewPeriods({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!reviewPeriods.ok) {
			return reviewPeriods;
		}
		const publishReady = assertCyclePublishReady({
			ratingScale: existing.data.ratingScale,
			eligibility: eligibility.data,
			reviewPeriods: reviewPeriods.data,
		});
		if (!publishReady.ok) {
			return publishReady;
		}

		const cycle = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: { status: cycle.status, version: input.expectedVersion },
			newValue: { status: "published", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_PUBLISHED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_cycle
						SET status = 'published',
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapCycleSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to publish performance cycle",
			);
		}
	},

	async setPerformanceCycleReviewPeriods(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleConfigurable(existing.data.status)) {
			return invalidState(
				"Review periods can only be configured while cycle is draft",
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const withinCycle = assertReviewPeriodsWithinCycle({
			cyclePeriodStart: existing.data.periodStart,
			cyclePeriodEnd: existing.data.periodEnd,
			periods: input.periods,
		});
		if (!withinCycle.ok) {
			return withinCycle;
		}

		const kinds = new Set(input.periods.map((period) => period.kind));
		if (kinds.size !== input.periods.length) {
			return invalidInput(
				"Each review period kind may only be configured once",
			);
		}

		const nextPeriods: PerformanceCycleReviewPeriod[] = input.periods.map(
			(period) => ({
				id: randomUUID(),
				organizationId: input.organizationId,
				cycleId: input.cycleId,
				kind: period.kind,
				periodStart: period.periodStart,
				periodEnd: period.periodEnd,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		);
		const overlapCheck = assertReviewPeriodsNonOverlapping(nextPeriods);
		if (!overlapCheck.ok) {
			return overlapCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: existing.data.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_REVIEW_PERIODS_CONFIGURED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const preparedDeletedPeriodsAudit = prepareDerivedPerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle_review_period",
			action: "DELETE",
			oldValue: { lifecycle: "configured" },
			newValue: null,
			meta,
			reasonCode: "PERFORMANCE_CYCLE_REVIEW_PERIOD_REMOVED",
		});
		if (!preparedDeletedPeriodsAudit.ok) {
			return preparedDeletedPeriodsAudit;
		}
		const deletedPeriodsAudit = preparedDeletedPeriodsAudit.data;
		const periodAudits = new Map<
			string,
			PreparedTransactionalAuditInsertValues
		>();
		for (const period of nextPeriods) {
			const preparedPeriodAudit = preparePerformanceAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_performance_cycle_review_period",
				entityId: period.id,
				action: "CREATE",
				newValue: { lifecycle: "configured" },
				meta,
				reasonCode: "PERFORMANCE_CYCLE_REVIEW_PERIOD_CREATED",
			});
			if (!preparedPeriodAudit.ok) {
				return preparedPeriodAudit;
			}
			periodAudits.set(period.id, preparedPeriodAudit.data);
		}
		const auditId = randomUUID();

		try {
			const results = await runNeonHttpTransaction((sqlTag) => {
				const statements = [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_performance_cycle
							SET version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.cycleId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'draft'
							RETURNING *
						),
						deleted AS (
							DELETE FROM hr_performance_cycle_review_period
							WHERE organization_id = ${input.organizationId}
								AND cycle_id = ${input.cycleId}
							RETURNING id
						),
						deleted_periods_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								gen_random_uuid(), ${deletedPeriodsAudit.organizationId},
								${deletedPeriodsAudit.actorUserId}, ${deletedPeriodsAudit.correlationId},
								${deletedPeriodsAudit.module}, ${deletedPeriodsAudit.entity}, id,
								${deletedPeriodsAudit.action}, ${deletedPeriodsAudit.changesJson}::jsonb,
								${deletedPeriodsAudit.oldValueJson}::jsonb,
								${deletedPeriodsAudit.newValueJson}::jsonb,
								${deletedPeriodsAudit.metadataJson}::jsonb,
								${deletedPeriodsAudit.ipAddress}, ${deletedPeriodsAudit.userAgent}
							FROM deleted
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
						LEFT JOIN deleted_periods_audited ON true
					`,
				];
				for (const period of nextPeriods) {
					const periodAudit = periodAudits.get(period.id);
					if (!periodAudit) {
						throw new Error("Missing prepared review-period audit values");
					}
					const periodAuditId = randomUUID();
					statements.push(sqlTag`
						WITH inserted AS (
							INSERT INTO hr_performance_cycle_review_period (
								id, organization_id, cycle_id, kind, period_start, period_end,
								created_by, updated_by
							) VALUES (
								${period.id}, ${period.organizationId}, ${period.cycleId}, ${period.kind},
								${period.periodStart}, ${period.periodEnd},
								${period.createdBy}, ${period.updatedBy}
							)
							RETURNING *
						), audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							) SELECT
								${periodAuditId}, ${periodAudit.organizationId}, ${periodAudit.actorUserId},
								${periodAudit.correlationId}, ${periodAudit.module}, ${periodAudit.entity},
								${periodAudit.entityId}, ${periodAudit.action}, ${periodAudit.changesJson}::jsonb,
								${periodAudit.oldValueJson}::jsonb, ${periodAudit.newValueJson}::jsonb,
								${periodAudit.metadataJson}::jsonb,
								${periodAudit.ipAddress}, ${periodAudit.userAgent}
							FROM inserted RETURNING id
						)
						SELECT inserted.* FROM inserted, audited
					`);
				}
				return statements;
			});
			const cycleRows = results[0] as CycleSqlRow[];
			if (!cycleRows[0]) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}

			const inserted: PerformanceCycleReviewPeriod[] = [];
			for (let index = 1; index < results.length; index += 1) {
				const [row] = results[index] as ReviewPeriodSqlRow[];
				if (!row) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				const mapped = mapReviewPeriodSql(row);
				if (!mapped.ok) {
					return mapped;
				}
				inserted.push(mapped.data);
			}

			return errorResult.ok(inserted);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to set performance cycle review periods",
			);
		}
	},

	async listPerformanceCycleReviewPeriods(input) {
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		return loadCycleReviewPeriods({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
	},

	async setPerformanceCycleEligibility(input, _ports, meta) {
		const existing = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleConfigurable(existing.data.status)) {
			return invalidState(
				"Eligibility can only be configured while cycle is draft",
			);
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const currentEligibility = await loadCycleEligibility({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!currentEligibility.ok) {
			return currentEligibility;
		}

		const id = currentEligibility.data?.id ?? randomUUID();
		const allowedStatuses = input.allowedEmploymentStatuses.join(",");
		const nextVersion = input.expectedVersion + 1;
		const preparedCycleAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle",
			entityId: input.cycleId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: existing.data.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_ELIGIBILITY_CONFIGURED",
		});
		if (!preparedCycleAudit.ok) {
			return preparedCycleAudit;
		}
		const cycleAudit = preparedCycleAudit.data;
		const eligibilityAction =
			currentEligibility.data === null ? "CREATE" : "UPDATE";
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_cycle_eligibility",
			entityId: id,
			action: eligibilityAction,
			oldValue:
				currentEligibility.data === null ? null : { lifecycle: "configured" },
			newValue: { lifecycle: "configured" },
			meta,
			reasonCode: "PERFORMANCE_CYCLE_ELIGIBILITY_UPSERTED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const cycleAuditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
						WITH cycle_mutated AS (
							UPDATE hr_performance_cycle
							SET version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.cycleId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'draft'
							RETURNING *
						),
						mutated AS (
							INSERT INTO hr_performance_cycle_eligibility (
								id, organization_id, cycle_id, min_tenure_days,
								allowed_employment_statuses, created_by, updated_by
							)
							VALUES (
								${id}, ${input.organizationId}, ${input.cycleId}, ${input.minTenureDays}::integer,
								${allowedStatuses}, ${input.actorUserId}, ${input.actorUserId}
							)
							ON CONFLICT (organization_id, cycle_id)
							DO UPDATE SET
								min_tenure_days = EXCLUDED.min_tenure_days,
								allowed_employment_statuses = EXCLUDED.allowed_employment_statuses,
								updated_by = EXCLUDED.updated_by,
								updated_at = now()
							RETURNING *
						),
						cycle_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${cycleAuditId}, ${cycleAudit.organizationId}, ${cycleAudit.actorUserId},
						${cycleAudit.correlationId}, ${cycleAudit.module}, ${cycleAudit.entity},
						${cycleAudit.entityId}, ${cycleAudit.action}, ${cycleAudit.changesJson}::jsonb,
						${cycleAudit.oldValueJson}::jsonb, ${cycleAudit.newValueJson}::jsonb,
						${cycleAudit.metadataJson}::jsonb, ${cycleAudit.ipAddress}, ${cycleAudit.userAgent}
					FROM cycle_mutated
							RETURNING id
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, cycle_mutated, cycle_audited, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance cycle",
				});
			}
			return mapEligibilitySql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to set performance cycle eligibility",
			);
		}
	},

	async getPerformanceCycleEligibility(input) {
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		return loadCycleEligibility({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
	},

	async enrollEligibleCycleParticipants(input, _ports, meta) {
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleParticipantEnrollable(cycle.data.status)) {
			return invalidState(
				"Eligible participants can only be enrolled while cycle is published or open",
			);
		}

		const eligibility = await loadCycleEligibility({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!eligibility.ok) {
			return eligibility;
		}
		if (eligibility.data === null) {
			return invalidState(
				"Performance cycle eligibility must be configured before enrollment",
			);
		}
		const eligibilityData = eligibility.data;

		const enrolled: PerformanceCycleParticipant[] = [];
		const pageSize = 100;

		const enrollPage = async (page: number): Promise<Result<void>> => {
			const employees = await this.listEmployees({
				organizationId: input.organizationId,
				page,
				pageSize,
			});
			if (!employees.ok) {
				return employees;
			}
			if (employees.data.employees.length === 0) {
				return errorResult.ok(undefined);
			}

			const sequentialOuterOutcome1 = await runSequential(
				employees.data.employees,
				async (employee) => {
					const employments = await this.listEmploymentsByEmployee({
						organizationId: input.organizationId,
						employeeId: employee.id,
					});
					if (!employments.ok) {
						return sequentialReturn(employments);
					}

					const sequentialOutcome1 = await runSequential(
						employments.data,
						// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
						async (employmentRef) => {
							const employment = await this.getEmploymentById({
								organizationId: input.organizationId,
								employmentId: employmentRef.id,
							});
							if (!employment.ok) {
								return sequentialReturn(employment);
							}
							if (employment.data === null) {
								return sequentialContinue();
							}
							if (
								!isEmploymentEligibleForPerformanceCycle({
									eligibility: eligibilityData,
									employmentStatus: employment.data.status,
									tenureDays: tenureDaysOn(
										employment.data.startsOn,
										input.asOfDate,
									),
								})
							) {
								return sequentialContinue();
							}

							const added = await this.addCycleParticipant(
								{
									organizationId: input.organizationId,
									cycleId: input.cycleId,
									employeeId: employee.id,
									employmentId: employmentRef.id,
									actorUserId: input.actorUserId,
									asOfDate: input.asOfDate,
								},
								_ports,
								meta,
							);
							if (!added.ok) {
								if (
									added.code === "CONFLICT" &&
									added.message ===
										"Participant is already active in this cycle"
								) {
									return sequentialContinue();
								}
								return sequentialReturn(added);
							}
							enrolled.push(added.data);
						},
					);
					if (sequentialOutcome1.kind === "return") {
						return sequentialReturn(sequentialOutcome1.value);
					}
				},
			);
			if (sequentialOuterOutcome1.kind === "return") {
				return sequentialOuterOutcome1.value;
			}

			if (
				page * pageSize >= employees.data.totalCount ||
				employees.data.employees.length < pageSize
			) {
				return errorResult.ok(undefined);
			}
			return enrollPage(page + 1);
		};
		const enrollment = await enrollPage(1);
		if (!enrollment.ok) {
			return enrollment;
		}

		return errorResult.ok(enrolled);
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async addCycleParticipant(input, _ports, meta) {
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (!isPerformanceCycleParticipantEnrollable(cycle.data.status)) {
			return invalidState(
				"Participants can only be added while cycle is published or open",
			);
		}

		const refs = await assertEmployeeEmployment(
			this,
			input.organizationId,
			input.employeeId,
			input.employmentId,
		);
		if (!refs.ok) {
			return refs;
		}

		const eligibility = await loadCycleEligibility({
			organizationId: input.organizationId,
			cycleId: input.cycleId,
		});
		if (!eligibility.ok) {
			return eligibility;
		}
		if (eligibility.data !== null) {
			const employment = await this.getEmploymentById({
				organizationId: input.organizationId,
				employmentId: input.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const eligibilityCheck = assertEmploymentEligibleForPerformanceCycle({
				eligibility: eligibility.data,
				employmentStatus: employment.data.status,
				employmentStartsOn: employment.data.startsOn,
				asOfDate: performanceCycleEligibilityAsOfDate({
					cyclePeriodStart: cycle.data.periodStart,
					eligibilityAsOfDate: input.asOfDate,
				}),
			});
			if (!eligibilityCheck.ok) {
				return eligibilityCheck;
			}
		}

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
			const [existing] = existingRows;

			if (existing) {
				if (existing.status === "active") {
					return conflict("Participant is already active in this cycle");
				}
				const nextVersion = existing.version + 1;
				const preparedAudit = preparePerformanceAudit({
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					entity: "hr_performance_cycle_participant",
					entityId: existing.id,
					action: "UPDATE",
					oldValue: { status: existing.status, version: existing.version },
					newValue: { status: "active", version: nextVersion },
					meta,
					reasonCode: "PERFORMANCE_CYCLE_PARTICIPANT_REACTIVATED",
				});
				if (!preparedAudit.ok) {
					return preparedAudit;
				}
				const audit = preparedAudit.data;
				const auditId = randomUUID();
				const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				]);
				const [row] = rows;
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
			if (!idResult.ok) {
				return idResult;
			}
			const preparedAudit = preparePerformanceAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_performance_cycle_participant",
				entityId: idResult.data,
				action: "CREATE",
				newValue: { status: "active", version: 1 },
				meta,
				reasonCode: "PERFORMANCE_CYCLE_PARTICIPANT_ADDED",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
			const [existing] = rows;
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
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (existing.status === "removed") {
				return invalidState("Participant is already removed");
			}

			const nextVersion = input.expectedVersion + 1;
			const preparedAudit = preparePerformanceAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_performance_cycle_participant",
				entityId: input.participantId,
				action: "UPDATE",
				oldValue: { status: existing.status, version: input.expectedVersion },
				newValue: { status: "removed", version: nextVersion },
				meta,
				reasonCode: "PERFORMANCE_CYCLE_PARTICIPANT_REMOVED",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const auditId = randomUUID();
			const [updated] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = updated;
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
				if (!mapped.ok) {
					return mapped;
				}
				cycles.push(mapped.data);
			}
			return errorResult.ok({
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
				if (!mapped.ok) {
					return mapped;
				}
				participants.push(mapped.data);
			}
			return errorResult.ok(participants);
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const goal = mapGoal(row);
			if (!goal.ok) {
				return goal;
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createPerformanceGoal(record, _ports, meta) {
		const existing = await this.findPerformanceGoalByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.goal);
			}
			return conflict("Idempotency key already used with different data");
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: record.organizationId,
			cycleId: record.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
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
		if (!active.ok) {
			return active;
		}
		if (!active.data) {
			return invalidState("Employee is not an active cycle participant");
		}

		const refs = await assertEmployeeEmployment(
			this,
			record.organizationId,
			record.employeeId,
			record.employmentId,
		);
		if (!refs.ok) {
			return refs;
		}

		const datesCheck = assertGoalDatesWithinCycle({
			goalPeriodStart: record.periodStart,
			goalPeriodEnd: record.periodEnd,
			cyclePeriodStart: cycle.data.periodStart,
			cyclePeriodEnd: cycle.data.periodEnd,
			exceptionOutsideCycle: record.exceptionOutsideCycle,
		});
		if (!datesCheck.ok) {
			return datesCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesGoalId(id);
		if (!brandedId.ok) {
			return brandedId;
		}

		const initialStatus = record.goalKind === "manager" ? "approved" : "draft";

		if (record.alignedToGoalId !== null) {
			const parent = await this.getPerformanceGoalById({
				organizationId: record.organizationId,
				goalId: record.alignedToGoalId,
			});
			if (!parent.ok) {
				return parent;
			}
			const ancestorMap = await loadAlignmentAncestorMap({
				organizationId: record.organizationId,
				startParentId: record.alignedToGoalId,
			});
			const alignment = assertGoalAlignment({
				goalId: brandedId.data,
				alignedToGoalId: record.alignedToGoalId,
				parentGoal:
					parent.data === null
						? null
						: {
								id: parent.data.id,
								cycleId: parent.data.cycleId,
								goalKind: parent.data.goalKind,
								alignedToGoalId: parent.data.alignedToGoalId,
							},
				goalCycleId: record.cycleId,
				resolveParent: (parentId) => ancestorMap.get(parentId) ?? null,
			});
			if (!alignment.ok) {
				return alignment;
			}
		}

		const preparedAudit = preparePerformanceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: initialStatus, version: 1 },
			meta,
			reasonCode: "PERFORMANCE_GOAL_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_goal (
							id, organization_id, cycle_id, employee_id, employment_id,
							title, description, weight, period_start, period_end,
							exception_outside_cycle, goal_kind, aligned_to_goal_id, status,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						) VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.cycleId},
							${record.employeeId}, ${record.employmentId},
							${record.title}, ${record.description}, ${record.weight},
							${record.periodStart}, ${record.periodEnd},
							${record.exceptionOutsideCycle}, ${record.goalKind},
							${record.alignedToGoalId}, ${initialStatus},
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapGoalSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findPerformanceGoalByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.goal);
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance goal not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const editable = assertGoalEditable(
			existing.data.status,
			existing.data.goalKind,
		);
		if (!editable.ok) {
			return editable;
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: existing.data.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
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
		if (!datesCheck.ok) {
			return datesCheck;
		}

		const title = input.title ?? existing.data.title;
		const description =
			input.description === undefined
				? existing.data.description
				: input.description;
		const weight =
			input.weight === undefined ? existing.data.weight : input.weight;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal",
			entityId: input.goalId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: existing.data.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_GOAL_UPDATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance goal not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		if (existing.data.goalKind === "manager") {
			return invalidState("Manager-assigned goals cannot be submitted");
		}
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: existing.data.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const weightCheck = assertGoalWeightForModel({
			weight: existing.data.weight,
			weightingModel: cycle.data.weightingModel,
		});
		if (!weightCheck.ok) {
			return weightCheck;
		}
		return mutateGoalStatus(this, input, "submitted", meta);
	},

	async rejectPerformanceGoal(input, _ports, meta) {
		return await mutateGoalStatus(this, input, "rejected", meta);
	},

	async activatePerformanceGoal(input, _ports, meta) {
		return await mutateGoalStatus(this, input, "active", meta);
	},

	async alignPerformanceGoal(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const parent =
			input.alignedToGoalId === null
				? errorResult.ok(null)
				: await this.getPerformanceGoalById({
						organizationId: input.organizationId,
						goalId: input.alignedToGoalId,
					});
		if (!parent.ok) {
			return parent;
		}

		const ancestorMap =
			input.alignedToGoalId === null
				? new Map<string, { id: string; alignedToGoalId: string | null }>()
				: await loadAlignmentAncestorMap({
						organizationId: input.organizationId,
						startParentId: input.alignedToGoalId,
					});
		const alignment = assertGoalAlignment({
			goalId: existing.data.id,
			alignedToGoalId: input.alignedToGoalId,
			parentGoal:
				parent.data === null
					? null
					: {
							id: parent.data.id,
							cycleId: parent.data.cycleId,
							goalKind: parent.data.goalKind,
							alignedToGoalId: parent.data.alignedToGoalId,
						},
			goalCycleId: existing.data.cycleId,
			resolveParent: (parentId) => ancestorMap.get(parentId) ?? null,
		});
		if (!alignment.ok) {
			return alignment;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal",
			entityId: input.goalId,
			action: "UPDATE",
			oldValue: {
				aligned: existing.data.alignedToGoalId !== null,
				version: input.expectedVersion,
			},
			newValue: {
				aligned: input.alignedToGoalId !== null,
				version: nextVersion,
			},
			meta,
			reasonCode: "PERFORMANCE_GOAL_ALIGNMENT_CHANGED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_goal
						SET aligned_to_goal_id = ${input.alignedToGoalId},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance goal",
				});
			}
			return mapGoalSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to align performance goal");
		}
	},

	async closePerformanceGoal(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertGoalStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal",
			entityId: input.goalId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "closed", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_GOAL_CLOSED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const currentStatus = existing.data.status;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_goal
						SET status = 'closed',
							completion_note = ${input.completionNote},
							completion_evidence_reference = ${input.completionEvidenceReference},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance goal",
				});
			}
			return mapGoalSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close performance goal");
		}
	},

	async cancelPerformanceGoal(input, _ports, meta) {
		return await mutateGoalStatus(this, input, "cancelled", meta);
	},

	async approvePerformanceGoal(input, _ports, meta) {
		const existing = await this.getPerformanceGoalById({
			organizationId: input.organizationId,
			goalId: input.goalId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertGoalStatusTransition(
			existing.data.status,
			"approved",
		);
		if (!transition.ok) {
			return transition;
		}

		const goal = existing.data;
		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: goal.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
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
				if (!weightCheck.ok) {
					return weightCheck;
				}
			}
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal",
			entityId: input.goalId,
			action: "UPDATE",
			oldValue: { status: goal.status, version: input.expectedVersion },
			newValue: { status: "approved", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_GOAL_APPROVED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!idResult.ok) {
			return idResult;
		}
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_goal_progress",
			entityId: idResult.data,
			action: "CREATE",
			newValue: { lifecycle: "recorded" },
			meta,
			reasonCode: "PERFORMANCE_GOAL_PROGRESS_RECORDED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const recordedAt = new Date();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_performance_goal_progress (
							id, organization_id, goal_id, recorded_at,
							progress_note, progress_value, evidence_reference, recorded_by
						) VALUES (
							${idResult.data}, ${input.organizationId}, ${input.goalId},
							${recordedAt}, ${input.progressNote}, ${input.progressValue},
							${input.evidenceReference}, ${input.actorUserId}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapGoalProgressSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to record goal progress");
		}
	},

	async listGoalProgress(
		input,
	): Promise<Result<PerformanceGoalProgressListPage>> {
		try {
			const rows = await db
				.select()
				.from(hrPerformanceGoalProgress)
				.where(
					and(
						eq(hrPerformanceGoalProgress.organizationId, input.organizationId),
						eq(hrPerformanceGoalProgress.goalId, input.goalId),
					),
				)
				.orderBy(desc(hrPerformanceGoalProgress.recordedAt));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const progress: PerformanceGoalProgress[] = [];
			for (const row of paged) {
				const mapped = _mapGoalProgress(row);
				if (!mapped.ok) {
					return mapped;
				}
				progress.push(mapped.data);
			}
			return errorResult.ok({
				progress,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list goal progress");
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
				if (!mapped.ok) {
					return mapped;
				}
				goals.push(mapped.data);
			}
			return errorResult.ok({
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
		if (!cycle.ok) {
			return cycle;
		}
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
		if (!active.ok) {
			return active;
		}
		if (!active.data) {
			return invalidState("Employee is not an active cycle participant");
		}

		const refs = await assertEmployeeEmployment(
			this,
			input.organizationId,
			input.employeeId,
			input.employmentId,
		);
		if (!refs.ok) {
			return refs;
		}

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
		if (!reviewIdResult.ok) {
			return reviewIdResult;
		}
		const selfParticipantId = newBrandId(
			humanResourcesReviewParticipantIdSchema,
		);
		const managerParticipantId = newBrandId(
			humanResourcesReviewParticipantIdSchema,
		);
		const selfAssessmentId = newBrandId(humanResourcesAssessmentIdSchema);
		const managerAssessmentId = newBrandId(humanResourcesAssessmentIdSchema);
		if (
			!(
				selfParticipantId.ok &&
				managerParticipantId.ok &&
				selfAssessmentId.ok &&
				managerAssessmentId.ok
			)
		) {
			return errorResult.fail("INTERNAL_ERROR");
		}

		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: reviewIdResult.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_STARTED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const preparedParticipantsAudit = prepareDerivedPerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review_participant",
			action: "CREATE",
			newValue: { status: "assigned", version: 1 },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_PARTICIPANT_ASSIGNED",
		});
		if (!preparedParticipantsAudit.ok) {
			return preparedParticipantsAudit;
		}
		const participantsAudit = preparedParticipantsAudit.data;
		const preparedAssessmentsAudit = prepareDerivedPerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_assessment",
			action: "CREATE",
			newValue: { submitted: false, version: 1 },
			meta,
			reasonCode: "PERFORMANCE_ASSESSMENT_CREATED",
		});
		if (!preparedAssessmentsAudit.ok) {
			return preparedAssessmentsAudit;
		}
		const assessmentsAudit = preparedAssessmentsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							id, organization_id, review_id, role, employee_id, sequence_number,
							version, created_by, updated_by
						) VALUES
							(
								${selfParticipantId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'self', ${input.employeeId}, ${PERFORMANCE_REVIEW_SELF_SEQUENCE},
								1, ${input.actorUserId}, ${input.actorUserId}
							),
							(
								${managerParticipantId.data}, ${input.organizationId}, ${reviewIdResult.data},
								'manager', ${input.managerEmployeeId}, ${PERFORMANCE_REVIEW_MANAGER_SEQUENCE},
								1, ${input.actorUserId}, ${input.actorUserId}
							)
					RETURNING id
				),
				inserted_assessments AS (
						INSERT INTO hr_performance_assessment (
							id, organization_id, review_id, participant_id, kind,
							version, created_by, updated_by
						) VALUES
							(
								${selfAssessmentId.data}, ${input.organizationId}, ${reviewIdResult.data},
								${selfParticipantId.data}, 'self', 1, ${input.actorUserId}, ${input.actorUserId}
							),
							(
								${managerAssessmentId.data}, ${input.organizationId}, ${reviewIdResult.data},
								${managerParticipantId.data}, 'manager', 1, ${input.actorUserId}, ${input.actorUserId}
							)
					RETURNING id
				),
				inserted_participants_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					) SELECT
						gen_random_uuid(), ${participantsAudit.organizationId},
						${participantsAudit.actorUserId}, ${participantsAudit.correlationId},
						${participantsAudit.module}, ${participantsAudit.entity}, id,
						${participantsAudit.action}, ${participantsAudit.changesJson}::jsonb,
						${participantsAudit.oldValueJson}::jsonb,
						${participantsAudit.newValueJson}::jsonb,
						${participantsAudit.metadataJson}::jsonb,
						${participantsAudit.ipAddress}, ${participantsAudit.userAgent}
					FROM inserted_participants RETURNING id
				),
				inserted_assessments_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					) SELECT
						gen_random_uuid(), ${assessmentsAudit.organizationId},
						${assessmentsAudit.actorUserId}, ${assessmentsAudit.correlationId},
						${assessmentsAudit.module}, ${assessmentsAudit.entity}, id,
						${assessmentsAudit.action}, ${assessmentsAudit.changesJson}::jsonb,
						${assessmentsAudit.oldValueJson}::jsonb,
						${assessmentsAudit.newValueJson}::jsonb,
						${assessmentsAudit.metadataJson}::jsonb,
						${assessmentsAudit.ipAddress}, ${assessmentsAudit.userAgent}
					FROM inserted_assessments RETURNING id
				),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM inserted_review
						RETURNING id
					)
				SELECT inserted_review.*
				FROM inserted_review, audited, inserted_participants_audited,
					inserted_assessments_audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
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
		return await submitAssessment(this, input, "self", "self_submitted", meta);
	},

	async submitManagerAssessment(input, _ports, meta) {
		const review = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!review.ok) {
			return review;
		}
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

	async addDelegatedReviewer(input, _ports, meta) {
		const existing = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = existing.data;
		const immutable = assertReviewNotFinalized(review.status);
		if (!immutable.ok) {
			return immutable;
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (input.delegatedEmployeeId === review.employeeId) {
			return invalidInput("Delegated reviewer cannot be the review employee");
		}
		if (
			existing.data.participants.some(
				(participant) => participant.employeeId === input.delegatedEmployeeId,
			)
		) {
			return conflict("Employee is already a review participant");
		}

		const participantId = newBrandId(humanResourcesReviewParticipantIdSchema);
		const assessmentId = newBrandId(humanResourcesAssessmentIdSchema);
		if (!(participantId.ok && assessmentId.ok)) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const sequenceNumber = nextDelegatedSequenceNumber(
			existing.data.participants,
		);
		const nextVersion = input.expectedVersion + 1;
		const preparedParticipantAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review_participant",
			entityId: participantId.data,
			action: "CREATE",
			newValue: { status: "assigned", version: 1 },
			meta,
			reasonCode: "PERFORMANCE_DELEGATED_REVIEWER_ADDED",
		});
		if (!preparedParticipantAudit.ok) {
			return preparedParticipantAudit;
		}
		const participantAudit = preparedParticipantAudit.data;
		const preparedAssessmentAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_assessment",
			entityId: assessmentId.data,
			action: "CREATE",
			newValue: { submitted: false, version: 1 },
			meta,
			reasonCode: "PERFORMANCE_DELEGATED_ASSESSMENT_CREATED",
		});
		if (!preparedAssessmentAudit.ok) {
			return preparedAssessmentAudit;
		}
		const assessmentAudit = preparedAssessmentAudit.data;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: review.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_DELEGATION_UPDATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const participantAuditId = randomUUID();
		const assessmentAuditId = randomUUID();
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH inserted_participant AS (
						INSERT INTO hr_performance_review_participant (
							id, organization_id, review_id, role, employee_id, sequence_number,
							version, created_by, updated_by
						) VALUES (
							${participantId.data}, ${input.organizationId}, ${input.reviewId},
							'delegated', ${input.delegatedEmployeeId}, ${sequenceNumber},
							1, ${input.actorUserId}, ${input.actorUserId}
						)
						RETURNING review_id
					),
					inserted_assessment AS (
						INSERT INTO hr_performance_assessment (
							id, organization_id, review_id, participant_id, kind,
							version, created_by, updated_by
						) VALUES (
							${assessmentId.data}, ${input.organizationId}, ${input.reviewId},
							${participantId.data}, 'delegated', 1, ${input.actorUserId}, ${input.actorUserId}
						)
						RETURNING review_id
					),
				mutated AS (
					UPDATE hr_performance_review
					SET version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
					RETURNING *
				),
				inserted_participant_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					) SELECT
						${participantAuditId}, ${participantAudit.organizationId},
						${participantAudit.actorUserId}, ${participantAudit.correlationId},
						${participantAudit.module}, ${participantAudit.entity},
						${participantAudit.entityId}, ${participantAudit.action},
						${participantAudit.changesJson}::jsonb,
						${participantAudit.oldValueJson}::jsonb,
						${participantAudit.newValueJson}::jsonb,
						${participantAudit.metadataJson}::jsonb,
						${participantAudit.ipAddress}, ${participantAudit.userAgent}
					FROM inserted_participant RETURNING id
				),
				inserted_assessment_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					) SELECT
						${assessmentAuditId}, ${assessmentAudit.organizationId},
						${assessmentAudit.actorUserId}, ${assessmentAudit.correlationId},
						${assessmentAudit.module}, ${assessmentAudit.entity},
						${assessmentAudit.entityId}, ${assessmentAudit.action},
						${assessmentAudit.changesJson}::jsonb,
						${assessmentAudit.oldValueJson}::jsonb,
						${assessmentAudit.newValueJson}::jsonb,
						${assessmentAudit.metadataJson}::jsonb,
						${assessmentAudit.ipAddress}, ${assessmentAudit.userAgent}
					FROM inserted_assessment RETURNING id
				),
				audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
				SELECT mutated.*
				FROM mutated, audited, inserted_participant, inserted_assessment,
					inserted_participant_audited, inserted_assessment_audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance review",
				});
			}
			return mapReviewSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee is already a review participant");
			}
			return mapPersistenceFailure(error, "Failed to add delegated reviewer");
		}
	},

	async submitDelegatedAssessment(input, _ports, meta) {
		const detail = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!detail.ok) {
			return detail;
		}
		if (detail.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = detail.data;
		const immutable = assertReviewNotFinalized(review.status);
		if (!immutable.ok) {
			return immutable;
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const participant = detail.data.participants.find(
			(item) => item.id === input.participantId,
		);
		if (participant?.role !== "delegated") {
			return invalidInput("Participant is not a delegated reviewer");
		}
		if (participant.employeeId !== input.delegatedEmployeeId) {
			return invalidInput("Actor is not the assigned delegated participant");
		}
		const priorCheck = assertPriorDelegatedAssessmentsSubmitted({
			participants: detail.data.participants,
			assessments: detail.data.assessments,
			targetParticipantId: participant.id,
		});
		if (!priorCheck.ok) {
			return priorCheck;
		}

		const assessment = detail.data.assessments.find(
			(item) => item.participantId === participant.id,
		);
		if (!assessment) {
			return invalidState("Missing delegated assessment");
		}
		if (assessment.submittedAt) {
			return invalidState("Delegated assessment is already submitted");
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: review.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
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
		if (!ratingCheck.ok) {
			return ratingCheck;
		}

		const nextReviewVersion = input.expectedVersion + 1;
		const nextAssessmentVersion = assessment.version + 1;
		const preparedAssessmentAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_assessment",
			entityId: assessment.id,
			action: "UPDATE",
			oldValue: {
				submitted: assessment.submittedAt !== null,
				version: assessment.version,
			},
			newValue: { submitted: true, version: nextAssessmentVersion },
			meta,
			reasonCode: "PERFORMANCE_DELEGATED_ASSESSMENT_SUBMITTED",
		});
		if (!preparedAssessmentAudit.ok) {
			return preparedAssessmentAudit;
		}
		const assessmentAudit = preparedAssessmentAudit.data;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: review.status, version: nextReviewVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_DELEGATED_ASSESSMENT_SUBMITTED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const assessmentAuditId = randomUUID();
		const auditId = randomUUID();
		const submittedAt = new Date();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							AND participant_id = ${participant.id}
						RETURNING review_id
					),
				mutated AS (
					UPDATE hr_performance_review
					SET version = ${nextReviewVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
						AND version = ${input.expectedVersion}
					RETURNING *
				),
				updated_assessment_audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
					) SELECT
						${assessmentAuditId}, ${assessmentAudit.organizationId},
						${assessmentAudit.actorUserId}, ${assessmentAudit.correlationId},
						${assessmentAudit.module}, ${assessmentAudit.entity},
						${assessmentAudit.entityId}, ${assessmentAudit.action},
						${assessmentAudit.changesJson}::jsonb,
						${assessmentAudit.oldValueJson}::jsonb,
						${assessmentAudit.newValueJson}::jsonb,
						${assessmentAudit.metadataJson}::jsonb,
						${assessmentAudit.ipAddress}, ${assessmentAudit.userAgent}
					FROM updated_assessment RETURNING id
				),
				audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
				SELECT mutated.*
				FROM mutated, audited, updated_assessment, updated_assessment_audited
				`,
			]);
			const [row] = rows;
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
				"Failed to submit delegated assessment",
			);
		}
	},

	async calibratePerformanceReview(input, _ports, meta) {
		const existing = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = existing.data;
		const immutable = assertReviewNotFinalized(review.status);
		if (!immutable.ok) {
			return immutable;
		}
		if (
			review.status !== "manager_submitted" &&
			review.status !== "acknowledged"
		) {
			return invalidState(
				"Calibration is only allowed after manager submission or acknowledgement",
			);
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: review.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
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
		if (!ratingCheck.ok) {
			return ratingCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: review.status, version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_CALIBRATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_review
						SET overall_rating = ${input.overallRating},
							calibration_note = ${input.calibrationNote},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.reviewId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
				"Failed to calibrate performance review",
			);
		}
	},

	async returnPerformanceReviewForCorrection(input, _ports, meta) {
		return await mutateReviewStatus(this, input, "returned", meta);
	},

	async acknowledgePerformanceReview(input, _ports, meta) {
		const existing = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = existing.data;
		const immutable = assertReviewNotFinalized(review.status);
		if (!immutable.ok) {
			return immutable;
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertReviewStatusTransition(
			review.status,
			"acknowledged",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: "acknowledged", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_ACKNOWLEDGED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
		const replay = await findFinalizedReviewReplay(input);
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			return errorResult.ok(replay.data);
		}

		const detail = await this.getPerformanceReviewById({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
			includeConfidential: true,
		});
		if (!detail.ok) {
			return detail;
		}
		if (detail.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = detail.data;
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertReviewStatusTransition(review.status, "finalized");
		if (!transition.ok) {
			return transition;
		}

		const cycle = await this.getPerformanceCycleById({
			organizationId: input.organizationId,
			cycleId: review.cycleId,
		});
		if (!cycle.ok) {
			return cycle;
		}
		if (cycle.data === null) {
			return notFound(
				"Performance cycle not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const contentCheck = validateReviewFinalizationContent({
			assessments: detail.data.assessments,
			overallRating: input.overallRating,
			ratingScale: cycle.data.ratingScale,
		});
		if (!contentCheck.ok) {
			return contentCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: "finalized", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_FINALIZED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Performance review",
				});
			}
			return mapReviewSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const concurrentReplay = await findFinalizedReviewReplay(input);
				if (!concurrentReplay.ok) {
					return concurrentReplay;
				}
				if (concurrentReplay.data !== null) {
					return errorResult.ok(concurrentReplay.data);
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const { review } = existing.data;
		if (!isPerformanceReviewFinalized(review.status)) {
			return invalidState("Only finalized reviews can be reopened");
		}
		const versionCheck = assertExpectedVersion(
			review.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertReviewStatusTransition(review.status, "reopened");
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_review",
			entityId: input.reviewId,
			action: "UPDATE",
			oldValue: { status: review.status, version: input.expectedVersion },
			newValue: { status: "reopened", version: nextVersion },
			meta,
			reasonCode: "PERFORMANCE_REVIEW_REOPENED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const review = mapReview(row);
			if (!review.ok) {
				return review;
			}

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
					sequence_number: p.sequenceNumber,
					user_id: p.userId,
					version: p.version,
					created_by: p.createdBy,
					updated_by: p.updatedBy,
					created_at: p.createdAt,
					updated_at: p.updatedAt,
				});
				if (!mapped.ok) {
					return mapped;
				}
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
				if (!mapped.ok) {
					return mapped;
				}
				assessments.push(mapped.data);
			}

			return errorResult.ok(
				projectPerformanceReviewDetailForReader(
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
				if (!mapped.ok) {
					return mapped;
				}
				reviews.push(mapped.data);
			}
			return errorResult.ok({
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
				return errorResult.ok({
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
				if (!mapped.ok) {
					return mapped;
				}
				reviews.push(mapped.data);
			}
			return errorResult.ok({
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			const plan = mapPlan(row);
			if (!plan.ok) {
				return plan;
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createImprovementPlan(record, _ports, meta) {
		const existing = await this.findImprovementPlanByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return errorResult.ok(existing.data.plan);
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
		const [reviewRow] = reviewRows;
		if (!reviewRow) {
			return notFound(
				"Performance review not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const review = mapReview(reviewRow);
		if (!review.ok) {
			return review;
		}
		if (!isPerformanceReviewFinalized(review.data.status)) {
			return invalidState("Improvement plans require a finalized review");
		}

		const refs = await assertEmployeeEmployment(
			this,
			record.organizationId,
			record.employeeId,
			record.employmentId,
		);
		if (!refs.ok) {
			return refs;
		}

		const idResult = parseHumanResourcesImprovementPlanId(randomUUID());
		if (!idResult.ok) {
			return idResult;
		}
		const preparedAudit = preparePerformanceAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_performance_improvement_plan",
			entityId: idResult.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
			meta,
			reasonCode: "IMPROVEMENT_PLAN_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const checkpointIds: Result<string>[] = [];
		for (const _milestone of record.milestones) {
			const checkpointId = newBrandId(
				humanResourcesImprovementCheckpointIdSchema,
			);
			if (!checkpointId.ok) {
				return checkpointId;
			}
			checkpointIds.push(errorResult.ok(checkpointId.data));
		}
		const checkpointAudits = new Map<
			string,
			PreparedTransactionalAuditInsertValues
		>();
		for (const checkpointId of checkpointIds) {
			if (!checkpointId.ok) {
				return checkpointId;
			}
			const preparedCheckpointAudit = preparePerformanceAudit({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_performance_improvement_checkpoint",
				entityId: checkpointId.data,
				action: "CREATE",
				newValue: { outcome: "pending" },
				meta,
				reasonCode: "IMPROVEMENT_CHECKPOINT_CREATED",
			});
			if (!preparedCheckpointAudit.ok) {
				return preparedCheckpointAudit;
			}
			checkpointAudits.set(checkpointId.data, preparedCheckpointAudit.data);
		}

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => {
				const statements = [
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
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM inserted_plan
							RETURNING id
						)
						SELECT inserted_plan.* FROM inserted_plan, audited
					`,
				];
				for (const [index, milestone] of record.milestones.entries()) {
					const checkpointId = checkpointIds[index];
					if (!checkpointId?.ok) {
						continue;
					}
					const checkpointAudit = checkpointAudits.get(checkpointId.data);
					if (!checkpointAudit) {
						throw new Error(
							"Missing prepared improvement-checkpoint audit values",
						);
					}
					const checkpointAuditId = randomUUID();
					statements.push(
						sqlTag`
							WITH inserted AS (
								INSERT INTO hr_performance_improvement_checkpoint (
									id, organization_id, plan_id, sequence_number, due_date, outcome
								) VALUES (
									${checkpointId.data}, ${record.organizationId}, ${idResult.data},
									${index + 1}, ${milestone.dueDate}, 'pending'
								) RETURNING *
							), audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								) SELECT
									${checkpointAuditId}, ${checkpointAudit.organizationId},
									${checkpointAudit.actorUserId}, ${checkpointAudit.correlationId},
									${checkpointAudit.module}, ${checkpointAudit.entity},
									${checkpointAudit.entityId}, ${checkpointAudit.action},
									${checkpointAudit.changesJson}::jsonb,
									${checkpointAudit.oldValueJson}::jsonb,
									${checkpointAudit.newValueJson}::jsonb,
									${checkpointAudit.metadataJson}::jsonb,
									${checkpointAudit.ipAddress}, ${checkpointAudit.userAgent}
								FROM inserted RETURNING id
							)
							SELECT inserted.* FROM inserted, audited
						`,
					);
				}
				return statements;
			});
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findImprovementPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replay.data.plan);
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertImprovementPlanStatusTransition(
			existing.data.status,
			"open",
		);
		if (!transition.ok) {
			return transition;
		}

		const plan = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_improvement_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: { status: plan.status, version: input.expectedVersion },
			newValue: { status: "open", version: nextVersion },
			meta,
			reasonCode: "IMPROVEMENT_PLAN_OPENED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
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
		return await mutatePlanStatus(this, input, "acknowledged", meta);
	},

	async recordImprovementCheckpoint(input, _ports, meta) {
		const plan = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!plan.ok) {
			return plan;
		}
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
			const [existing] = rows;
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
			if (!outcomeCheck.ok) {
				return outcomeCheck;
			}

			const preparedAudit = preparePerformanceAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_performance_improvement_checkpoint",
				entityId: existing.id,
				action: "UPDATE",
				oldValue: { outcome: existing.outcome },
				newValue: { outcome: input.outcome },
				meta,
				reasonCode: "IMPROVEMENT_CHECKPOINT_RECORDED",
			});
			if (!preparedAudit.ok) {
				return preparedAudit;
			}
			const audit = preparedAudit.data;
			const auditId = randomUUID();
			const recordedAt = new Date();

			const [updated] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_checkpoint
						SET outcome = ${input.outcome},
							notes = ${input.notes},
							evidence_reference = ${input.evidenceReference},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = updated;
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async amendImprovementPlan(input, _ports, meta) {
		const existing = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const extensionCheck = assertImprovementPlanExtension({
			currentDueDate: existing.data.dueDate,
			nextDueDate: input.dueDate,
			extensionReason: input.extensionReason,
		});
		if (!extensionCheck.ok) {
			return extensionCheck;
		}

		const nextDueDate = input.dueDate ?? existing.data.dueDate;
		const extending = nextDueDate > existing.data.dueDate;
		const existingCheckpoints = await listImprovementPlanCheckpointsForPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existingCheckpoints.ok) {
			return existingCheckpoints;
		}
		if (extending) {
			const milestoneValidation = assertImprovementPlanMilestones({
				planDueDate: nextDueDate,
				milestones: [
					...existingCheckpoints.data.map((checkpoint) => ({
						dueDate: checkpoint.dueDate,
					})),
					{ dueDate: nextDueDate },
				],
			});
			if (!milestoneValidation.ok) {
				return milestoneValidation;
			}
		}

		const performanceGap =
			input.performanceGap === undefined
				? existing.data.performanceGap
				: input.performanceGap;
		const expectedOutcome =
			input.expectedOutcome === undefined
				? existing.data.expectedOutcome
				: input.expectedOutcome;
		const measurableActions =
			input.measurableActions === undefined
				? existing.data.measurableActions
				: input.measurableActions;
		const supportResources =
			input.supportResources === undefined
				? existing.data.supportResources
				: input.supportResources;
		const lastExtensionReason = extending
			? (input.extensionReason ?? null)
			: existing.data.lastExtensionReason;
		const lastExtensionEvidenceReference = extending
			? (input.extensionEvidenceReference ?? null)
			: existing.data.lastExtensionEvidenceReference;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_improvement_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: existing.data.status, version: nextVersion },
			meta,
			reasonCode: "IMPROVEMENT_PLAN_AMENDED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const extensionCheckpointId = extending
			? newBrandId(humanResourcesImprovementCheckpointIdSchema)
			: null;
		if (extensionCheckpointId !== null && !extensionCheckpointId.ok) {
			return extensionCheckpointId;
		}
		let extensionCheckpointAudit: PreparedTransactionalAuditInsertValues | null =
			null;
		if (extensionCheckpointId?.ok) {
			const preparedExtensionCheckpointAudit = preparePerformanceAudit({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_performance_improvement_checkpoint",
				entityId: extensionCheckpointId.data,
				action: "CREATE",
				newValue: { outcome: "pending" },
				meta,
				reasonCode: "IMPROVEMENT_EXTENSION_CHECKPOINT_CREATED",
			});
			if (!preparedExtensionCheckpointAudit.ok) {
				return preparedExtensionCheckpointAudit;
			}
			extensionCheckpointAudit = preparedExtensionCheckpointAudit.data;
		}
		const nextSequence = extending
			? existingCheckpoints.data.reduce(
					(max, checkpoint) => Math.max(max, checkpoint.sequenceNumber),
					0,
				) + 1
			: 0;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => {
				const statements = [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_performance_improvement_plan
							SET performance_gap = ${performanceGap},
								expected_outcome = ${expectedOutcome},
								measurable_actions = ${measurableActions},
								support_resources = ${supportResources},
								due_date = ${nextDueDate},
								last_extension_reason = ${lastExtensionReason},
								last_extension_evidence_reference = ${lastExtensionEvidenceReference},
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				];
				if (extending && extensionCheckpointId?.ok) {
					if (!extensionCheckpointAudit) {
						throw new Error(
							"Missing prepared extension-checkpoint audit values",
						);
					}
					const extensionCheckpointAuditId = randomUUID();
					statements.push(
						sqlTag`
							WITH inserted AS (
								INSERT INTO hr_performance_improvement_checkpoint (
									id, organization_id, plan_id, sequence_number, due_date, outcome
								) VALUES (
									${extensionCheckpointId.data}, ${input.organizationId}, ${input.planId},
									${nextSequence}, ${nextDueDate}, 'pending'
								) RETURNING *
							), audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								) SELECT
									${extensionCheckpointAuditId}, ${extensionCheckpointAudit.organizationId},
									${extensionCheckpointAudit.actorUserId},
									${extensionCheckpointAudit.correlationId},
									${extensionCheckpointAudit.module}, ${extensionCheckpointAudit.entity},
									${extensionCheckpointAudit.entityId}, ${extensionCheckpointAudit.action},
									${extensionCheckpointAudit.changesJson}::jsonb,
									${extensionCheckpointAudit.oldValueJson}::jsonb,
									${extensionCheckpointAudit.newValueJson}::jsonb,
									${extensionCheckpointAudit.metadataJson}::jsonb,
									${extensionCheckpointAudit.ipAddress}, ${extensionCheckpointAudit.userAgent}
								FROM inserted RETURNING id
							)
							SELECT inserted.* FROM inserted, audited
						`,
					);
				}
				return statements;
			});
			const [row] = rows;
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
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertImprovementPlanStatusTransition(
			existing.data.status,
			"completed",
		);
		if (!transition.ok) {
			return transition;
		}

		const checkpoints = await listImprovementPlanCheckpointsForPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!checkpoints.ok) {
			return checkpoints;
		}
		const pendingCheck = assertNoPendingCheckpoints(checkpoints.data);
		if (!pendingCheck.ok) {
			return pendingCheck;
		}

		const plan = existing.data;
		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_improvement_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "completed", version: nextVersion },
			meta,
			reasonCode: "IMPROVEMENT_PLAN_COMPLETED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_plan
						SET status = 'completed',
							outcome_reason = ${input.outcomeReason ?? null},
							outcome_evidence_reference = ${input.outcomeEvidenceReference ?? null},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
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
		const existing = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) {
			return existing;
		}
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
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const transition = assertImprovementPlanStatusTransition(
			existing.data.status,
			"unsuccessful",
		);
		if (!transition.ok) {
			return transition;
		}

		const checkpoints = await listImprovementPlanCheckpointsForPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!checkpoints.ok) {
			return checkpoints;
		}
		const pendingCheck = assertNoPendingCheckpoints(checkpoints.data);
		if (!pendingCheck.ok) {
			return pendingCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedAudit = preparePerformanceAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_performance_improvement_plan",
			entityId: input.planId,
			action: "UPDATE",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "unsuccessful", version: nextVersion },
			meta,
			reasonCode: "IMPROVEMENT_PLAN_CLOSED_UNSUCCESSFUL",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const currentStatus = existing.data.status;

		try {
			const [rows] = await runNeonHttpTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_performance_improvement_plan
						SET status = 'unsuccessful',
							outcome_reason = ${input.outcomeReason ?? null},
							outcome_evidence_reference = ${input.outcomeEvidenceReference ?? null},
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
						${auditId}, ${audit.organizationId}, ${audit.actorUserId},
						${audit.correlationId}, ${audit.module}, ${audit.entity},
						${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
						${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
						${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
					FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
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
				"Failed to close improvement plan unsuccessful",
			);
		}
	},

	async cancelImprovementPlan(input, _ports, meta) {
		return await mutatePlanStatus(this, input, "cancelled", meta);
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
				if (!mapped.ok) {
					return mapped;
				}
				plans.push(mapped.data);
			}
			return errorResult.ok({
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

	async listImprovementPlanCheckpoints(input) {
		const plan = await this.getImprovementPlanById({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!plan.ok) {
			return plan;
		}
		if (plan.data === null) {
			return notFound(
				"Improvement plan not found",
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			);
		}
		const checkpoints = await listImprovementPlanCheckpointsForPlan(input);
		if (!checkpoints.ok) {
			return checkpoints;
		}
		return errorResult.ok({
			checkpoints: checkpoints.data,
			totalCount: checkpoints.data.length,
		} satisfies PerformanceImprovementCheckpointListPage);
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

			const entries: EmployeePerformanceHistoryEntry[] = [];
			const sequentialOutcome2 = await runSequential(
				reviewRows,
				async (reviewRow) => {
					const reviewMapped = mapReview(reviewRow);
					if (!reviewMapped.ok) {
						return sequentialReturn(reviewMapped);
					}

					const detailResult = await this.getPerformanceReviewById({
						organizationId: input.organizationId,
						reviewId: reviewMapped.data.id,
						includeConfidential: input.includeConfidential,
					});
					if (!detailResult.ok) {
						return sequentialReturn(detailResult);
					}
					if (detailResult.data === null) {
						return sequentialContinue();
					}

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
						if (!mapped.ok) {
							return sequentialReturn(mapped);
						}
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
						if (!mapped.ok) {
							return sequentialReturn(mapped);
						}
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
				},
			);
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}

			return errorResult.ok({
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
