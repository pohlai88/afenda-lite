import { randomUUID } from "node:crypto";
import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";
import {
	type HumanResourcesHeadcountPlanId,
	type HumanResourcesHeadcountPlanLineId,
	type HumanResourcesHeadcountReservationId,
	type HumanResourcesRequisitionId,
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesHeadcountReservationId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import {
	assertHeadcountPlanStatusTransition,
	assertValidHeadcountPeriod,
} from "../../shared/workforce-planning-guards";
import type {
	HeadcountPlanStatus,
	HeadcountReservationStatus,
} from "../../shared/workforce-planning-status";
import type {
	HeadcountPlanCreateRecord,
	HeadcountPlanLineCreateRecord,
	HeadcountPlanSupersedeRecord,
	HeadcountReservationCreateRecord,
	HumanResourcesStore,
	IdempotentHeadcountPlanRecord,
	IdempotentHeadcountReservationRecord,
} from "../../store";
import type {
	HeadcountAvailability,
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountPlanListPage,
	HeadcountReservation,
	HeadcountReservationListPage,
	RecruitmentHeadcountHandoff,
	WorkforcePlanVariance,
} from "../../types";
import { computeLineAvailability } from "../../workforce-planning/availability";
import { computeWorkforcePlanVarianceLine } from "../../workforce-planning/variance";

export interface WorkforcePlanningMemoryState {
	headcountPlanIdempotency: Map<string, IdempotentHeadcountPlanRecord>;
	headcountPlanLines: Map<string, HeadcountPlanLine>;
	headcountPlans: Map<string, HeadcountPlan>;
	headcountReservationIdempotency: Map<
		string,
		IdempotentHeadcountReservationRecord
	>;
	headcountReservations: Map<string, HeadcountReservation>;
}

export function createWorkforcePlanningMemoryState(): WorkforcePlanningMemoryState {
	return {
		headcountPlans: new Map(),
		headcountPlanIdempotency: new Map(),
		headcountPlanLines: new Map(),
		headcountReservations: new Map(),
		headcountReservationIdempotency: new Map(),
	};
}

export function resetWorkforcePlanningMemoryState(
	state: WorkforcePlanningMemoryState,
): void {
	state.headcountPlans.clear();
	state.headcountPlanIdempotency.clear();
	state.headcountPlanLines.clear();
	state.headcountReservations.clear();
	state.headcountReservationIdempotency.clear();
}

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return await ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
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

function linesForPlan(
	state: WorkforcePlanningMemoryState,
	organizationId: string,
	planId: HumanResourcesHeadcountPlanId,
): HeadcountPlanLine[] {
	return Array.from(state.headcountPlanLines.values()).filter(
		(line) => line.organizationId === organizationId && line.planId === planId,
	);
}

function reservationsForLine(
	state: WorkforcePlanningMemoryState,
	organizationId: string,
	planLineId: HumanResourcesHeadcountPlanLineId,
): HeadcountReservation[] {
	return Array.from(state.headcountReservations.values()).filter(
		(reservation) =>
			reservation.organizationId === organizationId &&
			reservation.planLineId === planLineId,
	);
}

export type MemoryWorkforcePlanningMethods = Pick<
	HumanResourcesStore,
	| "findHeadcountPlanByIdempotencyKey"
	| "getHeadcountPlanById"
	| "findApprovedHeadcountPlanForScope"
	| "createHeadcountPlan"
	| "updateHeadcountPlan"
	| "transitionHeadcountPlanStatus"
	| "supersedeHeadcountPlan"
	| "listHeadcountPlans"
	| "getHeadcountPlanLineById"
	| "listHeadcountPlanLinesByPlanId"
	| "addHeadcountPlanLine"
	| "updateHeadcountPlanLine"
	| "removeHeadcountPlanLine"
	| "findHeadcountReservationByIdempotencyKey"
	| "getHeadcountReservationById"
	| "findActiveHeadcountReservationForRequisition"
	| "reserveHeadcount"
	| "releaseHeadcountReservation"
	| "consumeHeadcountReservation"
	| "releaseActiveHeadcountReservationsForRequisition"
	| "consumeActiveHeadcountReservationForRequisition"
	| "listHeadcountReservations"
	| "listHeadcountReservationsByPlanLineId"
	| "getHeadcountAvailability"
	| "getRecruitmentHeadcountHandoff"
	| "getWorkforcePlanVariance"
>;

export type WorkforcePlanningMemoryHost = Pick<
	HumanResourcesStore,
	"getRequisitionById" | "listWorkforcePlanActualAssignments"
>;

import { idempotencyMapKey } from "./shared";

async function transitionHeadcountReservationStatus(
	state: WorkforcePlanningMemoryState,
	_host: WorkforcePlanningMemoryHost & MemoryWorkforcePlanningMethods,
	input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: HeadcountReservationStatus;
		ports: MutationPorts;
		meta: HumanResourcesMutationMeta;
	},
): Promise<Result<HeadcountReservation>> {
	const reservation = state.headcountReservations.get(input.reservationId);
	if (!reservation) {
		return notFound("Headcount reservation not found");
	}
	if (reservation.organizationId !== input.organizationId) {
		return notFound(
			"Headcount reservation not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		reservation.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) {
		return versionCheck;
	}
	if (reservation.status !== "active") {
		return invalidState(
			`Cannot transition headcount reservation from ${reservation.status} to ${input.nextStatus}`,
		);
	}

	const previous = { ...reservation };
	const now = new Date();
	const updated: HeadcountReservation = {
		...reservation,
		status: input.nextStatus,
		version: reservation.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	state.headcountReservations.set(updated.id, updated);

	const audit = await recordAudit(input.ports, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_headcount_reservation",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		state.headcountReservations.set(updated.id, previous);
		return audit;
	}

	const outboxType =
		input.nextStatus === "released"
			? HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT
			: HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT;
	const outbox = await recordOutbox(input.ports, input.meta, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		type: outboxType,
		entityType: "hr_headcount_reservation",
		entityId: updated.id,
	});
	if (!outbox.ok) {
		state.headcountReservations.set(updated.id, previous);
		return outbox;
	}

	return ok({ ...updated });
}

export function createMemoryWorkforcePlanningMethods(
	state: WorkforcePlanningMemoryState,
): MemoryWorkforcePlanningMethods &
	ThisType<WorkforcePlanningMemoryHost & MemoryWorkforcePlanningMethods> {
	return {
		async findHeadcountPlanByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentHeadcountPlanRecord | null>> {
			const record =
				state.headcountPlanIdempotency.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				) ?? null;
			return await ok(record ? { ...record, plan: { ...record.plan } } : null);
		},

		async getHeadcountPlanById(input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
		}): Promise<Result<HeadcountPlan | null>> {
			const plan = state.headcountPlans.get(input.planId);
			if (!plan || plan.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...plan });
		},

		async findApprovedHeadcountPlanForScope(input: {
			organizationId: string;
			planningScopeKey: string;
			periodStart: string;
			periodEnd: string;
		}): Promise<Result<HeadcountPlan | null>> {
			const plan =
				Array.from(state.headcountPlans.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.planningScopeKey === input.planningScopeKey &&
						row.periodStart === input.periodStart &&
						row.periodEnd === input.periodEnd &&
						row.status === "approved",
				) ?? null;
			return await ok(plan ? { ...plan } : null);
		},

		async createHeadcountPlan(
			record: HeadcountPlanCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlan>> {
			const validPeriod = assertValidHeadcountPeriod(
				record.periodStart,
				record.periodEnd,
			);
			if (!validPeriod.ok) {
				return validPeriod;
			}

			const duplicateCode = Array.from(state.headcountPlans.values()).find(
				(row) =>
					row.organizationId === record.organizationId &&
					row.code === record.code,
			);
			if (duplicateCode) {
				return conflict("Headcount plan code already exists");
			}

			const planId = parseHumanResourcesHeadcountPlanId(randomUUID());
			if (!planId.ok) {
				return planId;
			}
			const now = new Date();
			const plan: HeadcountPlan = {
				id: planId.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				planningScopeKey: record.planningScopeKey,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				status: "draft",
				planVersion: 1,
				supersedesPlanId: null,
				approvedBy: null,
				approvedAt: null,
				rejectedBy: null,
				rejectedAt: null,
				rejectionReason: null,
				costEnvelopeAmount: record.costEnvelopeAmount,
				costEnvelopeCurrencyCode: record.costEnvelopeCurrencyCode,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.headcountPlans.set(plan.id, plan);
			state.headcountPlanIdempotency.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{ plan, createRequestFingerprint: record.createRequestFingerprint },
			);

			const audit = await recordAudit(ports, {
				organizationId: plan.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan",
				entityId: plan.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.headcountPlans.delete(plan.id);
				state.headcountPlanIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			return ok({ ...plan });
		},

		async updateHeadcountPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesHeadcountPlanId;
				title?: string | undefined;
				costEnvelopeAmount?: string | null | undefined;
				costEnvelopeCurrencyCode?: string | null | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlan>> {
			const plan = state.headcountPlans.get(input.planId);
			if (!plan) {
				return notFound("Headcount plan not found");
			}
			if (plan.organizationId !== input.organizationId) {
				return notFound(
					"Headcount plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (plan.status !== "draft" && plan.status !== "submitted") {
				return invalidState("Approved headcount plans are immutable");
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: HeadcountPlan = {
				...plan,
				title: input.title ?? plan.title,
				costEnvelopeAmount:
					input.costEnvelopeAmount === undefined
						? plan.costEnvelopeAmount
						: input.costEnvelopeAmount,
				costEnvelopeCurrencyCode:
					input.costEnvelopeCurrencyCode === undefined
						? plan.costEnvelopeCurrencyCode
						: input.costEnvelopeCurrencyCode,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.headcountPlans.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.headcountPlans.set(updated.id, previous);
				return audit;
			}

			return ok({ ...updated });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async transitionHeadcountPlanStatus(
			input: {
				organizationId: string;
				planId: HumanResourcesHeadcountPlanId;
				status: HeadcountPlanStatus;
				expectedVersion: number;
				actorUserId: string;
				rejectionReason?: string | undefined;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlan>> {
			const plan = state.headcountPlans.get(input.planId);
			if (!plan) {
				return notFound("Headcount plan not found");
			}
			if (plan.organizationId !== input.organizationId) {
				return notFound(
					"Headcount plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const transition = assertHeadcountPlanStatusTransition(
				plan.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			if (input.status === "approved") {
				const duplicate = Array.from(state.headcountPlans.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.id !== plan.id &&
						row.planningScopeKey === plan.planningScopeKey &&
						row.periodStart === plan.periodStart &&
						row.periodEnd === plan.periodEnd &&
						row.status === "approved",
				);
				if (duplicate && duplicate.id !== plan.supersedesPlanId) {
					return conflict(
						"An approved headcount plan already exists for this scope and period",
					);
				}
			}

			const previous = { ...plan };
			const now = new Date();
			const updated: HeadcountPlan = {
				...plan,
				status: input.status,
				approvedBy:
					input.status === "approved" ? input.actorUserId : plan.approvedBy,
				approvedAt: input.status === "approved" ? now : plan.approvedAt,
				rejectedBy:
					input.status === "rejected" ? input.actorUserId : plan.rejectedBy,
				rejectedAt: input.status === "rejected" ? now : plan.rejectedAt,
				rejectionReason:
					input.status === "rejected"
						? (input.rejectionReason ?? null)
						: plan.rejectionReason,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.headcountPlans.set(updated.id, updated);

			let supersededPrevious: HeadcountPlan | null = null;
			if (input.status === "approved" && plan.supersedesPlanId !== null) {
				const priorPlan = state.headcountPlans.get(plan.supersedesPlanId);
				if (priorPlan && priorPlan.status === "approved") {
					supersededPrevious = { ...priorPlan };
					state.headcountPlans.set(priorPlan.id, {
						...priorPlan,
						status: "superseded",
						version: priorPlan.version + 1,
						updatedBy: input.actorUserId,
						updatedAt: now,
					});
				}
			}

			const audit = await recordAudit(ports, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.headcountPlans.set(updated.id, previous);
				if (supersededPrevious) {
					state.headcountPlans.set(supersededPrevious.id, supersededPrevious);
				}
				return audit;
			}

			if (input.status === "approved") {
				const outbox = await recordOutbox(ports, meta, {
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					type: HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
					entityType: "hr_headcount_plan",
					entityId: updated.id,
				});
				if (!outbox.ok) {
					state.headcountPlans.set(updated.id, previous);
					if (supersededPrevious) {
						state.headcountPlans.set(supersededPrevious.id, supersededPrevious);
					}
					return outbox;
				}
			}

			return ok({ ...updated });
		},

		async supersedeHeadcountPlan(
			record: HeadcountPlanSupersedeRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlan>> {
			const source = state.headcountPlans.get(record.sourcePlanId);
			if (!source) {
				return notFound("Headcount plan not found");
			}
			if (source.organizationId !== record.organizationId) {
				return notFound(
					"Headcount plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (source.status !== "approved") {
				return invalidState("Only approved headcount plans can be superseded");
			}
			const versionCheck = assertExpectedVersion(
				source.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const duplicateCode = Array.from(state.headcountPlans.values()).find(
				(row) =>
					row.organizationId === record.organizationId &&
					row.code === record.code,
			);
			if (duplicateCode) {
				return conflict("Headcount plan code already exists");
			}

			const planId = parseHumanResourcesHeadcountPlanId(randomUUID());
			if (!planId.ok) {
				return planId;
			}
			const now = new Date();
			const draft: HeadcountPlan = {
				id: planId.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				planningScopeKey: source.planningScopeKey,
				periodStart: source.periodStart,
				periodEnd: source.periodEnd,
				status: "draft",
				planVersion: source.planVersion + 1,
				supersedesPlanId: source.id,
				approvedBy: null,
				approvedAt: null,
				rejectedBy: null,
				rejectedAt: null,
				rejectionReason: null,
				costEnvelopeAmount: source.costEnvelopeAmount,
				costEnvelopeCurrencyCode: source.costEnvelopeCurrencyCode,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.headcountPlans.set(draft.id, draft);
			state.headcountPlanIdempotency.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					plan: draft,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			for (const line of linesForPlan(
				state,
				record.organizationId,
				source.id,
			)) {
				const lineId = parseHumanResourcesHeadcountPlanLineId(randomUUID());
				if (!lineId.ok) {
					continue;
				}
				state.headcountPlanLines.set(lineId.data, {
					...line,
					id: lineId.data,
					planId: draft.id,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
					createdAt: now,
					updatedAt: now,
				});
			}

			const audit = await recordAudit(ports, {
				organizationId: draft.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan",
				entityId: draft.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.headcountPlans.delete(draft.id);
				state.headcountPlanIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			return ok({ ...draft });
		},

		async listHeadcountPlans(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: HeadcountPlanStatus | undefined;
			planningScopeKey?: string | undefined;
		}): Promise<Result<HeadcountPlanListPage>> {
			let plans = Array.from(state.headcountPlans.values()).filter(
				(row) => row.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				plans = plans.filter((row) => row.status === input.status);
			}
			if (input.planningScopeKey !== undefined) {
				plans = plans.filter(
					(row) => row.planningScopeKey === input.planningScopeKey,
				);
			}
			plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = plans.length;
			const start = (input.page - 1) * input.pageSize;
			return await ok({
				plans: plans.slice(start, start + input.pageSize).map((row) => ({
					...row,
				})),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async getHeadcountPlanLineById(input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		}): Promise<Result<HeadcountPlanLine | null>> {
			const line = state.headcountPlanLines.get(input.planLineId);
			if (!line || line.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...line });
		},

		async listHeadcountPlanLinesByPlanId(input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
		}): Promise<Result<HeadcountPlanLine[]>> {
			return await ok(
				linesForPlan(state, input.organizationId, input.planId).map((row) => ({
					...row,
				})),
			);
		},

		async addHeadcountPlanLine(
			record: HeadcountPlanLineCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlanLine>> {
			const plan = state.headcountPlans.get(record.planId);
			if (!plan) {
				return notFound("Headcount plan not found");
			}
			if (plan.organizationId !== record.organizationId) {
				return notFound(
					"Headcount plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (plan.status !== "draft" && plan.status !== "submitted") {
				return invalidState("Approved headcount plans are immutable");
			}

			const lineId = parseHumanResourcesHeadcountPlanLineId(randomUUID());
			if (!lineId.ok) {
				return lineId;
			}
			const now = new Date();
			const line: HeadcountPlanLine = {
				id: lineId.data,
				organizationId: record.organizationId,
				planId: record.planId,
				departmentId: record.departmentId,
				jobId: record.jobId,
				positionId: record.positionId,
				locationCode: record.locationCode,
				employmentType: record.employmentType,
				plannedFte: record.plannedFte,
				plannedHeadcount: record.plannedHeadcount,
				costEnvelopeAmount: record.costEnvelopeAmount,
				costEnvelopeCurrencyCode: record.costEnvelopeCurrencyCode,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.headcountPlanLines.set(line.id, line);

			const audit = await recordAudit(ports, {
				organizationId: line.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan_line",
				entityId: line.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.headcountPlanLines.delete(line.id);
				return audit;
			}

			return ok({ ...line });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async updateHeadcountPlanLine(
			input: {
				organizationId: string;
				planLineId: HumanResourcesHeadcountPlanLineId;
				departmentId?: HeadcountPlanLine["departmentId"] | undefined;
				jobId?: HeadcountPlanLine["jobId"] | undefined;
				positionId?: HeadcountPlanLine["positionId"] | undefined;
				locationCode?: string | null | undefined;
				employmentType?: HeadcountPlanLine["employmentType"] | undefined;
				plannedFte?: string | undefined;
				plannedHeadcount?: number | undefined;
				costEnvelopeAmount?: string | null | undefined;
				costEnvelopeCurrencyCode?: string | null | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountPlanLine>> {
			const line = state.headcountPlanLines.get(input.planLineId);
			if (!line) {
				return notFound("Headcount plan line not found");
			}
			if (line.organizationId !== input.organizationId) {
				return notFound(
					"Headcount plan line not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const plan = state.headcountPlans.get(line.planId);
			if (!plan || (plan.status !== "draft" && plan.status !== "submitted")) {
				return invalidState("Approved headcount plans are immutable");
			}
			const versionCheck = assertExpectedVersion(
				line.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const previous = { ...line };
			const now = new Date();
			const updated: HeadcountPlanLine = {
				...line,
				departmentId:
					input.departmentId === undefined
						? line.departmentId
						: input.departmentId,
				jobId: input.jobId === undefined ? line.jobId : input.jobId,
				positionId:
					input.positionId === undefined ? line.positionId : input.positionId,
				locationCode:
					input.locationCode === undefined
						? line.locationCode
						: input.locationCode,
				employmentType:
					input.employmentType === undefined
						? line.employmentType
						: input.employmentType,
				plannedFte: input.plannedFte ?? line.plannedFte,
				plannedHeadcount: input.plannedHeadcount ?? line.plannedHeadcount,
				costEnvelopeAmount:
					input.costEnvelopeAmount === undefined
						? line.costEnvelopeAmount
						: input.costEnvelopeAmount,
				costEnvelopeCurrencyCode:
					input.costEnvelopeCurrencyCode === undefined
						? line.costEnvelopeCurrencyCode
						: input.costEnvelopeCurrencyCode,
				version: line.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.headcountPlanLines.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan_line",
				entityId: updated.id,
				action: "UPDATE",
			});
			if (!audit.ok) {
				state.headcountPlanLines.set(updated.id, previous);
				return audit;
			}

			return ok({ ...updated });
		},

		async removeHeadcountPlanLine(
			input: {
				organizationId: string;
				planLineId: HumanResourcesHeadcountPlanLineId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<void>> {
			const line = state.headcountPlanLines.get(input.planLineId);
			if (!line) {
				return notFound("Headcount plan line not found");
			}
			if (line.organizationId !== input.organizationId) {
				return notFound(
					"Headcount plan line not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const plan = state.headcountPlans.get(line.planId);
			if (!plan || (plan.status !== "draft" && plan.status !== "submitted")) {
				return invalidState("Approved headcount plans are immutable");
			}
			const versionCheck = assertExpectedVersion(
				line.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			state.headcountPlanLines.delete(input.planLineId);

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_headcount_plan_line",
				entityId: input.planLineId,
				action: "DELETE",
			});
			if (!audit.ok) {
				state.headcountPlanLines.set(line.id, line);
				return audit;
			}

			return ok(undefined);
		},

		async findHeadcountReservationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentHeadcountReservationRecord | null>> {
			const record =
				state.headcountReservationIdempotency.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				) ?? null;
			return await ok(
				record ? { ...record, reservation: { ...record.reservation } } : null,
			);
		},

		async getHeadcountReservationById(input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
		}): Promise<Result<HeadcountReservation | null>> {
			const reservation = state.headcountReservations.get(input.reservationId);
			if (!reservation || reservation.organizationId !== input.organizationId) {
				return await ok(null);
			}
			return await ok({ ...reservation });
		},

		async findActiveHeadcountReservationForRequisition(input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
		}): Promise<Result<HeadcountReservation | null>> {
			const reservation =
				Array.from(state.headcountReservations.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.requisitionId === input.requisitionId &&
						row.status === "active",
				) ?? null;
			return await ok(reservation ? { ...reservation } : null);
		},

		async reserveHeadcount(
			record: HeadcountReservationCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountReservation>> {
			const requisition = await this.getRequisitionById({
				organizationId: record.organizationId,
				requisitionId: record.requisitionId,
			});
			if (!requisition.ok) {
				return requisition;
			}
			if (requisition.data === null) {
				return notFound(
					"Requisition not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const existingActive = Array.from(
				state.headcountReservations.values(),
			).find(
				(row) =>
					row.organizationId === record.organizationId &&
					row.requisitionId === record.requisitionId &&
					row.status === "active",
			);
			if (existingActive) {
				return conflict(
					"Requisition already has an active headcount reservation",
				);
			}

			const reservationId = parseHumanResourcesHeadcountReservationId(
				randomUUID(),
			);
			if (!reservationId.ok) {
				return reservationId;
			}
			const line = state.headcountPlanLines.get(record.planLineId);
			if (!line || line.organizationId !== record.organizationId) {
				return notFound("Headcount plan line not found");
			}
			const now = new Date();
			const reservation: HeadcountReservation = {
				id: reservationId.data,
				organizationId: record.organizationId,
				planId: line.planId,
				planLineId: record.planLineId,
				requisitionId: record.requisitionId,
				reservedFte: record.reservedFte,
				reservedHeadcount: record.reservedHeadcount,
				status: "active",
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.headcountReservations.set(reservation.id, reservation);
			state.headcountReservationIdempotency.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					reservation,
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await recordAudit(ports, {
				organizationId: reservation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_headcount_reservation",
				entityId: reservation.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.headcountReservations.delete(reservation.id);
				state.headcountReservationIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			const outbox = await recordOutbox(ports, meta, {
				organizationId: reservation.organizationId,
				actorUserId: reservation.createdBy,
				type: HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
				entityType: "hr_headcount_reservation",
				entityId: reservation.id,
			});
			if (!outbox.ok) {
				state.headcountReservations.delete(reservation.id);
				state.headcountReservationIdempotency.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return ok({ ...reservation });
		},

		async releaseHeadcountReservation(
			input: {
				organizationId: string;
				reservationId: HumanResourcesHeadcountReservationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountReservation>> {
			return await transitionHeadcountReservationStatus(state, this, {
				...input,
				nextStatus: "released",
				ports,
				meta,
			});
		},

		async consumeHeadcountReservation(
			input: {
				organizationId: string;
				reservationId: HumanResourcesHeadcountReservationId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<HeadcountReservation>> {
			return await transitionHeadcountReservationStatus(state, this, {
				...input,
				nextStatus: "consumed",
				ports,
				meta,
			});
		},

		async releaseActiveHeadcountReservationsForRequisition(
			input: {
				organizationId: string;
				requisitionId: HumanResourcesRequisitionId;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<void>> {
			const active = Array.from(state.headcountReservations.values()).filter(
				(row) =>
					row.organizationId === input.organizationId &&
					row.requisitionId === input.requisitionId &&
					row.status === "active",
			);
			const sequentialOutcome1 = await runSequential(
				active,
				async (reservation) => {
					const released = await transitionHeadcountReservationStatus(
						state,
						this,
						{
							organizationId: input.organizationId,
							reservationId: reservation.id,
							expectedVersion: reservation.version,
							actorUserId: input.actorUserId,
							nextStatus: "released",
							ports,
							meta,
						},
					);
					if (!released.ok) {
						return sequentialReturn(released);
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return ok(undefined);
		},

		async consumeActiveHeadcountReservationForRequisition(
			input: {
				organizationId: string;
				requisitionId: HumanResourcesRequisitionId;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<void>> {
			const active = Array.from(state.headcountReservations.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.requisitionId === input.requisitionId &&
					row.status === "active",
			);
			if (!active) {
				return ok(undefined);
			}
			const consumed = await transitionHeadcountReservationStatus(state, this, {
				organizationId: input.organizationId,
				reservationId: active.id,
				expectedVersion: active.version,
				actorUserId: input.actorUserId,
				nextStatus: "consumed",
				ports,
				meta,
			});
			if (!consumed.ok) {
				return consumed;
			}
			return ok(undefined);
		},

		async listHeadcountReservations(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			planId?: HumanResourcesHeadcountPlanId | undefined;
			requisitionId?: HumanResourcesRequisitionId | undefined;
		}): Promise<Result<HeadcountReservationListPage>> {
			let reservations = Array.from(
				state.headcountReservations.values(),
			).filter((row) => row.organizationId === input.organizationId);
			if (input.planId !== undefined) {
				reservations = reservations.filter(
					(row) => row.planId === input.planId,
				);
			}
			if (input.requisitionId !== undefined) {
				reservations = reservations.filter(
					(row) => row.requisitionId === input.requisitionId,
				);
			}
			reservations.sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
			);
			const totalCount = reservations.length;
			const start = (input.page - 1) * input.pageSize;
			return await ok({
				reservations: reservations
					.slice(start, start + input.pageSize)
					.map((row) => ({ ...row })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listHeadcountReservationsByPlanLineId(input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		}): Promise<Result<HeadcountReservation[]>> {
			return await ok(
				reservationsForLine(state, input.organizationId, input.planLineId).map(
					(row) => ({ ...row }),
				),
			);
		},

		async getHeadcountAvailability(input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		}): Promise<Result<HeadcountAvailability | null>> {
			const line = state.headcountPlanLines.get(input.planLineId);
			if (!line || line.organizationId !== input.organizationId) {
				return await ok(null);
			}
			const reservations = reservationsForLine(
				state,
				input.organizationId,
				input.planLineId,
			);
			const lineAvailability = computeLineAvailability({ line, reservations });
			return await ok({
				planId: line.planId,
				planLineId: line.id,
				lines: [lineAvailability],
			});
		},

		async getRecruitmentHeadcountHandoff(input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
		}): Promise<Result<RecruitmentHeadcountHandoff>> {
			const activeReservation =
				Array.from(state.headcountReservations.values()).find(
					(row) =>
						row.organizationId === input.organizationId &&
						row.requisitionId === input.requisitionId &&
						row.status === "active",
				) ?? null;

			if (!activeReservation) {
				return await ok({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
					approvedPlan: null,
					availability: null,
					activeReservation: null,
				});
			}

			const plan = state.headcountPlans.get(activeReservation.planId) ?? null;
			const line = state.headcountPlanLines.get(activeReservation.planLineId);
			const availability = line
				? computeLineAvailability({
						line,
						reservations: reservationsForLine(
							state,
							input.organizationId,
							line.id,
						),
					})
				: null;

			return await ok({
				organizationId: input.organizationId,
				requisitionId: input.requisitionId,
				approvedPlan: plan ? { ...plan } : null,
				availability,
				activeReservation: { ...activeReservation },
			});
		},

		async getWorkforcePlanVariance(input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
			asOf?: string | undefined;
		}): Promise<Result<WorkforcePlanVariance>> {
			const plan = state.headcountPlans.get(input.planId);
			if (!plan || plan.organizationId !== input.organizationId) {
				return notFound("Headcount plan not found");
			}
			const asOf = input.asOf ?? plan.periodEnd;
			const actuals = await this.listWorkforcePlanActualAssignments({
				organizationId: input.organizationId,
				asOf,
			});
			if (!actuals.ok) {
				return actuals;
			}

			const lines = linesForPlan(state, input.organizationId, input.planId);
			const varianceLines = lines.map((line) => {
				const availability = computeLineAvailability({
					line,
					reservations: reservationsForLine(
						state,
						input.organizationId,
						line.id,
					),
				});
				return computeWorkforcePlanVarianceLine({
					line,
					availability,
					actuals: actuals.data,
				});
			});
			return ok({ planId: input.planId, asOf, lines: varianceLines });
		},
	};
}
