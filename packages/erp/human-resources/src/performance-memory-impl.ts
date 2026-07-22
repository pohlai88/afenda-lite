/**
 * In-memory performance domain method implementations for MemoryHumanResourcesStore.
 */

import { randomUUID } from "node:crypto";

import {
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_COMPLETED_EVENT,
	HUMAN_RESOURCES_IMPROVEMENT_PLAN_STARTED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_CYCLE_OPENED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_GOAL_APPROVED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_FINALIZED_EVENT,
	HUMAN_RESOURCES_PERFORMANCE_REVIEW_REOPENED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	humanResourcesAssessmentIdSchema,
	humanResourcesGoalProgressIdSchema,
	humanResourcesImprovementCheckpointIdSchema,
	humanResourcesPerformanceCycleParticipantIdSchema,
	humanResourcesReviewParticipantIdSchema,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesGoalId,
	type HumanResourcesImprovementPlanId,
	type HumanResourcesPerformanceCycleId,
	type HumanResourcesPerformanceCycleParticipantId,
	type HumanResourcesReviewId,
	parseHumanResourcesGoalId,
	parseHumanResourcesImprovementPlanId,
	parseHumanResourcesPerformanceCycleId,
	parseHumanResourcesReviewId,
} from "./brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { MemoryHumanResourcesStore } from "./memory-store";
import type { MutationPorts } from "./ports";
import { assertExpectedVersion } from "./shared/concurrency";
import { conflict, invalidInput, invalidState, notFound } from "./shared/domain-guards";
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
} from "./shared/performance-guards";
import { validateRatingInScale } from "./shared/performance-rating";
import {
	isPerformanceCycleOpen,
	isPerformanceGoalProgressable,
	isPerformanceReviewFinalized,
} from "./shared/performance-status";
import type {
	IdempotentImprovementPlanRecord,
	IdempotentPerformanceCycleRecord,
	IdempotentPerformanceGoalRecord,
	ImprovementPlanCreateRecord,
	PerformanceCycleCreateRecord,
	PerformanceGoalCreateRecord,
} from "./store";
import type {
	EmployeePerformanceHistory,
	PerformanceAssessment,
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
	PerformanceReviewParticipant,
} from "./types";
import { projectPerformanceReviewDetail } from "./types";
import type { PerformanceMemoryMethods, PerformanceMemoryState } from "./memory-performance";

