import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type HumanResourcesCompensationReviewCycleId,
	type HumanResourcesCompensationReviewId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmploymentId,
	parseHumanResourcesCompensationReviewCycleId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	buildCreateAuditFact,
	buildStatusTransitionAuditFact,
	buildUpdateAuditFact,
} from "../../shared/audit-facts";
import { assertCompensationReviewBudgetForMutation } from "../../shared/compensation-review-budget-loader";
import {
	compensationReviewAuditSnapshot,
	compensationReviewCycleAuditSnapshot,
} from "../../shared/compensation-review-audit";
import {
	assertCanFinalizeCompensationReview,
	assertCanRecordCompensationRecommendation,
	assertReviewCycleOpenForMutation,
	assertReviewCycleStatusTransition,
	assertValidReviewCyclePeriod,
} from "../../shared/compensation-review-guards";
import {
	isCompensationReviewFinalized,
	isEmployeeCompensationActive,
} from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import type {
	CompensationReviewCycleCreateRecord,
	IdempotentCompensationReviewCycleRecord,
} from "../../store/compensation";
import type {
	CompensationReview,
	CompensationReviewCycle,
	CompensationReviewCycleListPage,
	EmployeeCompensation,
} from "../../types";
import type { CompensationBenefitsMemoryState } from "./compensation-benefits";
import { idempotencyMapKey } from "./shared";

function cloneCycle(cycle: CompensationReviewCycle): CompensationReviewCycle {
	return { ...cycle };
}

