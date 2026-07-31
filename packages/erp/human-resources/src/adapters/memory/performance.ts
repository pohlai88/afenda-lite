/**
 * In-memory performance domain state and methods for composed HumanResourcesStore hosts.
 */
import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import type { z } from "zod";
import {
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesGoalId,
	type HumanResourcesImprovementPlanId,
	type HumanResourcesPerformanceCycleId,
	type HumanResourcesPerformanceCycleParticipantId,
	type HumanResourcesReviewId,
	type HumanResourcesReviewParticipantId,
	humanResourcesAssessmentIdSchema,
	humanResourcesGoalProgressIdSchema,
	humanResourcesImprovementCheckpointIdSchema,
	humanResourcesPerformanceCycleParticipantIdSchema,
	humanResourcesReviewParticipantIdSchema,
	parseHumanResourcesGoalId,
	parseHumanResourcesImprovementPlanId,
	parseHumanResourcesPerformanceCycleId,
	parseHumanResourcesReviewId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import { projectPerformanceReviewDetailForReader } from "../../performance/performance-field-projection";
import type { MutationPorts } from "../../ports";
import { tenureDaysOn } from "../../shared/benefit-guards";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidInput,
	invalidState,
	notFound,
} from "../../shared/domain-guards";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	assertEmploymentEligibleForPerformanceCycle,
	isEmploymentEligibleForPerformanceCycle,
	performanceCycleEligibilityAsOfDate,
} from "../../shared/performance-cycle-eligibility";
import {
	assertAllDelegatedAssessmentsSubmitted,
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
	type PerformanceRatingScale,
	validateRatingInScale,
} from "../../shared/performance-rating";
import {
	isPerformanceCycleConfigurable,
	isPerformanceCycleOpen,
	isPerformanceCycleParticipantEnrollable,
	isPerformanceGoalProgressable,
	isPerformanceReviewFinalized,
	type PerformanceCycleReviewPeriodKind,
	type PerformanceWeightingModel,
} from "../../shared/performance-status";
import { isResultFailure } from "../../shared/result-guards";
import { runRollbacks } from "../../shared/rollback";
import {
	runSequential,
	sequentialContinue,
	sequentialReturn,
} from "../../shared/run-sequential";
import type {
	HumanResourcesStore,
	IdempotentImprovementPlanRecord,
	IdempotentPerformanceCycleRecord,
	IdempotentPerformanceGoalRecord,
	ImprovementPlanCreateRecord,
	PerformanceCycleCreateRecord,
	PerformanceGoalCreateRecord,
} from "../../store";
import type {
	EmployeePerformanceHistory,
	PerformanceAssessment,
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementCheckpointListPage,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
	PerformanceReviewParticipant,
} from "../../types";
import {
	PERFORMANCE_REVIEW_MANAGER_SEQUENCE,
	PERFORMANCE_REVIEW_SELF_SEQUENCE,
} from "../../types";

export interface PerformanceMemoryState {
	assessments: Map<string, PerformanceAssessment>;
	checkpoints: Map<string, PerformanceImprovementCheckpoint>;
	cycleEligibility: Map<string, PerformanceCycleEligibility>;
	cycleIdempotency: Map<string, IdempotentPerformanceCycleRecord>;
	cycleParticipants: Map<
		HumanResourcesPerformanceCycleParticipantId,
		PerformanceCycleParticipant
	>;
	cycleReviewPeriods: Map<string, PerformanceCycleReviewPeriod[]>;
	cycles: Map<HumanResourcesPerformanceCycleId, PerformanceCycle>;
	goalIdempotency: Map<string, IdempotentPerformanceGoalRecord>;
	goalProgress: Map<string, PerformanceGoalProgress>;
	goals: Map<HumanResourcesGoalId, PerformanceGoal>;
	improvementPlans: Map<
		HumanResourcesImprovementPlanId,
		PerformanceImprovementPlan
	>;
	planIdempotency: Map<string, IdempotentImprovementPlanRecord>;
	reviewFinalizeIdempotency: Map<string, PerformanceReview>;
	reviewParticipants: Map<string, PerformanceReviewParticipant>;
	reviews: Map<HumanResourcesReviewId, PerformanceReview>;
}

export type MemoryPerformanceHost = Pick<
	HumanResourcesStore,
	| "getEmployeeById"
	| "getEmploymentById"
	| "listEmployees"
	| "listEmploymentsByEmployee"
>;

export type PerformanceMemoryMethods = Pick<
	HumanResourcesStore,
	| "getPerformanceCycleById"
	| "findPerformanceCycleByIdempotencyKey"
	| "createPerformanceCycle"
	| "updatePerformanceCycle"
	| "publishPerformanceCycle"
	| "openPerformanceCycle"
	| "closePerformanceCycle"
	| "cancelPerformanceCycle"
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
	| "listEmployeeGoals"
	| "listGoalProgress"
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

export type MemoryPerformanceMethods = PerformanceMemoryMethods;

export function createPerformanceMemoryState(): PerformanceMemoryState {
	return {
		cycles: new Map(),
		cycleIdempotency: new Map(),
		cycleParticipants: new Map(),
		cycleReviewPeriods: new Map(),
		cycleEligibility: new Map(),
		goals: new Map(),
		goalIdempotency: new Map(),
		goalProgress: new Map(),
		reviews: new Map(),
		reviewFinalizeIdempotency: new Map(),
		reviewParticipants: new Map(),
		assessments: new Map(),
		improvementPlans: new Map(),
		planIdempotency: new Map(),
		checkpoints: new Map(),
	};
}

export function resetPerformanceMemoryState(
	state: PerformanceMemoryState,
): void {
	state.cycles.clear();
	state.cycleIdempotency.clear();
	state.cycleParticipants.clear();
	state.cycleReviewPeriods.clear();
	state.cycleEligibility.clear();
	state.goals.clear();
	state.goalIdempotency.clear();
	state.goalProgress.clear();
	state.reviews.clear();
	state.reviewFinalizeIdempotency.clear();
	state.reviewParticipants.clear();
	state.assessments.clear();
	state.improvementPlans.clear();
	state.planIdempotency.clear();
	state.checkpoints.clear();
}

function idemKey(organizationId: string, idempotencyKey: string): string {
	return `${organizationId}:${idempotencyKey}`;
}

function cycleChildKey(
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
): string {
	return `${organizationId}:${cycleId}`;
}

function reviewPeriodsForCycle(
	state: PerformanceMemoryState,
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
): PerformanceCycleReviewPeriod[] {
	return [
		...(state.cycleReviewPeriods.get(cycleChildKey(organizationId, cycleId)) ??
			[]),
	];
}

function eligibilityForCycle(
	state: PerformanceMemoryState,
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
): PerformanceCycleEligibility | null {
	return (
		state.cycleEligibility.get(cycleChildKey(organizationId, cycleId)) ?? null
	);
}

function cloneCycle(cycle: PerformanceCycle): PerformanceCycle {
	return {
		...cycle,
		ratingScale: { codes: [...cycle.ratingScale.codes] },
	};
}

function newBrandId<T extends z.ZodTypeAny>(schema: T): Result<z.infer<T>> {
	const parsed = schema.safeParse(randomUUID());
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}
	return errorResult.ok(parsed.data);
}

async function recordAudit(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
	},
): Promise<Result<{ id: string }>> {
	return await ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

async function recordOutbox(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return await ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: meta.correlationId,
		type: input.type,
		payload: {
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		},
	});
}

