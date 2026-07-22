import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesDepartmentId,
	HumanResourcesHeadcountPlanId,
	HumanResourcesHeadcountPlanLineId,
	HumanResourcesHeadcountReservationId,
	HumanResourcesJobId,
	HumanResourcesPositionId,
	HumanResourcesRequisitionId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	HeadcountEmploymentType,
	HeadcountPlanStatus,
} from "../shared/workforce-planning-status";
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

/**
 * Persistence contract for Workforce planning.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type HeadcountPlanCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	planningScopeKey: string;
	periodStart: string;
	periodEnd: string;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentHeadcountPlanRecord = {
	plan: HeadcountPlan;
	createRequestFingerprint: string;
};

export type HeadcountPlanSupersedeRecord = {
	organizationId: string;
	sourcePlanId: HumanResourcesHeadcountPlanId;
	code: string;
	title: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type HeadcountPlanLineCreateRecord = {
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	departmentId: HumanResourcesDepartmentId | null;
	jobId: HumanResourcesJobId | null;
	positionId: HumanResourcesPositionId | null;
	locationCode: string | null;
	employmentType: HeadcountEmploymentType | null;
	plannedFte: string;
	plannedHeadcount: number;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createdBy: string;
};

export type HeadcountReservationCreateRecord = {
	organizationId: string;
	planLineId: HumanResourcesHeadcountPlanLineId;
	requisitionId: HumanResourcesRequisitionId;
	reservedFte: string;
	reservedHeadcount: number;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentHeadcountReservationRecord = {
	reservation: HeadcountReservation;
	createRequestFingerprint: string;
};

export type HumanResourcesWorkforcePlanningStore = {
	// Workforce planning — headcount plan
	findHeadcountPlanByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentHeadcountPlanRecord | null>>;

	getHeadcountPlanById(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<HeadcountPlan | null>>;

	findApprovedHeadcountPlanForScope(input: {
		organizationId: string;
		planningScopeKey: string;
		periodStart: string;
		periodEnd: string;
	}): Promise<Result<HeadcountPlan | null>>;

	createHeadcountPlan(
		record: HeadcountPlanCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	updateHeadcountPlan(
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
	): Promise<Result<HeadcountPlan>>;

	transitionHeadcountPlanStatus(
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
	): Promise<Result<HeadcountPlan>>;

	supersedeHeadcountPlan(
		record: HeadcountPlanSupersedeRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlan>>;

	listHeadcountPlans(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: HeadcountPlanStatus;
		planningScopeKey?: string;
	}): Promise<Result<HeadcountPlanListPage>>;
	// Workforce planning — headcount plan line
	getHeadcountPlanLineById(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountPlanLine | null>>;

	listHeadcountPlanLinesByPlanId(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<HeadcountPlanLine[]>>;

	addHeadcountPlanLine(
		record: HeadcountPlanLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>>;

	updateHeadcountPlanLine(
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			departmentId?: HumanResourcesDepartmentId | null;
			jobId?: HumanResourcesJobId | null;
			positionId?: HumanResourcesPositionId | null;
			locationCode?: string | null;
			employmentType?: HeadcountEmploymentType | null;
			plannedFte?: string;
			plannedHeadcount?: number;
			costEnvelopeAmount?: string | null;
			costEnvelopeCurrencyCode?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountPlanLine>>;

	removeHeadcountPlanLine(
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;
	// Workforce planning — headcount reservation
	findHeadcountReservationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentHeadcountReservationRecord | null>>;

	getHeadcountReservationById(input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
	}): Promise<Result<HeadcountReservation | null>>;

	findActiveHeadcountReservationForRequisition(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<HeadcountReservation | null>>;

	reserveHeadcount(
		record: HeadcountReservationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	releaseHeadcountReservation(
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	consumeHeadcountReservation(
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<HeadcountReservation>>;

	releaseActiveHeadcountReservationsForRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;

	consumeActiveHeadcountReservationForRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<void>>;

	listHeadcountReservations(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		planId?: HumanResourcesHeadcountPlanId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<HeadcountReservationListPage>>;

	listHeadcountReservationsByPlanLineId(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountReservation[]>>;

	getHeadcountAvailability(input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}): Promise<Result<HeadcountAvailability | null>>;

	getRecruitmentHeadcountHandoff(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<RecruitmentHeadcountHandoff>>;

	getWorkforcePlanVariance(input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}): Promise<Result<WorkforcePlanVariance>>;
};