function getReviewCycle(
	state: CompensationBenefitsMemoryState,
	organizationId: string,
	cycleId: HumanResourcesCompensationReviewCycleId,
): Result<CompensationReviewCycle> {
	const cycle = state.compensationReviewCycles.get(cycleId);
	if (!cycle || cycle.organizationId !== organizationId) {
		return notFound(
			"Compensation review cycle not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	return ok(cycle);
}

function listReviewsByCycle(
	state: CompensationBenefitsMemoryState,
	organizationId: string,
	cycleId: HumanResourcesCompensationReviewCycleId,
): CompensationReview[] {
	return Array.from(state.compensationReviews.values()).filter(
		(review) =>
			review.organizationId === organizationId && review.cycleId === cycleId,
	);
}

async function recordAudit(
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	fact: ReturnType<typeof buildCreateAuditFact>,
): Promise<Result<{ id: string }>> {
	return ports.audit.record(fact);
}

export type MemoryCompensationReviewCycleMethods = {
	getCompensationReviewCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReviewCycle | null>>;
	findCompensationReviewCycleByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCompensationReviewCycleRecord | null>>;
	createCompensationReviewCycle(
		record: CompensationReviewCycleCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;
	openCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;
	closeCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;
	cancelCompensationReviewCycle(
		input: {
			organizationId: string;
			cycleId: HumanResourcesCompensationReviewCycleId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CompensationReviewCycle>>;
	listCompensationReviewCycles(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CompensationReviewCycle["status"];
	}): Promise<Result<CompensationReviewCycleListPage>>;
	listCompensationReviewsByCycle(input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
	}): Promise<Result<CompensationReview[]>>;
};

export function createMemoryCompensationReviewCycleMethods(
	state: CompensationBenefitsMemoryState,
): MemoryCompensationReviewCycleMethods {
	return {
		async getCompensationReviewCycle(input) {
			const cycle = state.compensationReviewCycles.get(input.cycleId) ?? null;
			if (cycle && cycle.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(cycle === null ? null : cloneCycle(cycle));
		},

		async findCompensationReviewCycleByIdempotencyKey(input) {
			const key = idempotencyMapKey(
				input.organizationId,
				input.idempotencyKey,
			);
			const record = state.cycleIdempotencyByKey.get(key) ?? null;
			return ok(
				record === null
					? null
					: {
							cycle: cloneCycle(record.cycle),
							createRequestFingerprint: record.createRequestFingerprint,
						},
			);
		},

		async createCompensationReviewCycle(record, ports, meta) {
			const key = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing = state.cycleIdempotencyByKey.get(key);
			if (
				existing &&
				existing.createRequestFingerprint === record.createRequestFingerprint
			) {
				return ok(cloneCycle(existing.cycle));
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const duplicate = Array.from(state.compensationReviewCycles.values()).find(
				(cycle) =>
					cycle.organizationId === record.organizationId &&
					cycle.code === record.code,
			);
			if (duplicate) {
				return fail(
					"CONFLICT",
					"Compensation review cycle with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}

			const periodCheck = assertValidReviewCyclePeriod({
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
			});
			if (!periodCheck.ok) {
				return periodCheck;
			}

			const idResult = parseHumanResourcesCompensationReviewCycleId(randomUUID());
			if (!idResult.ok) return idResult;

			const now = new Date();
			const cycle: CompensationReviewCycle = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				status: "draft",
				budgetTotalAmount: record.budgetTotalAmount,
				budgetCurrencyCode: record.budgetCurrencyCode,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.compensationReviewCycles.set(cycle.id, cycle);
			state.cycleIdempotencyByKey.set(key, {
				cycle: cloneCycle(cycle),
				createRequestFingerprint: record.createRequestFingerprint,
			});

			const audit = await recordAudit(
				ports,
				meta,
				buildCreateAuditFact({
					context: {
						organizationId: cycle.organizationId,
						actorUserId: record.createdBy,
						entity: "hr_compensation_review_cycle",
						entityId: cycle.id,
						meta,
					},
					newValue: compensationReviewCycleAuditSnapshot(cycle),
				}),
			);
			if (!audit.ok) {
				state.compensationReviewCycles.delete(cycle.id);
				state.cycleIdempotencyByKey.delete(key);
				return audit;
			}

			return ok(cloneCycle(cycle));
		},

		async openCompensationReviewCycle(input, ports, meta) {
			return transitionReviewCycleStatus(state, input, ports, meta, "open");
		},

		async closeCompensationReviewCycle(input, ports, meta) {
			return transitionReviewCycleStatus(state, input, ports, meta, "closed");
		},

		async cancelCompensationReviewCycle(input, ports, meta) {
			return transitionReviewCycleStatus(state, input, ports, meta, "cancelled");
		},

		async listCompensationReviewCycles(input) {
			let cycles = Array.from(state.compensationReviewCycles.values()).filter(
				(cycle) => cycle.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				cycles = cycles.filter((cycle) => cycle.status === input.status);
			}
			cycles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = cycles.length;
			const start = (input.page - 1) * input.pageSize;
			const pageItems = cycles
				.slice(start, start + input.pageSize)
				.map((cycle) => cloneCycle(cycle));
			return ok({
				cycles: pageItems,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listCompensationReviewsByCycle(input) {
			const reviews = listReviewsByCycle(
				state,
				input.organizationId,
				input.cycleId,
			).map((review) => ({ ...review }));
			return ok(reviews);
		},
	};
}

async function transitionReviewCycleStatus(
	state: CompensationBenefitsMemoryState,
	input: {
		organizationId: string;
		cycleId: HumanResourcesCompensationReviewCycleId;
		expectedVersion: number;
		actorUserId: string;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
	nextStatus: CompensationReviewCycle["status"],
): Promise<Result<CompensationReviewCycle>> {
	const current = getReviewCycle(state, input.organizationId, input.cycleId);
	if (!current.ok) return current;
	const cycle = current.data;
	const versionCheck = assertExpectedVersion(
		cycle.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertReviewCycleStatusTransition(cycle.status, nextStatus);
	if (!transition.ok) return transition;

	const previous = cloneCycle(cycle);
	const now = new Date();
	const updated = cloneCycle({
		...cycle,
		status: nextStatus,
		version: cycle.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	});
	state.compensationReviewCycles.set(updated.id, updated);

	const audit = await recordAudit(
		ports,
		meta,
		buildStatusTransitionAuditFact({
			context: {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_compensation_review_cycle",
				entityId: updated.id,
				meta,
			},
			oldStatus: previous.status,
			newStatus: updated.status,
			oldValue: compensationReviewCycleAuditSnapshot(previous),
			newValue: compensationReviewCycleAuditSnapshot(updated),
		}),
	);
	if (!audit.ok) {
		state.compensationReviewCycles.set(previous.id, previous);
		return audit;
	}

	return ok(cloneCycle(updated));
}

export type MemoryCompensationReviewLifecycleDeps = {
	getReviewCycle: (
		organizationId: string,
		cycleId: HumanResourcesCompensationReviewCycleId,
	) => Promise<Result<CompensationReviewCycle | null>>;
	listCycleReviews: (
		organizationId: string,
		cycleId: HumanResourcesCompensationReviewCycleId,
	) => Promise<Result<CompensationReview[]>>;
	getActiveBaseAmount: (
		organizationId: string,
		employmentId: HumanResourcesEmploymentId,
	) => Promise<Result<string | null>>;
};

export function createMemoryReviewLifecycleDeps(
	state: CompensationBenefitsMemoryState,
): MemoryCompensationReviewLifecycleDeps {
	return {
		getReviewCycle: async (organizationId, cycleId) => {
			const cycle = state.compensationReviewCycles.get(cycleId) ?? null;
			if (cycle && cycle.organizationId !== organizationId) {
				return ok(null);
			}
			return ok(cycle === null ? null : cloneCycle(cycle));
		},
		listCycleReviews: async (organizationId, cycleId) =>
			ok(listReviewsByCycle(state, organizationId, cycleId)),
		getActiveBaseAmount: async (organizationId, employmentId) => {
			const active =
				Array.from(state.employeeCompensations.values()).find(
					(compensation) =>
						compensation.organizationId === organizationId &&
						compensation.employmentId === employmentId &&
						isEmployeeCompensationActive(compensation.status),
				) ?? null;
			return ok(active?.baseAmount ?? null);
		},
	};
}

export async function memoryRecordCompensationRecommendation(
	state: CompensationBenefitsMemoryState,
	deps: MemoryCompensationReviewLifecycleDeps,
	input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
		proposedBaseAmount: string;
		proposedCurrencyCode: string;
		proposedGradeId: CompensationReview["proposedGradeId"];
		proposedSalaryBandId: CompensationReview["proposedSalaryBandId"];
		effectiveFrom: string;
		recommendationNote: string | null;
		actorUserId: string;
		expectedVersion: number;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<CompensationReview>> {
	const review = state.compensationReviews.get(input.reviewId);
	if (!review) {
		return notFound(
			"Compensation review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	if (review.organizationId !== input.organizationId) {
		return notFound(
			"Compensation review not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;

	const statusGuard = assertCanRecordCompensationRecommendation(review.status);
	if (!statusGuard.ok) return statusGuard;

	const cycleResult = await deps.getReviewCycle(
		input.organizationId,
		review.cycleId,
	);
	if (!cycleResult.ok) return cycleResult;
	if (cycleResult.data === null) {
		return notFound("Compensation review cycle not found");
	}
	const openGuard = assertReviewCycleOpenForMutation(cycleResult.data.status);
	if (!openGuard.ok) return openGuard;

	const now = new Date();
	const previous = { ...review };
	const updated: CompensationReview = {
		...review,
		proposedBaseAmount: input.proposedBaseAmount,
		proposedCurrencyCode: input.proposedCurrencyCode,
		proposedGradeId: input.proposedGradeId,
		proposedSalaryBandId: input.proposedSalaryBandId,
		effectiveFrom: input.effectiveFrom,
		recommendationNote: input.recommendationNote,
		status: "recorded",
		version: review.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};

	const budgetCheck = await assertCompensationReviewBudgetForMutation(
		{
			getCycle: async () => ok(cycleResult.data),
			listCycleReviews: () =>
				deps.listCycleReviews(input.organizationId, review.cycleId),
			getActiveBaseAmount: (employmentId) =>
				deps.getActiveBaseAmount(input.organizationId, employmentId),
		},
		updated,
	);
	if (!budgetCheck.ok) return budgetCheck;

	state.compensationReviews.set(updated.id, updated);
	const key = idempotencyMapKey(
		updated.organizationId,
		updated.createIdempotencyKey,
	);
	state.reviewIdempotencyByKey.set(key, updated);

	const rollback: Array<() => void> = [
		() => {
			state.compensationReviews.set(updated.id, previous);
			state.reviewIdempotencyByKey.set(key, previous);
		},
	];

	const audit = await recordAudit(
		ports,
		meta,
		buildUpdateAuditFact({
			context: {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_compensation_review",
				entityId: updated.id,
				meta,
			},
			oldValue: compensationReviewAuditSnapshot(previous),
			newValue: compensationReviewAuditSnapshot(updated),
		}),
	);
	if (!audit.ok) {
		for (const undo of rollback) undo();
		return audit;
	}

	return ok({ ...updated });
}

export async function memoryFinalizeCompensationReview(
	state: CompensationBenefitsMemoryState,
	deps: MemoryCompensationReviewLifecycleDeps,
	input: {
		organizationId: string;
		reviewId: HumanResourcesCompensationReviewId;
		actorUserId: string;
		expectedVersion: number;
	},
	ports: MutationPorts,
	meta: HumanResourcesMutationMeta,
): Promise<Result<CompensationReview>> {
	const review = state.compensationReviews.get(input.reviewId);
	if (!review) {
		return notFound(
			"Compensation review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	if (review.organizationId !== input.organizationId) {
		return notFound(
			"Compensation review not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		review.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;

	const finalizeGuard = assertCanFinalizeCompensationReview(review);
	if (!finalizeGuard.ok) return finalizeGuard;

	const cycleResult = await deps.getReviewCycle(
		input.organizationId,
		review.cycleId,
	);
	if (!cycleResult.ok) return cycleResult;
	if (cycleResult.data === null) {
		return notFound("Compensation review cycle not found");
	}
	const openGuard = assertReviewCycleOpenForMutation(cycleResult.data.status);
	if (!openGuard.ok) return openGuard;

	const budgetCheck = await assertCompensationReviewBudgetForMutation(
		{
			getCycle: async () => ok(cycleResult.data),
			listCycleReviews: () =>
				deps.listCycleReviews(input.organizationId, review.cycleId),
			getActiveBaseAmount: (employmentId) =>
				deps.getActiveBaseAmount(input.organizationId, employmentId),
		},
		review,
	);
	if (!budgetCheck.ok) return budgetCheck;

	const now = new Date();
	const previous = { ...review };
	const updated: CompensationReview = {
		...review,
		status: "finalized",
		finalizedAt: now,
		version: review.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.compensationReviews.set(updated.id, updated);
	const key = idempotencyMapKey(
		updated.organizationId,
		updated.createIdempotencyKey,
	);
	state.reviewIdempotencyByKey.set(key, updated);

	const rollback: Array<() => void> = [
		() => {
			state.compensationReviews.set(updated.id, previous);
			state.reviewIdempotencyByKey.set(key, previous);
		},
	];

	const audit = await recordAudit(
		ports,
		meta,
		buildStatusTransitionAuditFact({
			context: {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				entity: "hr_compensation_review",
				entityId: updated.id,
				meta,
			},
			oldStatus: previous.status,
			newStatus: updated.status,
			oldValue: compensationReviewAuditSnapshot(previous),
			newValue: compensationReviewAuditSnapshot(updated),
		}),
	);
	if (!audit.ok) {
		for (const undo of rollback) undo();
		return audit;
	}

	return ok({ ...updated });
}

export function memoryApplyReviewCompensationLink(
	state: CompensationBenefitsMemoryState,
	reviewId: HumanResourcesCompensationReviewId,
	compensationId: HumanResourcesEmployeeCompensationId,
	actorUserId: string,
): Result<CompensationReview> {
	const review = state.compensationReviews.get(reviewId);
	if (!review) {
		return notFound(
			"Compensation review not found",
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	}
	if (!isCompensationReviewFinalized(review.status)) {
		return invalidState("Compensation review is not finalized");
	}

	const now = new Date();
	const updated: CompensationReview = {
		...review,
		appliedCompensationId: compensationId,
		version: review.version + 1,
		updatedBy: actorUserId,
		updatedAt: now,
	};
	state.compensationReviews.set(updated.id, updated);
	const key = idempotencyMapKey(
		updated.organizationId,
		updated.createIdempotencyKey,
	);
	state.reviewIdempotencyByKey.set(key, updated);
	return ok({ ...updated });
}