function getCycle(
	state: PerformanceMemoryState,
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
): Result<PerformanceCycle> {
	const cycle = state.cycles.get(cycleId);
	if (!cycle || cycle.organizationId !== organizationId) {
		return notFound(
			"Performance cycle not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	return errorResult.ok(cycle);
}

function getGoal(
	state: PerformanceMemoryState,
	organizationId: string,
	goalId: HumanResourcesGoalId,
): Result<PerformanceGoal> {
	const goal = state.goals.get(goalId);
	if (!goal || goal.organizationId !== organizationId) {
		return notFound(
			"Performance goal not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	return errorResult.ok(goal);
}

function validateApprovedGoalWeightTotal(
	state: PerformanceMemoryState,
	goal: PerformanceGoal,
	cycle: PerformanceCycle,
): Result<void> {
	if (cycle.weightingModel !== "percent100") {
		return errorResult.ok(undefined);
	}
	const relatedGoals = Array.from(state.goals.values()).filter(
		(item) =>
			item.organizationId === goal.organizationId &&
			item.cycleId === goal.cycleId &&
			item.employeeId === goal.employeeId &&
			item.id !== goal.id,
	);
	if (relatedGoals.some((item) => item.status === "submitted")) {
		return errorResult.ok(undefined);
	}
	const weights = [goal, ...relatedGoals]
		.filter((item) => item.status === "approved" || item.status === "active")
		.map((item) => item.weight)
		.filter((weight): weight is string => weight !== null);
	return assertGoalWeightsSumTo100(weights);
}

function getReview(
	state: PerformanceMemoryState,
	organizationId: string,
	reviewId: HumanResourcesReviewId,
): Result<PerformanceReview> {
	const review = state.reviews.get(reviewId);
	if (!review || review.organizationId !== organizationId) {
		return notFound(
			"Performance review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	return errorResult.ok(review);
}

function getPlan(
	state: PerformanceMemoryState,
	organizationId: string,
	planId: HumanResourcesImprovementPlanId,
): Result<PerformanceImprovementPlan> {
	const plan = state.improvementPlans.get(planId);
	if (!plan || plan.organizationId !== organizationId) {
		return notFound(
			"Improvement plan not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	return errorResult.ok(plan);
}

function checkpointsForPlan(
	state: PerformanceMemoryState,
	organizationId: string,
	planId: HumanResourcesImprovementPlanId,
): PerformanceImprovementCheckpoint[] {
	return Array.from(state.checkpoints.values())
		.filter(
			(checkpoint) =>
				checkpoint.organizationId === organizationId &&
				checkpoint.planId === planId,
		)
		.sort((left, right) => left.sequenceNumber - right.sequenceNumber);
}

function isActiveParticipant(
	state: PerformanceMemoryState,
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
	employmentId: HumanResourcesEmploymentId,
): boolean {
	return Array.from(state.cycleParticipants.values()).some(
		(participant) =>
			participant.organizationId === organizationId &&
			participant.cycleId === cycleId &&
			participant.employmentId === employmentId &&
			participant.status === "active",
	);
}

function participantsForCycle(
	state: PerformanceMemoryState,
	organizationId: string,
	cycleId: HumanResourcesPerformanceCycleId,
): PerformanceCycleParticipant[] {
	return Array.from(state.cycleParticipants.values()).filter(
		(participant) =>
			participant.organizationId === organizationId &&
			participant.cycleId === cycleId,
	);
}

function assessmentsForReview(
	state: PerformanceMemoryState,
	reviewId: HumanResourcesReviewId,
): PerformanceAssessment[] {
	return Array.from(state.assessments.values()).filter(
		(assessment) => assessment.reviewId === reviewId,
	);
}

function participantsForReview(
	state: PerformanceMemoryState,
	reviewId: HumanResourcesReviewId,
): PerformanceReviewParticipant[] {
	return Array.from(state.reviewParticipants.values()).filter(
		(participant) => participant.reviewId === reviewId,
	);
}

async function assertEmployeeEmployment(
	host: MemoryPerformanceHost,
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
		acknowledgementNote: null,
		calibrationNote: null,
	}));
}

function buildPerformanceMemoryMethods(
	state: PerformanceMemoryState,
): PerformanceMemoryMethods &
	ThisType<MemoryPerformanceHost & PerformanceMemoryMethods> {
	return {
		async getPerformanceCycleById(input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
		}): Promise<Result<PerformanceCycle | null>> {
			const cycle = state.cycles.get(input.cycleId);
			if (!cycle || cycle.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(cloneCycle(cycle));
		},

		async findPerformanceCycleByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPerformanceCycleRecord | null>> {
			const record = state.cycleIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				cycle: cloneCycle(record.cycle),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createPerformanceCycle(
			record: PerformanceCycleCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycle>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.cycleIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok(cloneCycle(existing.cycle));
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const duplicate = Array.from(state.cycles.values()).find(
				(cycleValue) =>
					cycleValue.organizationId === record.organizationId &&
					cycleValue.code === record.code,
			);
			if (duplicate) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			const periodCheck = assertValidCyclePeriod({
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
			});
			if (!periodCheck.ok) {
				return periodCheck;
			}

			const idResult = parseHumanResourcesPerformanceCycleId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const cycle: PerformanceCycle = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				ratingScale: { codes: [...record.ratingScale.codes] },
				weightingModel: record.weightingModel,
				status: "draft",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.cycles.set(cycle.id, cycle);
			state.cycleIdempotency.set(key, {
				cycle: cloneCycle(cycle),
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: cycle.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_performance_cycle",
				entityId: cycle.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.cycles.delete(cycle.id);
				state.cycleIdempotency.delete(key);
				return audit;
			}

			return errorResult.ok(cloneCycle(cycle));
		},

		async updatePerformanceCycle(
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
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			if (!isPerformanceCycleConfigurable(cycle.status)) {
				return invalidState("Performance cycle can only be edited while draft");
			}
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const periodStart = input.periodStart ?? cycle.periodStart;
			const periodEnd = input.periodEnd ?? cycle.periodEnd;
			const periodCheck = assertValidCyclePeriod({ periodStart, periodEnd });
			if (!periodCheck.ok) {
				return periodCheck;
			}

			let { ratingScale } = cycle;
			if (input.ratingScale !== undefined) {
				const scaleCheck = assertRatingScaleUniqueCodes(input.ratingScale);
				if (!scaleCheck.ok) {
					return scaleCheck;
				}
				ratingScale = scaleCheck.data;
			}

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				name: input.name ?? cycle.name,
				periodStart,
				periodEnd,
				ratingScale,
				weightingModel: input.weightingModel ?? cycle.weightingModel,
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cycles.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok(cloneCycle(updated));
		},

		async publishPerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertCycleStatusTransition(cycle.status, "published");
			if (!transition.ok) {
				return transition;
			}

			const publishReady = assertCyclePublishReady({
				ratingScale: cycle.ratingScale,
				eligibility: eligibilityForCycle(
					state,
					input.organizationId,
					input.cycleId,
				),
				reviewPeriods: reviewPeriodsForCycle(
					state,
					input.organizationId,
					input.cycleId,
				),
			});
			if (!publishReady.ok) {
				return publishReady;
			}

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				status: "published",
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cycles.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok(cloneCycle(updated));
		},

		async openPerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertCycleStatusTransition(cycle.status, "open");
			if (!transition.ok) {
				return transition;
			}

			const activeParticipants = participantsForCycle(
				state,
				input.organizationId,
				input.cycleId,
			).filter((participant) => participant.status === "active");
			if (activeParticipants.length === 0) {
				return invalidState(
					"Performance cycle must have at least one active participant before open",
				);
			}

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				status: "open",
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycles.set(updated.id, updated);
			const rollback: Array<() => void> = [
				() => state.cycles.set(previous.id, previous),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
				entityType: "hr_performance_cycle",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok(cloneCycle(updated));
		},

		async closePerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertCycleStatusTransition(cycle.status, "closed");
			if (!transition.ok) {
				return transition;
			}

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				status: "closed",
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cycles.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok(cloneCycle(updated));
		},

		async cancelPerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertCycleStatusTransition(cycle.status, "cancelled");
			if (!transition.ok) {
				return transition;
			}

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				status: "cancelled",
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycles.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cycles.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok(cloneCycle(updated));
		},

		async setPerformanceCycleReviewPeriods(
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
		): Promise<Result<PerformanceCycleReviewPeriod[]>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			if (!isPerformanceCycleConfigurable(cycle.status)) {
				return invalidState(
					"Review periods can only be configured while cycle is draft",
				);
			}
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const withinCycle = assertReviewPeriodsWithinCycle({
				cyclePeriodStart: cycle.periodStart,
				cyclePeriodEnd: cycle.periodEnd,
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

			const now = new Date();
			const key = cycleChildKey(input.organizationId, input.cycleId);
			const previousPeriods = reviewPeriodsForCycle(
				state,
				input.organizationId,
				input.cycleId,
			);
			const previousCycle = cloneCycle(cycle);
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
					createdAt: now,
					updatedAt: now,
				}),
			);
			const overlapCheck = assertReviewPeriodsNonOverlapping(nextPeriods);
			if (!overlapCheck.ok) {
				return overlapCheck;
			}

			const updatedCycle = cloneCycle({
				...cycle,
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycleReviewPeriods.set(key, nextPeriods);
			state.cycles.set(updatedCycle.id, updatedCycle);

			const rollback: Array<() => void> = [
				() => state.cycleReviewPeriods.set(key, previousPeriods),
				() => state.cycles.set(previousCycle.id, previousCycle),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updatedCycle.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle_review_period",
				entityId: input.cycleId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok(nextPeriods.map((period) => ({ ...period })));
		},

		async listPerformanceCycleReviewPeriods(input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
		}): Promise<Result<PerformanceCycleReviewPeriod[]>> {
			const cycle = getCycle(state, input.organizationId, input.cycleId);
			if (!cycle.ok) {
				return await cycle;
			}
			return await errorResult.ok(
				reviewPeriodsForCycle(state, input.organizationId, input.cycleId).map(
					(period) => ({ ...period }),
				),
			);
		},

		async setPerformanceCycleEligibility(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				minTenureDays: number | null;
				allowedEmploymentStatuses: PerformanceCycleEligibility["allowedEmploymentStatuses"];
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycleEligibility>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			if (!isPerformanceCycleConfigurable(cycle.status)) {
				return invalidState(
					"Eligibility can only be configured while cycle is draft",
				);
			}
			const versionCheck = assertExpectedVersion(
				cycle.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const key = cycleChildKey(input.organizationId, input.cycleId);
			const existing = eligibilityForCycle(
				state,
				input.organizationId,
				input.cycleId,
			);
			const now = new Date();
			const eligibility: PerformanceCycleEligibility = {
				id: existing?.id ?? randomUUID(),
				organizationId: input.organizationId,
				cycleId: input.cycleId,
				minTenureDays: input.minTenureDays,
				allowedEmploymentStatuses: [...input.allowedEmploymentStatuses],
				createdBy: existing?.createdBy ?? input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			};
			const previousCycle = cloneCycle(cycle);
			const updatedCycle = cloneCycle({
				...cycle,
				version: cycle.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			});
			state.cycleEligibility.set(key, eligibility);
			state.cycles.set(updatedCycle.id, updatedCycle);

			const rollback: Array<() => void> = [
				() => {
					if (existing) {
						state.cycleEligibility.set(key, existing);
					} else {
						state.cycleEligibility.delete(key);
					}
				},
				() => state.cycles.set(previousCycle.id, previousCycle),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: eligibility.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle_eligibility",
				entityId: eligibility.id,
				action: existing ? "UPDATE" : "CREATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...eligibility });
		},

		async getPerformanceCycleEligibility(input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
		}): Promise<Result<PerformanceCycleEligibility | null>> {
			const cycle = getCycle(state, input.organizationId, input.cycleId);
			if (!cycle.ok) {
				return await cycle;
			}
			const eligibility = eligibilityForCycle(
				state,
				input.organizationId,
				input.cycleId,
			);
			return await errorResult.ok(
				eligibility === null ? null : { ...eligibility },
			);
		},

		async enrollEligibleCycleParticipants(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				asOfDate: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycleParticipant[]>> {
			const cycleResult = getCycle(state, input.organizationId, input.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const cycle = cycleResult.data;
			if (!isPerformanceCycleParticipantEnrollable(cycle.status)) {
				return invalidState(
					"Eligible participants can only be enrolled while cycle is published or open",
				);
			}

			const eligibility = eligibilityForCycle(
				state,
				input.organizationId,
				input.cycleId,
			);
			if (eligibility === null) {
				return invalidState(
					"Performance cycle eligibility must be configured before enrollment",
				);
			}

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
							// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
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
										eligibility,
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
										asOfDate: input.asOfDate,
										actorUserId: input.actorUserId,
									},
									ports,
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

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async addCycleParticipant(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				asOfDate?: string | undefined;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycleParticipant>> {
			const cycleResult = getCycle(state, input.organizationId, input.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			if (!isPerformanceCycleParticipantEnrollable(cycleResult.data.status)) {
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

			const eligibility = eligibilityForCycle(
				state,
				input.organizationId,
				input.cycleId,
			);
			if (eligibility !== null) {
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
					eligibility,
					employmentStatus: employment.data.status,
					employmentStartsOn: employment.data.startsOn,
					asOfDate: performanceCycleEligibilityAsOfDate({
						cyclePeriodStart: cycleResult.data.periodStart,
						eligibilityAsOfDate: input.asOfDate,
					}),
				});
				if (!eligibilityCheck.ok) {
					return eligibilityCheck;
				}
			}

			const existing = Array.from(state.cycleParticipants.values()).find(
				(participantValue2) =>
					participantValue2.organizationId === input.organizationId &&
					participantValue2.cycleId === input.cycleId &&
					participantValue2.employmentId === input.employmentId,
			);

			const now = new Date();
			if (existing) {
				if (existing.status === "active") {
					return conflict("Participant is already active in this cycle");
				}
				const previous = { ...existing };
				const updated: PerformanceCycleParticipant = {
					...existing,
					status: "active",
					version: existing.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: now,
				};
				state.cycleParticipants.set(updated.id, updated);

				const audit = await recordAudit(ports, meta, {
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					entity: "hr_performance_cycle_participant",
					entityId: updated.id,
					action: "UPDATE",
				});
				if (!audit.ok) {
					state.cycleParticipants.set(previous.id, previous);
					return audit;
				}
				return errorResult.ok({ ...updated });
			}

			const idResult = newBrandId(
				humanResourcesPerformanceCycleParticipantIdSchema,
			);
			if (!idResult.ok) {
				return idResult;
			}

			const participant: PerformanceCycleParticipant = {
				id: idResult.data,
				organizationId: input.organizationId,
				cycleId: input.cycleId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				status: "active",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.cycleParticipants.set(participant.id, participant);

			const audit = await recordAudit(ports, meta, {
				organizationId: participant.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle_participant",
				entityId: participant.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.cycleParticipants.delete(participant.id);
				return audit;
			}

			return errorResult.ok({ ...participant });
		},

		async removeCycleParticipant(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				participantId: HumanResourcesPerformanceCycleParticipantId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceCycleParticipant>> {
			const participant = state.cycleParticipants.get(input.participantId);
			if (
				!participant ||
				participant.organizationId !== input.organizationId ||
				participant.cycleId !== input.cycleId
			) {
				return notFound(
					"Cycle participant not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
			const versionCheck = assertExpectedVersion(
				participant.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (participant.status === "removed") {
				return invalidState("Participant is already removed");
			}

			const previous = { ...participant };
			const now = new Date();
			const updated: PerformanceCycleParticipant = {
				...participant,
				status: "removed",
				version: participant.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.cycleParticipants.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_cycle_participant",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.cycleParticipants.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listPerformanceCycles(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: PerformanceCycle["status"] | undefined;
		}): Promise<Result<PerformanceCycleListPage>> {
			let filtered = Array.from(state.cycles.values()).filter(
				(cycle) => cycle.organizationId === input.organizationId,
			);
			if (input.status) {
				filtered = filtered.filter((cycle) => cycle.status === input.status);
			}
			filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const cycles = filtered
				.slice(start, start + input.pageSize)
				.map((cycle) => cloneCycle(cycle));
			return await errorResult.ok({
				cycles,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listCycleParticipants(input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
		}): Promise<Result<PerformanceCycleParticipant[]>> {
			const participants = participantsForCycle(
				state,
				input.organizationId,
				input.cycleId,
			).map((participant) => ({ ...participant }));
			return await errorResult.ok(participants);
		},

		async getPerformanceGoalById(input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
		}): Promise<Result<PerformanceGoal | null>> {
			const goal = state.goals.get(input.goalId);
			if (!goal || goal.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...goal });
		},

		async findPerformanceGoalByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPerformanceGoalRecord | null>> {
			const record = state.goalIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				goal: { ...record.goal },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createPerformanceGoal(
			record: PerformanceGoalCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.goalIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok({ ...existing.goal });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const cycleResult = getCycle(
				state,
				record.organizationId,
				record.cycleId,
			);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const cycle = cycleResult.data;
			if (!isPerformanceCycleOpen(cycle.status)) {
				return invalidState("Goals can only be created in open cycles");
			}
			if (
				!isActiveParticipant(
					state,
					record.organizationId,
					record.cycleId,
					record.employmentId,
				)
			) {
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
				cyclePeriodStart: cycle.periodStart,
				cyclePeriodEnd: cycle.periodEnd,
				exceptionOutsideCycle: record.exceptionOutsideCycle,
			});
			if (!datesCheck.ok) {
				return datesCheck;
			}

			const idResult = parseHumanResourcesGoalId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const initialStatus =
				record.goalKind === "manager" ? "approved" : "draft";
			const goal: PerformanceGoal = {
				id: idResult.data,
				organizationId: record.organizationId,
				cycleId: record.cycleId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				title: record.title,
				description: record.description,
				weight: record.weight,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				exceptionOutsideCycle: record.exceptionOutsideCycle,
				goalKind: record.goalKind,
				alignedToGoalId: record.alignedToGoalId,
				completionNote: null,
				completionEvidenceReference: null,
				status: initialStatus,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			if (record.alignedToGoalId !== null) {
				const parent = getGoal(
					state,
					record.organizationId,
					record.alignedToGoalId,
				);
				const alignment = assertGoalAlignment({
					goalId: goal.id,
					alignedToGoalId: record.alignedToGoalId,
					parentGoal:
						parent.ok && parent.data
							? {
									id: parent.data.id,
									cycleId: parent.data.cycleId,
									goalKind: parent.data.goalKind,
									alignedToGoalId: parent.data.alignedToGoalId,
								}
							: null,
					goalCycleId: goal.cycleId,
					resolveParent: (parentId) => {
						const resolved = getGoal(
							state,
							record.organizationId,
							parentId as HumanResourcesGoalId,
						);
						if (!resolved.ok) {
							return null;
						}
						return {
							id: resolved.data.id,
							alignedToGoalId: resolved.data.alignedToGoalId,
						};
					},
				});
				if (!alignment.ok) {
					return alignment;
				}
			}

			state.goals.set(goal.id, goal);
			state.goalIdempotency.set(key, {
				goal: { ...goal },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(ports, meta, {
				organizationId: goal.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_performance_goal",
				entityId: goal.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.goals.delete(goal.id);
				state.goalIdempotency.delete(key);
				return audit;
			}

			return errorResult.ok({ ...goal });
		},

		async updatePerformanceGoal(
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
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			const editable = assertGoalEditable(goal.status, goal.goalKind);
			if (!editable.ok) {
				return editable;
			}
			const versionCheck = assertExpectedVersion(
				goal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const cycleResult = getCycle(state, goal.organizationId, goal.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const periodStart = input.periodStart ?? goal.periodStart;
			const periodEnd = input.periodEnd ?? goal.periodEnd;
			const datesCheck = assertGoalDatesWithinCycle({
				goalPeriodStart: periodStart,
				goalPeriodEnd: periodEnd,
				cyclePeriodStart: cycleResult.data.periodStart,
				cyclePeriodEnd: cycleResult.data.periodEnd,
				exceptionOutsideCycle: goal.exceptionOutsideCycle,
			});
			if (!datesCheck.ok) {
				return datesCheck;
			}

			const previous = { ...goal };
			const now = new Date();
			const updated: PerformanceGoal = {
				...goal,
				title: input.title ?? goal.title,
				description:
					input.description === undefined
						? goal.description
						: input.description,
				weight: input.weight === undefined ? goal.weight : input.weight,
				periodStart,
				periodEnd,
				version: goal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.goals.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_goal",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.goals.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async submitPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return await current;
			}
			const goal = current.data;
			if (goal.goalKind === "manager") {
				return await invalidState("Manager-assigned goals cannot be submitted");
			}
			const cycleResult = getCycle(state, goal.organizationId, goal.cycleId);
			if (!cycleResult.ok) {
				return await cycleResult;
			}
			const weightCheck = assertGoalWeightForModel({
				weight: goal.weight,
				weightingModel: cycleResult.data.weightingModel,
			});
			if (!weightCheck.ok) {
				return await weightCheck;
			}
			return await transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"submitted",
				assertGoalStatusTransition,
			);
		},

		async approvePerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			const versionCheck = assertExpectedVersion(
				goal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertGoalStatusTransition(goal.status, "approved");
			if (!transition.ok) {
				return transition;
			}

			const cycleResult = getCycle(state, goal.organizationId, goal.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const cycle = cycleResult.data;

			const previous = { ...goal };
			const now = new Date();
			const updated: PerformanceGoal = {
				...goal,
				status: "approved",
				version: goal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.goals.set(updated.id, updated);

			const weightCheck = validateApprovedGoalWeightTotal(
				state,
				updated,
				cycle,
			);
			if (!weightCheck.ok) {
				state.goals.set(previous.id, previous);
				return weightCheck;
			}

			const rollback: Array<() => void> = [
				() => state.goals.set(previous.id, previous),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_goal",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT,
				entityType: "hr_performance_goal",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async rejectPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			return await transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"rejected",
				assertGoalStatusTransition,
			);
		},

		async recordGoalProgress(
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
		): Promise<Result<PerformanceGoalProgress>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			if (!isPerformanceGoalProgressable(goal.status)) {
				return invalidState("Goal is not in a progressable status");
			}

			const idResult = newBrandId(humanResourcesGoalProgressIdSchema);
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const progress: PerformanceGoalProgress = {
				id: idResult.data,
				organizationId: goal.organizationId,
				goalId: goal.id,
				recordedAt: now,
				progressNote: input.progressNote,
				progressValue: input.progressValue,
				evidenceReference: input.evidenceReference,
				recordedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.goalProgress.set(progress.id, progress);

			const audit = await recordAudit(ports, meta, {
				organizationId: progress.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_goal_progress",
				entityId: progress.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.goalProgress.delete(progress.id);
				return audit;
			}

			return errorResult.ok({ ...progress });
		},

		async activatePerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			return await transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"active",
				assertGoalStatusTransition,
			);
		},

		async alignPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				alignedToGoalId: HumanResourcesGoalId | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			const versionCheck = assertExpectedVersion(
				goal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const parent =
				input.alignedToGoalId === null
					? errorResult.ok(null)
					: getGoal(state, input.organizationId, input.alignedToGoalId);
			if (isResultFailure(parent)) {
				return parent;
			}
			const alignment = assertGoalAlignment({
				goalId: goal.id,
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
				goalCycleId: goal.cycleId,
				resolveParent: (parentId) => {
					const resolved = getGoal(
						state,
						input.organizationId,
						parentId as HumanResourcesGoalId,
					);
					if (!resolved.ok) {
						return null;
					}
					return {
						id: resolved.data.id,
						alignedToGoalId: resolved.data.alignedToGoalId,
					};
				},
			});
			if (!alignment.ok) {
				return alignment;
			}

			const previous = { ...goal };
			const now = new Date();
			const updated: PerformanceGoal = {
				...goal,
				alignedToGoalId: input.alignedToGoalId,
				version: goal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.goals.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_goal",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.goals.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async closePerformanceGoal(
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
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			const versionCheck = assertExpectedVersion(
				goal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertGoalStatusTransition(goal.status, "closed");
			if (!transition.ok) {
				return transition;
			}

			const previous = { ...goal };
			const now = new Date();
			const updated: PerformanceGoal = {
				...goal,
				status: "closed",
				completionNote: input.completionNote,
				completionEvidenceReference: input.completionEvidenceReference,
				version: goal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.goals.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_goal",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.goals.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async cancelPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceGoal>> {
			return await transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"cancelled",
				assertGoalStatusTransition,
			);
		},

		async listGoalProgress(input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
			page: number;
			pageSize: number;
		}): Promise<Result<import("../../types").PerformanceGoalProgressListPage>> {
			const filtered = Array.from(state.goalProgress.values()).filter(
				(entry) =>
					entry.organizationId === input.organizationId &&
					entry.goalId === input.goalId,
			);
			filtered.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const progress = filtered
				.slice(start, start + input.pageSize)
				.map((entry) => ({ ...entry }));
			return await errorResult.ok({
				progress,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listEmployeeGoals(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
			status?: PerformanceGoal["status"] | undefined;
		}): Promise<Result<PerformanceGoalListPage>> {
			let filtered = Array.from(state.goals.values()).filter(
				(goal) =>
					goal.organizationId === input.organizationId &&
					goal.employeeId === input.employeeId,
			);
			if (input.status) {
				filtered = filtered.filter((goal) => goal.status === input.status);
			}
			filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const goals = filtered
				.slice(start, start + input.pageSize)
				.map((goal) => ({ ...goal }));
			return await errorResult.ok({
				goals,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async startPerformanceReview(
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
		): Promise<Result<PerformanceReview>> {
			if (input.managerEmployeeId === input.employeeId) {
				return invalidInput(
					"Manager cannot be the same as the review employee",
				);
			}

			const cycleResult = getCycle(state, input.organizationId, input.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			if (!isPerformanceCycleOpen(cycleResult.data.status)) {
				return invalidState("Reviews can only be started in open cycles");
			}
			if (
				!isActiveParticipant(
					state,
					input.organizationId,
					input.cycleId,
					input.employmentId,
				)
			) {
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

			const duplicate = Array.from(state.reviews.values()).find(
				(reviewValue) =>
					reviewValue.organizationId === input.organizationId &&
					reviewValue.cycleId === input.cycleId &&
					reviewValue.employeeId === input.employeeId,
			);
			if (duplicate) {
				return conflict(
					"Performance review already exists for this employee in cycle",
				);
			}

			const reviewIdResult = parseHumanResourcesReviewId(randomUUID());
			if (!reviewIdResult.ok) {
				return reviewIdResult;
			}

			const now = new Date();
			const review: PerformanceReview = {
				id: reviewIdResult.data,
				organizationId: input.organizationId,
				cycleId: input.cycleId,
				employeeId: input.employeeId,
				employmentId: input.employmentId,
				overallRating: null,
				acknowledgementNote: null,
				calibrationNote: null,
				status: "draft",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.reviews.set(review.id, review);

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
				state.reviews.delete(review.id);
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const selfParticipant: PerformanceReviewParticipant = {
				id: selfParticipantId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				role: "self",
				employeeId: input.employeeId,
				userId: null,
				sequenceNumber: PERFORMANCE_REVIEW_SELF_SEQUENCE,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const managerParticipant: PerformanceReviewParticipant = {
				id: managerParticipantId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				role: "manager",
				employeeId: input.managerEmployeeId,
				userId: null,
				sequenceNumber: PERFORMANCE_REVIEW_MANAGER_SEQUENCE,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.reviewParticipants.set(selfParticipant.id, selfParticipant);
			state.reviewParticipants.set(managerParticipant.id, managerParticipant);

			const selfAssessment: PerformanceAssessment = {
				id: selfAssessmentId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				participantId: selfParticipant.id,
				kind: "self",
				rating: null,
				commentsSensitive: null,
				submittedAt: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const managerAssessment: PerformanceAssessment = {
				id: managerAssessmentId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				participantId: managerParticipant.id,
				kind: "manager",
				rating: null,
				commentsSensitive: null,
				submittedAt: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.assessments.set(selfAssessment.id, selfAssessment);
			state.assessments.set(managerAssessment.id, managerAssessment);

			const rollback: Array<() => void> = [
				() => state.reviews.delete(review.id),
				() => state.reviewParticipants.delete(selfParticipant.id),
				() => state.reviewParticipants.delete(managerParticipant.id),
				() => state.assessments.delete(selfAssessment.id),
				() => state.assessments.delete(managerAssessment.id),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: review.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: review.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...review });
		},

		async submitSelfAssessment(
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
		): Promise<Result<PerformanceReview>> {
			return await submitAssessment(
				state,
				ports,
				meta,
				input,
				"self",
				"self_submitted",
			);
		},

		async submitManagerAssessment(
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
		): Promise<Result<PerformanceReview>> {
			const reviewResult = getReview(
				state,
				input.organizationId,
				input.reviewId,
			);
			if (!reviewResult.ok) {
				return await reviewResult;
			}
			if (input.managerEmployeeId === reviewResult.data.employeeId) {
				return await invalidInput(
					"Manager cannot be the same as the review employee",
				);
			}
			return await submitAssessment(
				state,
				ports,
				meta,
				{
					...input,
					actorEmployeeId: input.managerEmployeeId,
				},
				"manager",
				"manager_submitted",
			);
		},

		async addDelegatedReviewer(
			input: {
				organizationId: string;
				reviewId: HumanResourcesReviewId;
				delegatedEmployeeId: HumanResourcesEmployeeId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceReview>> {
			const current = getReview(state, input.organizationId, input.reviewId);
			if (!current.ok) {
				return current;
			}
			const review = current.data;
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

			const participants = participantsForReview(state, review.id);
			if (
				participants.some(
					(participantValue) =>
						participantValue.employeeId === input.delegatedEmployeeId,
				)
			) {
				return conflict("Employee is already a review participant");
			}

			const participantId = newBrandId(humanResourcesReviewParticipantIdSchema);
			const assessmentId = newBrandId(humanResourcesAssessmentIdSchema);
			if (!(participantId.ok && assessmentId.ok)) {
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const now = new Date();
			const sequenceNumber = nextDelegatedSequenceNumber(participants);
			const participant: PerformanceReviewParticipant = {
				id: participantId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				role: "delegated",
				employeeId: input.delegatedEmployeeId,
				userId: null,
				sequenceNumber,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const assessment: PerformanceAssessment = {
				id: assessmentId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				participantId: participant.id,
				kind: "delegated",
				rating: null,
				commentsSensitive: null,
				submittedAt: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			const updatedReview: PerformanceReview = {
				...review,
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			const previousReview = { ...review };
			state.reviewParticipants.set(participant.id, participant);
			state.assessments.set(assessment.id, assessment);
			state.reviews.set(updatedReview.id, updatedReview);

			const rollback: Array<() => void> = [
				() => state.reviews.set(previousReview.id, previousReview),
				() => state.reviewParticipants.delete(participant.id),
				() => state.assessments.delete(assessment.id),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updatedReview.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updatedReview.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updatedReview });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async submitDelegatedAssessment(
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
		): Promise<Result<PerformanceReview>> {
			const reviewResult = getReview(
				state,
				input.organizationId,
				input.reviewId,
			);
			if (!reviewResult.ok) {
				return reviewResult;
			}
			const review = reviewResult.data;
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

			const participants = participantsForReview(state, review.id);
			const assessments = assessmentsForReview(state, review.id);
			const participant = participants.find(
				(item) => item.id === input.participantId,
			);
			if (participant?.role !== "delegated") {
				return invalidInput("Participant is not a delegated reviewer");
			}
			if (participant.employeeId !== input.delegatedEmployeeId) {
				return invalidInput("Actor is not the assigned delegated participant");
			}

			const priorCheck = assertPriorDelegatedAssessmentsSubmitted({
				participants,
				assessments,
				targetParticipantId: participant.id,
			});
			if (!priorCheck.ok) {
				return priorCheck;
			}

			const assessment = assessments.find(
				(item) => item.participantId === participant.id,
			);
			if (!assessment) {
				return invalidState("Missing delegated assessment");
			}
			if (assessment.submittedAt) {
				return invalidState("Delegated assessment is already submitted");
			}

			const cycleResult = getCycle(
				state,
				review.organizationId,
				review.cycleId,
			);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const ratingCheck = validateRatingInScale(
				input.rating,
				cycleResult.data.ratingScale,
			);
			if (!ratingCheck.ok) {
				return ratingCheck;
			}

			const previousReview = { ...review };
			const previousAssessment = { ...assessment };
			const now = new Date();
			const updatedAssessment: PerformanceAssessment = {
				...assessment,
				rating: input.rating,
				commentsSensitive: input.commentsSensitive,
				submittedAt: now,
				version: assessment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			const updatedReview: PerformanceReview = {
				...review,
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.assessments.set(updatedAssessment.id, updatedAssessment);
			state.reviews.set(updatedReview.id, updatedReview);

			const rollback: Array<() => void> = [
				() => state.reviews.set(previousReview.id, previousReview),
				() => state.assessments.set(previousAssessment.id, previousAssessment),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updatedReview.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updatedReview.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updatedReview });
		},

		async calibratePerformanceReview(
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
		): Promise<Result<PerformanceReview>> {
			const current = getReview(state, input.organizationId, input.reviewId);
			if (!current.ok) {
				return current;
			}
			const review = current.data;
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

			const cycleResult = getCycle(
				state,
				review.organizationId,
				review.cycleId,
			);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const ratingCheck = validateRatingInScale(
				input.overallRating,
				cycleResult.data.ratingScale,
			);
			if (!ratingCheck.ok) {
				return ratingCheck;
			}

			const previous = { ...review };
			const now = new Date();
			const updated: PerformanceReview = {
				...review,
				overallRating: input.overallRating,
				calibrationNote: input.calibrationNote,
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.reviews.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.reviews.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async returnPerformanceReviewForCorrection(
			input: {
				organizationId: string;
				reviewId: HumanResourcesReviewId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceReview>> {
			return await transitionReviewStatus(
				state,
				ports,
				meta,
				input,
				"returned",
				assertReviewStatusTransition,
			);
		},

		async acknowledgePerformanceReview(
			input: {
				organizationId: string;
				reviewId: HumanResourcesReviewId;
				acknowledgementNote: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceReview>> {
			const current = getReview(state, input.organizationId, input.reviewId);
			if (!current.ok) {
				return current;
			}
			const review = current.data;
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

			const previous = { ...review };
			const now = new Date();
			const updated: PerformanceReview = {
				...review,
				acknowledgementNote: input.acknowledgementNote,
				status: "acknowledged",
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.reviews.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.reviews.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async finalizePerformanceReview(
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
		): Promise<Result<PerformanceReview>> {
			const key = idemKey(input.organizationId, input.finalizeIdempotencyKey);
			const existing = state.reviewFinalizeIdempotency.get(key);
			if (existing) {
				return errorResult.ok({ ...existing });
			}

			const current = getReview(state, input.organizationId, input.reviewId);
			if (!current.ok) {
				return current;
			}
			const review = current.data;
			const versionCheck = assertExpectedVersion(
				review.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertReviewStatusTransition(
				review.status,
				"finalized",
			);
			if (!transition.ok) {
				return transition;
			}

			const cycleResult = getCycle(
				state,
				review.organizationId,
				review.cycleId,
			);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			const ratingCheck = validateRatingInScale(
				input.overallRating,
				cycleResult.data.ratingScale,
			);
			if (!ratingCheck.ok) {
				return ratingCheck;
			}

			if (
				review.overallRating !== null &&
				review.overallRating !== input.overallRating
			) {
				return invalidInput(
					"Finalize overall rating must match calibrated rating",
				);
			}

			const reviewParticipants = participantsForReview(state, review.id);
			const reviewAssessments = assessmentsForReview(state, review.id);
			const delegatedCheck = assertAllDelegatedAssessmentsSubmitted({
				participants: reviewParticipants,
				assessments: reviewAssessments,
			});
			if (!delegatedCheck.ok) {
				return delegatedCheck;
			}

			const selfAssessment = reviewAssessments.find(
				(assessment) => assessment.kind === "self",
			);
			const managerAssessment = reviewAssessments.find(
				(assessment) => assessment.kind === "manager",
			);
			if (!(selfAssessment && managerAssessment)) {
				return invalidState("Review is missing required assessments");
			}
			if (!(selfAssessment.submittedAt && managerAssessment.submittedAt)) {
				return invalidState(
					"Both self and manager assessments must be submitted",
				);
			}
			if (selfAssessment.id === managerAssessment.id) {
				return invalidState("Self and manager assessments must be distinct");
			}

			const previous = { ...review };
			const now = new Date();
			const updated: PerformanceReview = {
				...review,
				overallRating: input.overallRating,
				status: "finalized",
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.reviews.set(updated.id, updated);
			state.reviewFinalizeIdempotency.set(key, { ...updated });

			const rollback: Array<() => void> = [
				() => state.reviews.set(previous.id, previous),
				() => state.reviewFinalizeIdempotency.delete(key),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
				entityType: "hr_performance_review",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async reopenPerformanceReview(
			input: {
				organizationId: string;
				reviewId: HumanResourcesReviewId;
				reason: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceReview>> {
			const current = getReview(state, input.organizationId, input.reviewId);
			if (!current.ok) {
				return current;
			}
			const review = current.data;
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
			const transition = assertReviewStatusTransition(
				review.status,
				"reopened",
			);
			if (!transition.ok) {
				return transition;
			}

			const previous = { ...review };
			const now = new Date();
			const updated: PerformanceReview = {
				...review,
				status: "reopened",
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.reviews.set(updated.id, updated);
			const rollback: Array<() => void> = [
				() => state.reviews.set(previous.id, previous),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_review",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
				entityType: "hr_performance_review",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async getPerformanceReviewById(input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			includeConfidential: boolean;
		}): Promise<Result<PerformanceReviewDetail | null>> {
			const review = state.reviews.get(input.reviewId);
			if (!review || review.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			const detail = projectPerformanceReviewDetailForReader(
				{
					review,
					participants: participantsForReview(state, review.id),
					assessments: assessmentsForReview(state, review.id),
				},
				input.includeConfidential,
			);
			return await errorResult.ok(detail);
		},

		async listEmployeePerformanceReviews(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
			includeConfidential: boolean;
		}): Promise<Result<PerformanceReviewListPage>> {
			const filtered = Array.from(state.reviews.values())
				.filter(
					(review) =>
						review.organizationId === input.organizationId &&
						review.employeeId === input.employeeId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const reviews = redactReviewList(
				filtered.slice(start, start + input.pageSize),
				input.includeConfidential,
			);
			return await errorResult.ok({
				reviews,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listReviewsPendingManagerAction(input: {
			organizationId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
		}): Promise<Result<PerformanceReviewListPage>> {
			const filtered = Array.from(state.reviews.values()).filter((review) => {
				if (review.organizationId !== input.organizationId) {
					return false;
				}
				if (review.status !== "self_submitted") {
					return false;
				}
				return participantsForReview(state, review.id).some(
					(participant) =>
						participant.role === "manager" &&
						participant.employeeId === input.managerEmployeeId,
				);
			});
			filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const reviews = filtered
				.slice(start, start + input.pageSize)
				.map((review) => ({ ...review }));
			return await errorResult.ok({
				reviews,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async getImprovementPlanById(input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
		}): Promise<Result<PerformanceImprovementPlan | null>> {
			const plan = state.improvementPlans.get(input.planId);
			if (!plan || plan.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...plan });
		},

		async findImprovementPlanByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentImprovementPlanRecord | null>> {
			const record = state.planIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({
				plan: { ...record.plan },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async createImprovementPlan(
			record: ImprovementPlanCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceImprovementPlan>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.planIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok({ ...existing.plan });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const reviewResult = getReview(
				state,
				record.organizationId,
				record.reviewId,
			);
			if (!reviewResult.ok) {
				return reviewResult;
			}
			if (!isPerformanceReviewFinalized(reviewResult.data.status)) {
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

			const now = new Date();
			const plan: PerformanceImprovementPlan = {
				id: idResult.data,
				organizationId: record.organizationId,
				reviewId: record.reviewId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				performanceGap: record.performanceGap,
				expectedOutcome: record.expectedOutcome,
				measurableActions: record.measurableActions,
				supportResources: record.supportResources,
				dueDate: record.dueDate,
				accountableManagerEmployeeId: record.accountableManagerEmployeeId,
				status: "draft",
				outcomeReason: null,
				outcomeEvidenceReference: null,
				lastExtensionReason: null,
				lastExtensionEvidenceReference: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.improvementPlans.set(plan.id, plan);
			state.planIdempotency.set(key, {
				plan: { ...plan },
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const rollback: Array<() => void> = [
				() => state.improvementPlans.delete(plan.id),
				() => state.planIdempotency.delete(key),
			];
			const createdCheckpointIds: string[] = [];

			for (const [index, milestone] of record.milestones.entries()) {
				const checkpointId = newBrandId(
					humanResourcesImprovementCheckpointIdSchema,
				);
				if (!checkpointId.ok) {
					runRollbacks(rollback);
					for (const checkpointIdToDelete of createdCheckpointIds) {
						state.checkpoints.delete(checkpointIdToDelete);
					}
					return checkpointId;
				}
				const checkpoint: PerformanceImprovementCheckpoint = {
					id: checkpointId.data,
					organizationId: plan.organizationId,
					planId: plan.id,
					sequenceNumber: index + 1,
					dueDate: milestone.dueDate,
					outcome: "pending",
					notes: null,
					evidenceReference: null,
					recordedBy: null,
					recordedAt: null,
					createdAt: now,
					updatedAt: now,
				};
				state.checkpoints.set(checkpoint.id, checkpoint);
				createdCheckpointIds.push(checkpoint.id);
				rollback.push(() => state.checkpoints.delete(checkpoint.id));
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: plan.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_performance_improvement_plan",
				entityId: plan.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...plan });
		},

		async openImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceImprovementPlan>> {
			const current = getPlan(state, input.organizationId, input.planId);
			if (!current.ok) {
				return current;
			}
			const plan = current.data;
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertImprovementPlanStatusTransition(
				plan.status,
				"open",
			);
			if (!transition.ok) {
				return transition;
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				status: "open",
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.improvementPlans.set(updated.id, updated);
			const rollback: Array<() => void> = [
				() => state.improvementPlans.set(previous.id, previous),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_improvement_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
				entityType: "hr_performance_improvement_plan",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async acknowledgeImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceImprovementPlan>> {
			return await transitionPlanStatus(
				state,
				ports,
				meta,
				input,
				"acknowledged",
				assertImprovementPlanStatusTransition,
			);
		},

		async recordImprovementCheckpoint(
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
		): Promise<Result<PerformanceImprovementCheckpoint>> {
			const planResult = getPlan(state, input.organizationId, input.planId);
			if (!planResult.ok) {
				return planResult;
			}

			const checkpoint = checkpointsForPlan(
				state,
				input.organizationId,
				input.planId,
			).find((item) => item.sequenceNumber === input.sequenceNumber);
			if (!checkpoint) {
				return notFound(
					"Improvement checkpoint not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}

			const outcomeCheck = assertCheckpointOutcomeTransition(
				checkpoint.outcome,
				input.outcome,
			);
			if (!outcomeCheck.ok) {
				return outcomeCheck;
			}

			const previous = { ...checkpoint };
			const now = new Date();
			const updated: PerformanceImprovementCheckpoint = {
				...checkpoint,
				outcome: input.outcome,
				notes: input.notes,
				evidenceReference: input.evidenceReference,
				recordedBy: input.actorUserId,
				recordedAt: now,
				updatedAt: now,
			};
			state.checkpoints.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_improvement_checkpoint",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.checkpoints.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async amendImprovementPlan(
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
		): Promise<Result<PerformanceImprovementPlan>> {
			const current = getPlan(state, input.organizationId, input.planId);
			if (!current.ok) {
				return current;
			}
			const plan = current.data;
			if (plan.status === "completed" || plan.status === "unsuccessful") {
				return invalidState("Completed improvement plans cannot be amended");
			}
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const extensionCheck = assertImprovementPlanExtension({
				currentDueDate: plan.dueDate,
				nextDueDate: input.dueDate,
				extensionReason: input.extensionReason,
			});
			if (!extensionCheck.ok) {
				return extensionCheck;
			}

			const nextDueDate = input.dueDate ?? plan.dueDate;
			const extending = nextDueDate > plan.dueDate;
			const existingCheckpoints = checkpointsForPlan(
				state,
				input.organizationId,
				input.planId,
			);
			if (extending) {
				const milestoneValidation = assertImprovementPlanMilestones({
					planDueDate: nextDueDate,
					milestones: [
						...existingCheckpoints.map((checkpoint) => ({
							dueDate: checkpoint.dueDate,
						})),
						{ dueDate: nextDueDate },
					],
				});
				if (!milestoneValidation.ok) {
					return milestoneValidation;
				}
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				performanceGap:
					input.performanceGap === undefined
						? plan.performanceGap
						: input.performanceGap,
				expectedOutcome:
					input.expectedOutcome === undefined
						? plan.expectedOutcome
						: input.expectedOutcome,
				measurableActions:
					input.measurableActions === undefined
						? plan.measurableActions
						: input.measurableActions,
				supportResources:
					input.supportResources === undefined
						? plan.supportResources
						: input.supportResources,
				dueDate: nextDueDate,
				lastExtensionReason: extending
					? (input.extensionReason ?? null)
					: plan.lastExtensionReason,
				lastExtensionEvidenceReference: extending
					? (input.extensionEvidenceReference ?? null)
					: plan.lastExtensionEvidenceReference,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.improvementPlans.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.improvementPlans.set(previous.id, previous),
			];
			if (extending) {
				const checkpointId = newBrandId(
					humanResourcesImprovementCheckpointIdSchema,
				);
				if (!checkpointId.ok) {
					state.improvementPlans.set(previous.id, previous);
					return checkpointId;
				}
				const nextSequence =
					existingCheckpoints.reduce(
						(max, checkpointValue) =>
							Math.max(max, checkpointValue.sequenceNumber),
						0,
					) + 1;
				const checkpoint: PerformanceImprovementCheckpoint = {
					id: checkpointId.data,
					organizationId: updated.organizationId,
					planId: updated.id,
					sequenceNumber: nextSequence,
					dueDate: nextDueDate,
					outcome: "pending",
					notes: null,
					evidenceReference: null,
					recordedBy: null,
					recordedAt: null,
					createdAt: now,
					updatedAt: now,
				};
				state.checkpoints.set(checkpoint.id, checkpoint);
				rollback.push(() => state.checkpoints.delete(checkpoint.id));
			}

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_improvement_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async completeImprovementPlan(
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
		): Promise<Result<PerformanceImprovementPlan>> {
			const current = getPlan(state, input.organizationId, input.planId);
			if (!current.ok) {
				return current;
			}
			const plan = current.data;
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertImprovementPlanStatusTransition(
				plan.status,
				"completed",
			);
			if (!transition.ok) {
				return transition;
			}

			const pendingCheck = assertNoPendingCheckpoints(
				checkpointsForPlan(state, input.organizationId, input.planId),
			);
			if (!pendingCheck.ok) {
				return pendingCheck;
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				status: "completed",
				outcomeReason: input.outcomeReason ?? null,
				outcomeEvidenceReference: input.outcomeEvidenceReference ?? null,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.improvementPlans.set(updated.id, updated);
			const rollback: Array<() => void> = [
				() => state.improvementPlans.set(previous.id, previous),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_improvement_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				type: HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
				entityType: "hr_performance_improvement_plan",
				entityId: updated.id,
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async closeImprovementPlanUnsuccessful(
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
		): Promise<Result<PerformanceImprovementPlan>> {
			const current = getPlan(state, input.organizationId, input.planId);
			if (!current.ok) {
				return current;
			}
			const plan = current.data;
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertImprovementPlanStatusTransition(
				plan.status,
				"unsuccessful",
			);
			if (!transition.ok) {
				return transition;
			}

			const pendingCheck = assertNoPendingCheckpoints(
				checkpointsForPlan(state, input.organizationId, input.planId),
			);
			if (!pendingCheck.ok) {
				return pendingCheck;
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				status: "unsuccessful",
				outcomeReason: input.outcomeReason ?? null,
				outcomeEvidenceReference: input.outcomeEvidenceReference ?? null,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.improvementPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, meta, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_performance_improvement_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.improvementPlans.set(previous.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async cancelImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<PerformanceImprovementPlan>> {
			return await transitionPlanStatus(
				state,
				ports,
				meta,
				input,
				"cancelled",
				assertImprovementPlanStatusTransition,
			);
		},

		async listActiveImprovementPlans(input: {
			organizationId: string;
			page: number;
			pageSize: number;
		}): Promise<Result<PerformanceImprovementPlanListPage>> {
			const filtered = Array.from(state.improvementPlans.values())
				.filter(
					(plan) =>
						plan.organizationId === input.organizationId &&
						(plan.status === "open" || plan.status === "acknowledged"),
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const plans = filtered
				.slice(start, start + input.pageSize)
				.map((plan) => ({ ...plan }));
			return await errorResult.ok({
				plans,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listImprovementPlanCheckpoints(input: {
			organizationId: string;
			planId: HumanResourcesImprovementPlanId;
		}): Promise<Result<PerformanceImprovementCheckpointListPage>> {
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
			const checkpoints = checkpointsForPlan(
				state,
				input.organizationId,
				input.planId,
			).map((checkpoint) => ({ ...checkpoint }));
			return errorResult.ok({
				checkpoints,
				totalCount: checkpoints.length,
			});
		},

		async getEmployeePerformanceHistory(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			includeConfidential: boolean;
		}): Promise<Result<EmployeePerformanceHistory>> {
			const reviews = Array.from(state.reviews.values())
				.filter(
					(review) =>
						review.organizationId === input.organizationId &&
						review.employeeId === input.employeeId,
				)
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			const entries = reviews.map((review) => {
				const detail = projectPerformanceReviewDetailForReader(
					{
						review,
						participants: participantsForReview(state, review.id),
						assessments: assessmentsForReview(state, review.id),
					},
					input.includeConfidential,
				);
				const goals = Array.from(state.goals.values()).filter(
					(goal) =>
						goal.organizationId === input.organizationId &&
						goal.employeeId === input.employeeId &&
						goal.cycleId === review.cycleId,
				);
				const improvementPlans = Array.from(
					state.improvementPlans.values(),
				).filter(
					(plan) =>
						plan.organizationId === input.organizationId &&
						plan.reviewId === review.id,
				);
				return {
					review: detail.review,
					overallRating: input.includeConfidential
						? review.overallRating
						: null,
					assessments: detail.assessments,
					goals: goals.map((goal) => ({ ...goal })),
					improvementPlans: improvementPlans.map((plan) => ({ ...plan })),
				};
			});

			return await errorResult.ok({
				employeeId: input.employeeId,
				entries,
			});
		},
	};
}

async function transitionGoalStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		goalId: HumanResourcesGoalId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceGoal["status"],
	assertTransition: (
		current: PerformanceGoal["status"],
		next: PerformanceGoal["status"],
	) => Result<void>,
): Promise<Result<PerformanceGoal>> {
	const current = getGoal(state, input.organizationId, input.goalId);
	if (!current.ok) {
		return current;
	}
	const goal = current.data;
	const versionCheck = assertExpectedVersion(
		goal.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertTransition(goal.status, nextStatus);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...goal };
	const now = new Date();
	const updated: PerformanceGoal = {
		...goal,
		status: nextStatus,
		version: goal.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.goals.set(updated.id, updated);

	const audit = await recordAudit(ports, meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_performance_goal",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		state.goals.set(previous.id, previous);
		return audit;
	}

	return errorResult.ok({ ...updated });
}

async function transitionReviewStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		reviewId: HumanResourcesReviewId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceReview["status"],
	assertTransition: (
		current: PerformanceReview["status"],
		next: PerformanceReview["status"],
	) => Result<void>,
): Promise<Result<PerformanceReview>> {
	const current = getReview(state, input.organizationId, input.reviewId);
	if (!current.ok) {
		return current;
	}
	const review = current.data;
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
	const transition = assertTransition(review.status, nextStatus);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...review };
	const now = new Date();
	const updated: PerformanceReview = {
		...review,
		status: nextStatus,
		version: review.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.reviews.set(updated.id, updated);

	const audit = await recordAudit(ports, meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_performance_review",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		state.reviews.set(previous.id, previous);
		return audit;
	}

	return errorResult.ok({ ...updated });
}

async function transitionPlanStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	input: {
		organizationId: string;
		planId: HumanResourcesImprovementPlanId;
		expectedVersion: number;
		actorUserId: string;
	},
	nextStatus: PerformanceImprovementPlan["status"],
	assertTransition: (
		current: PerformanceImprovementPlan["status"],
		next: PerformanceImprovementPlan["status"],
	) => Result<void>,
): Promise<Result<PerformanceImprovementPlan>> {
	const current = getPlan(state, input.organizationId, input.planId);
	if (!current.ok) {
		return current;
	}
	const plan = current.data;
	const versionCheck = assertExpectedVersion(
		plan.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	const transition = assertTransition(plan.status, nextStatus);
	if (!transition.ok) {
		return transition;
	}

	const previous = { ...plan };
	const now = new Date();
	const updated: PerformanceImprovementPlan = {
		...plan,
		status: nextStatus,
		version: plan.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.improvementPlans.set(updated.id, updated);

	const audit = await recordAudit(ports, meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_performance_improvement_plan",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		state.improvementPlans.set(previous.id, previous);
		return audit;
	}

	return errorResult.ok({ ...updated });
}

async function submitAssessment(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
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
): Promise<Result<PerformanceReview>> {
	const reviewResult = getReview(state, input.organizationId, input.reviewId);
	if (!reviewResult.ok) {
		return reviewResult;
	}
	const review = reviewResult.data;
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

	const cycleResult = getCycle(state, review.organizationId, review.cycleId);
	if (!cycleResult.ok) {
		return cycleResult;
	}
	const ratingCheck = validateRatingInScale(
		input.rating,
		cycleResult.data.ratingScale,
	);
	if (!ratingCheck.ok) {
		return ratingCheck;
	}

	const assessment = assessmentsForReview(state, review.id).find(
		(item) => item.kind === kind,
	);
	if (!assessment) {
		return invalidState(`Missing ${kind} assessment`);
	}

	const participant = participantsForReview(state, review.id).find(
		(item) =>
			item.id === assessment.participantId &&
			item.employeeId === input.actorEmployeeId,
	);
	if (!participant) {
		return invalidInput(`Actor is not the assigned ${kind} participant`);
	}

	const previousReview = { ...review };
	const previousAssessment = { ...assessment };
	const now = new Date();
	const updatedAssessment: PerformanceAssessment = {
		...assessment,
		rating: input.rating,
		commentsSensitive: input.commentsSensitive,
		submittedAt: now,
		version: assessment.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	const updatedReview: PerformanceReview = {
		...review,
		status: nextStatus,
		version: review.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.assessments.set(updatedAssessment.id, updatedAssessment);
	state.reviews.set(updatedReview.id, updatedReview);

	const rollback: Array<() => void> = [
		() => state.reviews.set(previousReview.id, previousReview),
		() => state.assessments.set(previousAssessment.id, previousAssessment),
	];

	const audit = await recordAudit(ports, meta, {
		organizationId: updatedReview.organizationId,
		actorUserId: input.actorUserId,
		entity: "hr_performance_review",
		entityId: updatedReview.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		runRollbacks(rollback);
		return audit;
	}

	return errorResult.ok({ ...updatedReview });
}

export function createMemoryPerformanceMethods(
	state: PerformanceMemoryState,
): PerformanceMemoryMethods &
	ThisType<MemoryPerformanceHost & PerformanceMemoryMethods> {
	return buildPerformanceMemoryMethods(state);
}