function idemKey(organizationId: string, idempotencyKey: string): string {
	return `${organizationId}:${idempotencyKey}`;
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
		return fail(
			"VALIDATION_ERROR",
			"Invalid generated identifier",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok(parsed.data);
}

async function recordAudit(
	ports: MutationPorts,
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
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
	meta: { correlationId: string },
	input: {
		organizationId: string;
		actorUserId: string;
		type: HumanResourcesEventType;
		entityType: string;
		entityId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
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
	return ok(cycle);
}

function getGoal(
	state: PerformanceMemoryState,
	organizationId: string,
	goalId: HumanResourcesGoalId,
): Result<PerformanceGoal> {
	const goal = state.goals.get(goalId);
	if (!goal || goal.organizationId !== organizationId) {
		return notFound("Performance goal not found", HUMAN_RESOURCES_ERROR_NOT_FOUND);
	}
	return ok(goal);
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
	return ok(review);
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
	return ok(plan);
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
	store: MemoryHumanResourcesStore,
	organizationId: string,
	employeeId: HumanResourcesEmployeeId,
	employmentId: HumanResourcesEmploymentId,
): Promise<Result<true>> {
	const employee = await store.getEmployeeById({ organizationId, employeeId });
	if (!employee.ok || employee.data === null) {
		return notFound("Employee not found", HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE);
	}
	const employment = await store.getEmploymentById({ organizationId, employmentId });
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

function buildPerformanceMemoryMethods(
	store: MemoryHumanResourcesStore,
	state: PerformanceMemoryState,
) {
	return {
		async getPerformanceCycleById(input: {
			organizationId: string;
			cycleId: HumanResourcesPerformanceCycleId;
		}): Promise<Result<PerformanceCycle | null>> {
			const cycle = state.cycles.get(input.cycleId);
			if (!cycle || cycle.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cloneCycle(cycle));
		},

		async findPerformanceCycleByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPerformanceCycleRecord | null>> {
			const record = state.cycleIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return ok(null);
			}
			return ok({
				cycle: cloneCycle(record.cycle),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createPerformanceCycle(
			record: PerformanceCycleCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceCycle>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.cycleIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return ok(cloneCycle(existing.cycle));
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const duplicate = Array.from(state.cycles.values()).find(
				(cycle) =>
					cycle.organizationId === record.organizationId &&
					cycle.code === record.code,
			);
			if (duplicate) {
				return fail(
					"CONFLICT",
					"Performance cycle with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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

			return ok(cloneCycle(cycle));
		},

		async updatePerformanceCycle(
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
		): Promise<Result<PerformanceCycle>> {
			const current = getCycle(state, input.organizationId, input.cycleId);
			if (!current.ok) {
				return current;
			}
			const cycle = current.data;
			if (cycle.status !== "draft") {
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

			const previous = cloneCycle(cycle);
			const now = new Date();
			const updated = cloneCycle({
				...cycle,
				name: input.name ?? cycle.name,
				periodStart,
				periodEnd,
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

			return ok(cloneCycle(updated));
		},

		async openPerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok(cloneCycle(updated));
		},

		async closePerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok(cloneCycle(updated));
		},

		async cancelPerformanceCycle(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok(cloneCycle(updated));
		},

		async addCycleParticipant(
			input: {
				organizationId: string;
				cycleId: HumanResourcesPerformanceCycleId;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceCycleParticipant>> {
			const cycleResult = getCycle(state, input.organizationId, input.cycleId);
			if (!cycleResult.ok) {
				return cycleResult;
			}
			if (!isPerformanceCycleOpen(cycleResult.data.status)) {
				return invalidState("Participants can only be added to open cycles");
			}

			const refs = await assertEmployeeEmployment(
				store,
				input.organizationId,
				input.employeeId,
				input.employmentId,
			);
			if (!refs.ok) {
				return refs;
			}

			const existing = Array.from(state.cycleParticipants.values()).find(
				(participant) =>
					participant.organizationId === input.organizationId &&
					participant.cycleId === input.cycleId &&
					participant.employmentId === input.employmentId,
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
				return ok({ ...updated });
			}

			const idResult = newBrandId(humanResourcesPerformanceCycleParticipantIdSchema);
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

			return ok({ ...participant });
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
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listPerformanceCycles(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: PerformanceCycle["status"];
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
			return ok({
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
			return ok(participants);
		},

		async getPerformanceGoalById(input: {
			organizationId: string;
			goalId: HumanResourcesGoalId;
		}): Promise<Result<PerformanceGoal | null>> {
			const goal = state.goals.get(input.goalId);
			if (!goal || goal.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...goal });
		},

		async findPerformanceGoalByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPerformanceGoalRecord | null>> {
			const record = state.goalIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return ok(null);
			}
			return ok({
				goal: { ...record.goal },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createPerformanceGoal(
			record: PerformanceGoalCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceGoal>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.goalIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return ok({ ...existing.goal });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const cycleResult = getCycle(state, record.organizationId, record.cycleId);
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
				store,
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
				status: "draft",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
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

			return ok({ ...goal });
		},

		async updatePerformanceGoal(
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
		): Promise<Result<PerformanceGoal>> {
			const current = getGoal(state, input.organizationId, input.goalId);
			if (!current.ok) {
				return current;
			}
			const goal = current.data;
			const editable = assertGoalEditable(goal.status);
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
					input.description !== undefined ? input.description : goal.description,
				weight: input.weight !== undefined ? input.weight : goal.weight,
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

			return ok({ ...updated });
		},

		async submitPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceGoal>> {
			return transitionGoalStatus(
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
			meta: { correlationId: string },
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

			if (cycle.weightingModel === "percent100") {
				const hasPendingSubmitted = Array.from(state.goals.values()).some(
					(item) =>
						item.organizationId === goal.organizationId &&
						item.cycleId === goal.cycleId &&
						item.employeeId === goal.employeeId &&
						item.id !== goal.id &&
						item.status === "submitted",
				);
				if (!hasPendingSubmitted) {
					const weights = Array.from(state.goals.values())
						.filter(
							(item) =>
								item.organizationId === goal.organizationId &&
								item.cycleId === goal.cycleId &&
								item.employeeId === goal.employeeId &&
								(item.status === "approved" || item.status === "active"),
						)
						.map((item) => item.weight)
						.filter((weight): weight is string => weight !== null);
					const weightCheck = assertGoalWeightsSumTo100(weights);
					if (!weightCheck.ok) {
						state.goals.set(previous.id, previous);
						return weightCheck;
					}
				}
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
		},

		async rejectPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceGoal>> {
			return transitionGoalStatus(
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
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...progress });
		},

		async closePerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceGoal>> {
			return transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"closed",
				assertGoalStatusTransition,
			);
		},

		async cancelPerformanceGoal(
			input: {
				organizationId: string;
				goalId: HumanResourcesGoalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceGoal>> {
			return transitionGoalStatus(
				state,
				ports,
				meta,
				input,
				"cancelled",
				assertGoalStatusTransition,
			);
		},

		async listEmployeeGoals(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
			status?: PerformanceGoal["status"];
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
			return ok({
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
			meta: { correlationId: string },
		): Promise<Result<PerformanceReview>> {
			if (input.managerEmployeeId === input.employeeId) {
				return invalidInput("Manager cannot be the same as the review employee");
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
				store,
				input.organizationId,
				input.employeeId,
				input.employmentId,
			);
			if (!refs.ok) {
				return refs;
			}

			const duplicate = Array.from(state.reviews.values()).find(
				(review) =>
					review.organizationId === input.organizationId &&
					review.cycleId === input.cycleId &&
					review.employeeId === input.employeeId,
			);
			if (duplicate) {
				return conflict("Performance review already exists for this employee in cycle");
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
				status: "draft",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.reviews.set(review.id, review);

			const selfParticipantId = newBrandId(humanResourcesReviewParticipantIdSchema);
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
				state.reviews.delete(review.id);
				return fail(
					"INTERNAL_ERROR",
					"Could not create performance review participants",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const selfParticipant: PerformanceReviewParticipant = {
				id: selfParticipantId.data,
				organizationId: input.organizationId,
				reviewId: review.id,
				role: "self",
				employeeId: input.employeeId,
				userId: null,
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
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...review });
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
			meta: { correlationId: string },
		): Promise<Result<PerformanceReview>> {
			return submitAssessment(state, store, ports, meta, input, "self", "self_submitted");
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
			meta: { correlationId: string },
		): Promise<Result<PerformanceReview>> {
			const reviewResult = getReview(state, input.organizationId, input.reviewId);
			if (!reviewResult.ok) {
				return reviewResult;
			}
			if (input.managerEmployeeId === reviewResult.data.employeeId) {
				return invalidInput("Manager cannot be the same as the review employee");
			}
			return submitAssessment(
				state,
				store,
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

		async returnPerformanceReviewForCorrection(
			input: {
				organizationId: string;
				reviewId: HumanResourcesReviewId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceReview>> {
			return transitionReviewStatus(
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
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

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
			meta: { correlationId: string },
		): Promise<Result<PerformanceReview>> {
			const key = idemKey(input.organizationId, input.finalizeIdempotencyKey);
			const existing = state.reviewFinalizeIdempotency.get(key);
			if (existing) {
				return ok({ ...existing });
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
			const transition = assertReviewStatusTransition(review.status, "finalized");
			if (!transition.ok) {
				return transition;
			}

			const cycleResult = getCycle(state, review.organizationId, review.cycleId);
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

			const reviewAssessments = assessmentsForReview(state, review.id);
			const selfAssessment = reviewAssessments.find(
				(assessment) => assessment.kind === "self",
			);
			const managerAssessment = reviewAssessments.find(
				(assessment) => assessment.kind === "manager",
			);
			if (!selfAssessment || !managerAssessment) {
				return invalidState("Review is missing required assessments");
			}
			if (!selfAssessment.submittedAt || !managerAssessment.submittedAt) {
				return invalidState("Both self and manager assessments must be submitted");
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
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
			meta: { correlationId: string },
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
			const transition = assertReviewStatusTransition(review.status, "reopened");
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
		},

		async getPerformanceReviewById(input: {
			organizationId: string;
			reviewId: HumanResourcesReviewId;
			includeConfidential: boolean;
		}): Promise<Result<PerformanceReviewDetail | null>> {
			const review = state.reviews.get(input.reviewId);
			if (!review || review.organizationId !== input.organizationId) {
				return ok(null);
			}
			const detail = projectPerformanceReviewDetail(
				{
					review,
					participants: participantsForReview(state, review.id),
					assessments: assessmentsForReview(state, review.id),
				},
				input.includeConfidential,
			);
			return ok(detail);
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
			return ok({
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
			return ok({
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
				return ok(null);
			}
			return ok({ ...plan });
		},

		async findImprovementPlanByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentImprovementPlanRecord | null>> {
			const record = state.planIdempotency.get(
				idemKey(input.organizationId, input.idempotencyKey),
			);
			if (!record) {
				return ok(null);
			}
			return ok({
				plan: { ...record.plan },
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async createImprovementPlan(
			record: ImprovementPlanCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceImprovementPlan>> {
			const key = idemKey(record.organizationId, record.createIdempotencyKey);
			const existing = state.planIdempotency.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return ok({ ...existing.plan });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const reviewResult = getReview(state, record.organizationId, record.reviewId);
			if (!reviewResult.ok) {
				return reviewResult;
			}
			if (!isPerformanceReviewFinalized(reviewResult.data.status)) {
				return invalidState("Improvement plans require a finalized review");
			}

			const refs = await assertEmployeeEmployment(
				store,
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

			const checkpointId = newBrandId(humanResourcesImprovementCheckpointIdSchema);
			if (!checkpointId.ok) {
				state.improvementPlans.delete(plan.id);
				state.planIdempotency.delete(key);
				return checkpointId;
			}
			const checkpoint: PerformanceImprovementCheckpoint = {
				id: checkpointId.data,
				organizationId: plan.organizationId,
				planId: plan.id,
				sequenceNumber: 1,
				dueDate: plan.dueDate,
				outcome: "pending",
				notes: null,
				recordedBy: null,
				recordedAt: null,
				createdAt: now,
				updatedAt: now,
			};
			state.checkpoints.set(checkpoint.id, checkpoint);

			const rollback: Array<() => void> = [
				() => state.improvementPlans.delete(plan.id),
				() => state.planIdempotency.delete(key),
				() => state.checkpoints.delete(checkpoint.id),
			];

			const audit = await recordAudit(ports, meta, {
				organizationId: plan.organizationId,
				actorUserId: record.createdBy,
				entity: "hr_performance_improvement_plan",
				entityId: plan.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...plan });
		},

		async openImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
			const transition = assertImprovementPlanStatusTransition(plan.status, "open");
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
		},

		async acknowledgeImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceImprovementPlan>> {
			return transitionPlanStatus(
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
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceImprovementCheckpoint>> {
			const planResult = getPlan(state, input.organizationId, input.planId);
			if (!planResult.ok) {
				return planResult;
			}

			const checkpoint = Array.from(state.checkpoints.values()).find(
				(item) =>
					item.organizationId === input.organizationId &&
					item.planId === input.planId &&
					item.sequenceNumber === input.sequenceNumber,
			);
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

			return ok({ ...updated });
		},

		async amendImprovementPlan(
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

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				measurableActions:
					input.measurableActions !== undefined
						? input.measurableActions
						: plan.measurableActions,
				supportResources:
					input.supportResources !== undefined
						? input.supportResources
						: plan.supportResources,
				dueDate: input.dueDate ?? plan.dueDate,
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

			return ok({ ...updated });
		},

		async completeImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const previous = { ...plan };
			const now = new Date();
			const updated: PerformanceImprovementPlan = {
				...plan,
				status: "completed",
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
		},

		async closeImprovementPlanUnsuccessful(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceImprovementPlan>> {
			return transitionPlanStatus(
				state,
				ports,
				meta,
				input,
				"unsuccessful",
				assertImprovementPlanStatusTransition,
			);
		},

		async cancelImprovementPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesImprovementPlanId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<PerformanceImprovementPlan>> {
			return transitionPlanStatus(
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
			return ok({
				plans,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
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
				const detail = projectPerformanceReviewDetail(
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
				const improvementPlans = Array.from(state.improvementPlans.values()).filter(
					(plan) =>
						plan.organizationId === input.organizationId &&
						plan.reviewId === review.id,
				);
				return {
					review: detail.review,
					overallRating: input.includeConfidential ? review.overallRating : null,
					assessments: detail.assessments,
					goals: goals.map((goal) => ({ ...goal })),
					improvementPlans: improvementPlans.map((plan) => ({ ...plan })),
				};
			});

			return ok({
				employeeId: input.employeeId,
				entries,
			});
		},
	};
}

async function transitionGoalStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: { correlationId: string },
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
	const versionCheck = assertExpectedVersion(goal.version, input.expectedVersion);
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

	return ok({ ...updated });
}

async function transitionReviewStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: { correlationId: string },
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
	const versionCheck = assertExpectedVersion(review.version, input.expectedVersion);
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

	return ok({ ...updated });
}

async function transitionPlanStatus(
	state: PerformanceMemoryState,
	ports: MutationPorts,
	meta: { correlationId: string },
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
	const versionCheck = assertExpectedVersion(plan.version, input.expectedVersion);
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

	return ok({ ...updated });
}

async function submitAssessment(
	state: PerformanceMemoryState,
	_ports: MemoryHumanResourcesStore,
	ports: MutationPorts,
	meta: { correlationId: string },
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
	const versionCheck = assertExpectedVersion(review.version, input.expectedVersion);
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
		(item) => item.role === kind && item.employeeId === input.actorEmployeeId,
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
		for (const undo of rollback) undo();
		return audit;
	}

	return ok({ ...updatedReview });
}

export function createPerformanceMemoryMethods(
	store: MemoryHumanResourcesStore,
	stateOf: (store: MemoryHumanResourcesStore) => PerformanceMemoryState,
): PerformanceMemoryMethods {
	return buildPerformanceMemoryMethods(store, stateOf(store));
}
