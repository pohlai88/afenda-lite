import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";

import {
	parseHumanResourcesHeadcountPlanId,
	parseHumanResourcesHeadcountPlanLineId,
	parseHumanResourcesHeadcountReservationId,
	type HumanResourcesHeadcountPlanId,
	type HumanResourcesHeadcountPlanLineId,
	type HumanResourcesHeadcountReservationId,
	type HumanResourcesRequisitionId,
} from "../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../error-codes";
import type { MutationPorts } from "../ports";
import { assertExpectedVersion } from "../shared/concurrency";
import { conflict, invalidState, notFound } from "../shared/domain-guards";
import type {
	HeadcountPlanStatus,
	HeadcountReservationStatus,
} from "../shared/workforce-planning-status";
import {
	assertHeadcountPlanStatusTransition,
	assertValidHeadcountPeriod,
} from "../shared/workforce-planning-guards";
import type {
	HeadcountPlanCreateRecord,
	HeadcountPlanLineCreateRecord,
	HeadcountPlanSupersedeRecord,
	HeadcountReservationCreateRecord,
	HumanResourcesStore,
	IdempotentHeadcountPlanRecord,
	IdempotentHeadcountReservationRecord,
} from "../store";
import type {
	HeadcountAvailability,
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountPlanListPage,
	HeadcountReservation,
	HeadcountReservationListPage,
	RecruitmentHeadcountHandoff,
	WorkforcePlanVariance,
} from "../types";
import { computeLineAvailability } from "./availability";

export type WorkforcePlanningMemoryState = {
	headcountPlans: Map<string, HeadcountPlan>;
	headcountPlanIdempotency: Map<string, IdempotentHeadcountPlanRecord>;
	headcountPlanLines: Map<string, HeadcountPlanLine>;
	headcountReservations: Map<string, HeadcountReservation>;
	headcountReservationIdempotency: Map<
		string,
		IdempotentHeadcountReservationRecord
	>;
};

export function createWorkforcePlanningMemoryState(): WorkforcePlanningMemoryState {
	return {
		headcountPlans: new Map(),
		headcountPlanIdempotency: new Map(),
		headcountPlanLines: new Map(),
		headcountReservations: new Map(),
		headcountReservationIdempotency: new Map(),
	};
}

type WorkforcePlanningMemoryHost = WorkforcePlanningMemoryState &
	Pick<HumanResourcesStore, "getRequisitionById">;

function idempotencyKey(organizationId: string, key: string): string {
	return `${organizationId}:${key}`;
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
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
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

export const workforcePlanningMemoryMethods = {
	async findHeadcountPlanByIdempotencyKey(
		this: WorkforcePlanningMemoryHost,
		input: { organizationId: string; idempotencyKey: string },
	): Promise<Result<IdempotentHeadcountPlanRecord | null>> {
		const record =
			this.headcountPlanIdempotency.get(
				idempotencyKey(input.organizationId, input.idempotencyKey),
			) ?? null;
		return ok(record ? { ...record, plan: { ...record.plan } } : null);
	},

	async getHeadcountPlanById(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
		},
	): Promise<Result<HeadcountPlan | null>> {
		const plan = this.headcountPlans.get(input.planId);
		if (!plan || plan.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...plan });
	},

	async findApprovedHeadcountPlanForScope(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planningScopeKey: string;
			periodStart: string;
			periodEnd: string;
		},
	): Promise<Result<HeadcountPlan | null>> {
		const plan =
			Array.from(this.headcountPlans.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.planningScopeKey === input.planningScopeKey &&
					row.periodStart === input.periodStart &&
					row.periodEnd === input.periodEnd &&
					row.status === "approved",
			) ?? null;
		return ok(plan ? { ...plan } : null);
	},

	async createHeadcountPlan(
		this: WorkforcePlanningMemoryHost,
		record: HeadcountPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>> {
		const validPeriod = assertValidHeadcountPeriod(
			record.periodStart,
			record.periodEnd,
		);
		if (!validPeriod.ok) return validPeriod;

		const duplicateCode = Array.from(this.headcountPlans.values()).find(
			(row) =>
				row.organizationId === record.organizationId &&
				row.code === record.code,
		);
		if (duplicateCode) {
			return conflict("Headcount plan code already exists");
		}

		const planId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!planId.ok) return planId;
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

		this.headcountPlans.set(plan.id, plan);
		this.headcountPlanIdempotency.set(
			idempotencyKey(record.organizationId, record.createIdempotencyKey),
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
			this.headcountPlans.delete(plan.id);
			this.headcountPlanIdempotency.delete(
				idempotencyKey(record.organizationId, record.createIdempotencyKey),
			);
			return audit;
		}

		return ok({ ...plan });
	},

	async updateHeadcountPlan(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
			title?: string;
			costEnvelopeAmount?: string | null;
			costEnvelopeCurrencyCode?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>> {
		const plan = this.headcountPlans.get(input.planId);
		if (!plan) return notFound("Headcount plan not found");
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
		if (!versionCheck.ok) return versionCheck;
		if (plan.status !== "draft" && plan.status !== "submitted") {
			return invalidState("Approved headcount plans are immutable");
		}

		const previous = { ...plan };
		const now = new Date();
		const updated: HeadcountPlan = {
			...plan,
			title: input.title ?? plan.title,
			costEnvelopeAmount:
				input.costEnvelopeAmount !== undefined
					? input.costEnvelopeAmount
					: plan.costEnvelopeAmount,
			costEnvelopeCurrencyCode:
				input.costEnvelopeCurrencyCode !== undefined
					? input.costEnvelopeCurrencyCode
					: plan.costEnvelopeCurrencyCode,
			version: plan.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.headcountPlans.set(updated.id, updated);

		const audit = await recordAudit(ports, {
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan",
			entityId: updated.id,
			action: "UPDATE",
		});
		if (!audit.ok) {
			this.headcountPlans.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	},

	async transitionHeadcountPlanStatus(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
			status: HeadcountPlanStatus;
			expectedVersion: number;
			actorUserId: string;
			rejectionReason?: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>> {
		const plan = this.headcountPlans.get(input.planId);
		if (!plan) return notFound("Headcount plan not found");
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
		if (!versionCheck.ok) return versionCheck;
		const transition = assertHeadcountPlanStatusTransition(
			plan.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "approved") {
			const duplicate = Array.from(this.headcountPlans.values()).find(
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
			approvedBy: input.status === "approved" ? input.actorUserId : plan.approvedBy,
			approvedAt: input.status === "approved" ? now : plan.approvedAt,
			rejectedBy: input.status === "rejected" ? input.actorUserId : plan.rejectedBy,
			rejectedAt: input.status === "rejected" ? now : plan.rejectedAt,
			rejectionReason:
				input.status === "rejected"
					? input.rejectionReason ?? null
					: plan.rejectionReason,
			version: plan.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.headcountPlans.set(updated.id, updated);

		let supersededPrevious: HeadcountPlan | null = null;
		if (input.status === "approved" && plan.supersedesPlanId !== null) {
			const priorPlan = this.headcountPlans.get(plan.supersedesPlanId);
			if (priorPlan && priorPlan.status === "approved") {
				supersededPrevious = { ...priorPlan };
				this.headcountPlans.set(priorPlan.id, {
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
			this.headcountPlans.set(updated.id, previous);
			if (supersededPrevious) {
				this.headcountPlans.set(supersededPrevious.id, supersededPrevious);
			}
			return audit;
		}

		return ok({ ...updated });
	},

	async supersedeHeadcountPlan(
		this: WorkforcePlanningMemoryHost,
		record: HeadcountPlanSupersedeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>> {
		const source = this.headcountPlans.get(record.sourcePlanId);
		if (!source) return notFound("Headcount plan not found");
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
		if (!versionCheck.ok) return versionCheck;

		const duplicateCode = Array.from(this.headcountPlans.values()).find(
			(row) =>
				row.organizationId === record.organizationId &&
				row.code === record.code,
		);
		if (duplicateCode) {
			return conflict("Headcount plan code already exists");
		}

		const planId = parseHumanResourcesHeadcountPlanId(randomUUID());
		if (!planId.ok) return planId;
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

		this.headcountPlans.set(draft.id, draft);
		this.headcountPlanIdempotency.set(
			idempotencyKey(record.organizationId, record.createIdempotencyKey),
			{ plan: draft, createRequestFingerprint: record.createRequestFingerprint },
		);

		for (const line of linesForPlan(this, record.organizationId, source.id)) {
			const lineId = parseHumanResourcesHeadcountPlanLineId(randomUUID());
			if (!lineId.ok) continue;
			this.headcountPlanLines.set(lineId.data, {
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
			this.headcountPlans.delete(draft.id);
			this.headcountPlanIdempotency.delete(
				idempotencyKey(record.organizationId, record.createIdempotencyKey),
			);
			return audit;
		}

		return ok({ ...draft });
	},

	async listHeadcountPlans(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: HeadcountPlanStatus;
			planningScopeKey?: string;
		},
	): Promise<Result<HeadcountPlanListPage>> {
		let plans = Array.from(this.headcountPlans.values()).filter(
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
		return ok({
			plans: plans.slice(start, start + input.pageSize).map((row) => ({
				...row,
			})),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async getHeadcountPlanLineById(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		},
	): Promise<Result<HeadcountPlanLine | null>> {
		const line = this.headcountPlanLines.get(input.planLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...line });
	},

	async listHeadcountPlanLinesByPlanId(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
		},
	): Promise<Result<HeadcountPlanLine[]>> {
		return ok(
			linesForPlan(this, input.organizationId, input.planId).map((row) => ({
				...row,
			})),
		);
	},

	async addHeadcountPlanLine(
		this: WorkforcePlanningMemoryHost,
		record: HeadcountPlanLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>> {
		const plan = this.headcountPlans.get(record.planId);
		if (!plan) return notFound("Headcount plan not found");
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
		if (!lineId.ok) return lineId;
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
		this.headcountPlanLines.set(line.id, line);

		const audit = await recordAudit(ports, {
			organizationId: line.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: line.id,
			action: "CREATE",
		});
		if (!audit.ok) {
			this.headcountPlanLines.delete(line.id);
			return audit;
		}

		return ok({ ...line });
	},

	async updateHeadcountPlanLine(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			departmentId?: HeadcountPlanLine["departmentId"];
			jobId?: HeadcountPlanLine["jobId"];
			positionId?: HeadcountPlanLine["positionId"];
			locationCode?: string | null;
			employmentType?: HeadcountPlanLine["employmentType"];
			plannedFte?: string;
			plannedHeadcount?: number;
			costEnvelopeAmount?: string | null;
			costEnvelopeCurrencyCode?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>> {
		const line = this.headcountPlanLines.get(input.planLineId);
		if (!line) return notFound("Headcount plan line not found");
		if (line.organizationId !== input.organizationId) {
			return notFound(
				"Headcount plan line not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const plan = this.headcountPlans.get(line.planId);
		if (!plan || (plan.status !== "draft" && plan.status !== "submitted")) {
			return invalidState("Approved headcount plans are immutable");
		}
		const versionCheck = assertExpectedVersion(
			line.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const previous = { ...line };
		const now = new Date();
		const updated: HeadcountPlanLine = {
			...line,
			departmentId:
				input.departmentId !== undefined
					? input.departmentId
					: line.departmentId,
			jobId: input.jobId !== undefined ? input.jobId : line.jobId,
			positionId:
				input.positionId !== undefined ? input.positionId : line.positionId,
			locationCode:
				input.locationCode !== undefined
					? input.locationCode
					: line.locationCode,
			employmentType:
				input.employmentType !== undefined
					? input.employmentType
					: line.employmentType,
			plannedFte: input.plannedFte ?? line.plannedFte,
			plannedHeadcount: input.plannedHeadcount ?? line.plannedHeadcount,
			costEnvelopeAmount:
				input.costEnvelopeAmount !== undefined
					? input.costEnvelopeAmount
					: line.costEnvelopeAmount,
			costEnvelopeCurrencyCode:
				input.costEnvelopeCurrencyCode !== undefined
					? input.costEnvelopeCurrencyCode
					: line.costEnvelopeCurrencyCode,
			version: line.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.headcountPlanLines.set(updated.id, updated);

		const audit = await recordAudit(ports, {
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: updated.id,
			action: "UPDATE",
		});
		if (!audit.ok) {
			this.headcountPlanLines.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	},

	async removeHeadcountPlanLine(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>> {
		const line = this.headcountPlanLines.get(input.planLineId);
		if (!line) return notFound("Headcount plan line not found");
		if (line.organizationId !== input.organizationId) {
			return notFound(
				"Headcount plan line not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const plan = this.headcountPlans.get(line.planId);
		if (!plan || (plan.status !== "draft" && plan.status !== "submitted")) {
			return invalidState("Approved headcount plans are immutable");
		}
		const versionCheck = assertExpectedVersion(
			line.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		this.headcountPlanLines.delete(input.planLineId);

		const audit = await recordAudit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_plan_line",
			entityId: input.planLineId,
			action: "DELETE",
		});
		if (!audit.ok) {
			this.headcountPlanLines.set(line.id, line);
			return audit;
		}

		return ok(undefined);
	},

	async findHeadcountReservationByIdempotencyKey(
		this: WorkforcePlanningMemoryHost,
		input: { organizationId: string; idempotencyKey: string },
	): Promise<Result<IdempotentHeadcountReservationRecord | null>> {
		const record =
			this.headcountReservationIdempotency.get(
				idempotencyKey(input.organizationId, input.idempotencyKey),
			) ?? null;
		return ok(
			record ? { ...record, reservation: { ...record.reservation } } : null,
		);
	},

	async getHeadcountReservationById(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
		},
	): Promise<Result<HeadcountReservation | null>> {
		const reservation = this.headcountReservations.get(input.reservationId);
		if (!reservation || reservation.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...reservation });
	},

	async findActiveHeadcountReservationForRequisition(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
		},
	): Promise<Result<HeadcountReservation | null>> {
		const reservation =
			Array.from(this.headcountReservations.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.requisitionId === input.requisitionId &&
					row.status === "active",
			) ?? null;
		return ok(reservation ? { ...reservation } : null);
	},

	async reserveHeadcount(
		this: WorkforcePlanningMemoryHost,
		record: HeadcountReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>> {
		const requisition = await this.getRequisitionById({
			organizationId: record.organizationId,
			requisitionId: record.requisitionId,
		});
		if (!requisition.ok) return requisition;
		if (requisition.data === null) {
			return notFound(
				"Requisition not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const existingActive = Array.from(this.headcountReservations.values()).find(
			(row) =>
				row.organizationId === record.organizationId &&
				row.requisitionId === record.requisitionId &&
				row.status === "active",
		);
		if (existingActive) {
			return conflict("Requisition already has an active headcount reservation");
		}

		const reservationId = parseHumanResourcesHeadcountReservationId(
			randomUUID(),
		);
		if (!reservationId.ok) return reservationId;
		const line = this.headcountPlanLines.get(record.planLineId);
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

		this.headcountReservations.set(reservation.id, reservation);
		this.headcountReservationIdempotency.set(
			idempotencyKey(record.organizationId, record.createIdempotencyKey),
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
			this.headcountReservations.delete(reservation.id);
			this.headcountReservationIdempotency.delete(
				idempotencyKey(record.organizationId, record.createIdempotencyKey),
			);
			return audit;
		}

		return ok({ ...reservation });
	},

	async releaseHeadcountReservation(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>> {
		return transitionHeadcountReservationStatus.call(this, {
			...input,
			nextStatus: "released",
			ports,
			meta,
		});
	},

	async consumeHeadcountReservation(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>> {
		return transitionHeadcountReservationStatus.call(this, {
			...input,
			nextStatus: "consumed",
			ports,
			meta,
		});
	},

	async releaseActiveHeadcountReservationsForRequisition(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>> {
		const active = Array.from(this.headcountReservations.values()).filter(
			(row) =>
				row.organizationId === input.organizationId &&
				row.requisitionId === input.requisitionId &&
				row.status === "active",
		);
		for (const reservation of active) {
			const released = await transitionHeadcountReservationStatus.call(this, {
				organizationId: input.organizationId,
				reservationId: reservation.id,
				expectedVersion: reservation.version,
				actorUserId: input.actorUserId,
				nextStatus: "released",
				ports,
				meta,
			});
			if (!released.ok) return released;
		}
		return ok(undefined);
	},

	async consumeActiveHeadcountReservationForRequisition(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>> {
		const active = Array.from(this.headcountReservations.values()).find(
			(row) =>
				row.organizationId === input.organizationId &&
				row.requisitionId === input.requisitionId &&
				row.status === "active",
		);
		if (!active) {
			return ok(undefined);
		}
		const consumed = await transitionHeadcountReservationStatus.call(this, {
			organizationId: input.organizationId,
			reservationId: active.id,
			expectedVersion: active.version,
			actorUserId: input.actorUserId,
			nextStatus: "consumed",
			ports,
			meta,
		});
		if (!consumed.ok) return consumed;
		return ok(undefined);
	},

	async listHeadcountReservations(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			page: number;
			pageSize: number;
			planId?: HumanResourcesHeadcountPlanId;
			requisitionId?: HumanResourcesRequisitionId;
		},
	): Promise<Result<HeadcountReservationListPage>> {
		let reservations = Array.from(this.headcountReservations.values()).filter(
			(row) => row.organizationId === input.organizationId,
		);
		if (input.planId !== undefined) {
			reservations = reservations.filter((row) => row.planId === input.planId);
		}
		if (input.requisitionId !== undefined) {
			reservations = reservations.filter(
				(row) => row.requisitionId === input.requisitionId,
			);
		}
		reservations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const totalCount = reservations.length;
		const start = (input.page - 1) * input.pageSize;
		return ok({
			reservations: reservations
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async listHeadcountReservationsByPlanLineId(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		},
	): Promise<Result<HeadcountReservation[]>> {
		return ok(
			reservationsForLine(this, input.organizationId, input.planLineId).map(
				(row) => ({ ...row }),
			),
		);
	},

	async getHeadcountAvailability(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
		},
	): Promise<Result<HeadcountAvailability | null>> {
		const line = this.headcountPlanLines.get(input.planLineId);
		if (!line || line.organizationId !== input.organizationId) {
			return ok(null);
		}
		const reservations = reservationsForLine(
			this,
			input.organizationId,
			input.planLineId,
		);
		const lineAvailability = computeLineAvailability({ line, reservations });
		return ok({
			planId: line.planId,
			planLineId: line.id,
			lines: [lineAvailability],
		});
	},

	async getRecruitmentHeadcountHandoff(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
		},
	): Promise<Result<RecruitmentHeadcountHandoff>> {
		const activeReservation =
			Array.from(this.headcountReservations.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.requisitionId === input.requisitionId &&
					row.status === "active",
			) ?? null;

		if (!activeReservation) {
			return ok({
				organizationId: input.organizationId,
				requisitionId: input.requisitionId,
				approvedPlan: null,
				availability: null,
				activeReservation: null,
			});
		}

		const plan = this.headcountPlans.get(activeReservation.planId) ?? null;
		const line = this.headcountPlanLines.get(activeReservation.planLineId);
		const availability = line
			? computeLineAvailability({
					line,
					reservations: reservationsForLine(
						this,
						input.organizationId,
						line.id,
					),
				})
			: null;

		return ok({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
			approvedPlan: plan ? { ...plan } : null,
			availability,
			activeReservation: { ...activeReservation },
		});
	},

	async getWorkforcePlanVariance(
		this: WorkforcePlanningMemoryHost,
		input: {
			organizationId: string;
			planId: HumanResourcesHeadcountPlanId;
		},
	): Promise<Result<WorkforcePlanVariance>> {
		const lines = linesForPlan(this, input.organizationId, input.planId);
		const varianceLines = lines.map((line) => {
			const availability = computeLineAvailability({
				line,
				reservations: reservationsForLine(this, input.organizationId, line.id),
			});
			const plannedFte = Number(line.plannedFte);
			const consumedFte = Number(availability.consumedFte);
			const varianceHeadcount =
				line.plannedHeadcount - availability.consumedHeadcount;
			return {
				...availability,
				varianceFte: (plannedFte - consumedFte).toFixed(4),
				varianceHeadcount,
			};
		});
		return ok({ planId: input.planId, lines: varianceLines });
	},
} satisfies Partial<HumanResourcesStore>;

export function attachWorkforcePlanningMemoryMethods<
	T extends WorkforcePlanningMemoryHost,
>(target: T): T & typeof workforcePlanningMemoryMethods {
	return Object.assign(target, workforcePlanningMemoryMethods);
}

async function transitionHeadcountReservationStatus(
	this: WorkforcePlanningMemoryHost,
	input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: HeadcountReservationStatus;
		ports: MutationPorts;
		meta: { correlationId: string };
	},
): Promise<Result<HeadcountReservation>> {
	const reservation = this.headcountReservations.get(input.reservationId);
	if (!reservation) return notFound("Headcount reservation not found");
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
	if (!versionCheck.ok) return versionCheck;
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
	this.headcountReservations.set(updated.id, updated);

	const audit = await recordAudit(input.ports, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_headcount_reservation",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		this.headcountReservations.set(updated.id, previous);
		return audit;
	}

	return ok({ ...updated });
}
