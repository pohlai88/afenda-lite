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
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
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
export interface HeadcountPlanCreateRecord {
	code: string;
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	planningScopeKey: string;
	title: string;
}

export interface IdempotentHeadcountPlanRecord {
	createRequestFingerprint: string;
	plan: HeadcountPlan;
}

export interface HeadcountPlanSupersedeRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	organizationId: string;
	sourcePlanId: HumanResourcesHeadcountPlanId;
	title: string;
}

export interface HeadcountPlanLineCreateRecord {
	costEnvelopeAmount: string | null;
	costEnvelopeCurrencyCode: string | null;
	createdBy: string;
	departmentId: HumanResourcesDepartmentId | null;
	employmentType: HeadcountEmploymentType | null;
	jobId: HumanResourcesJobId | null;
	locationCode: string | null;
	organizationId: string;
	planId: HumanResourcesHeadcountPlanId;
	plannedFte: string;
	plannedHeadcount: number;
	positionId: HumanResourcesPositionId | null;
}

export interface HeadcountReservationCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	organizationId: string;
	planLineId: HumanResourcesHeadcountPlanLineId;
	requisitionId: HumanResourcesRequisitionId;
	reservedFte: string;
	reservedHeadcount: number;
}

export interface IdempotentHeadcountReservationRecord {
	createRequestFingerprint: string;
	reservation: HeadcountReservation;
}

export interface HumanResourcesWorkforcePlanningStore {
	addHeadcountPlanLine: (
		record: HeadcountPlanLineCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountPlanLine>>;

	consumeActiveHeadcountReservationForRequisition: (
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<void>>;

	consumeHeadcountReservation: (
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountReservation>>;

	createHeadcountPlan: (
		record: HeadcountPlanCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountPlan>>;

	findActiveHeadcountReservationForRequisition: (input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}) => Promise<Result<HeadcountReservation | null>>;

	findApprovedHeadcountPlanForScope: (input: {
		organizationId: string;
		planningScopeKey: string;
		periodStart: string;
		periodEnd: string;
	}) => Promise<Result<HeadcountPlan | null>>;
	// Workforce planning — headcount plan
	findHeadcountPlanByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentHeadcountPlanRecord | null>>;
	// Workforce planning — headcount reservation
	findHeadcountReservationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentHeadcountReservationRecord | null>>;

	getHeadcountAvailability: (input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}) => Promise<Result<HeadcountAvailability | null>>;

	getHeadcountPlanById: (input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}) => Promise<Result<HeadcountPlan | null>>;
	// Workforce planning — headcount plan line
	getHeadcountPlanLineById: (input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}) => Promise<Result<HeadcountPlanLine | null>>;

	getHeadcountReservationById: (input: {
		organizationId: string;
		reservationId: HumanResourcesHeadcountReservationId;
	}) => Promise<Result<HeadcountReservation | null>>;

	getRecruitmentHeadcountHandoff: (input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}) => Promise<Result<RecruitmentHeadcountHandoff>>;

	getWorkforcePlanVariance: (input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
		asOf?: string | undefined;
	}) => Promise<Result<WorkforcePlanVariance>>;

	listHeadcountPlanLinesByPlanId: (input: {
		organizationId: string;
		planId: HumanResourcesHeadcountPlanId;
	}) => Promise<Result<HeadcountPlanLine[]>>;

	listHeadcountPlans: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: HeadcountPlanStatus | undefined;
		planningScopeKey?: string | undefined;
	}) => Promise<Result<HeadcountPlanListPage>>;

	listHeadcountReservations: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		planId?: HumanResourcesHeadcountPlanId | undefined;
		requisitionId?: HumanResourcesRequisitionId | undefined;
	}) => Promise<Result<HeadcountReservationListPage>>;

	listHeadcountReservationsByPlanLineId: (input: {
		organizationId: string;
		planLineId: HumanResourcesHeadcountPlanLineId;
	}) => Promise<Result<HeadcountReservation[]>>;

	releaseActiveHeadcountReservationsForRequisition: (
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<void>>;

	releaseHeadcountReservation: (
		input: {
			organizationId: string;
			reservationId: HumanResourcesHeadcountReservationId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountReservation>>;

	removeHeadcountPlanLine: (
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<void>>;

	reserveHeadcount: (
		record: HeadcountReservationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountReservation>>;

	supersedeHeadcountPlan: (
		record: HeadcountPlanSupersedeRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountPlan>>;

	transitionHeadcountPlanStatus: (
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
	) => Promise<Result<HeadcountPlan>>;

	updateHeadcountPlan: (
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
	) => Promise<Result<HeadcountPlan>>;

	updateHeadcountPlanLine: (
		input: {
			organizationId: string;
			planLineId: HumanResourcesHeadcountPlanLineId;
			departmentId?: HumanResourcesDepartmentId | null | undefined;
			jobId?: HumanResourcesJobId | null | undefined;
			positionId?: HumanResourcesPositionId | null | undefined;
			locationCode?: string | null | undefined;
			employmentType?: HeadcountEmploymentType | null | undefined;
			plannedFte?: string | undefined;
			plannedHeadcount?: number | undefined;
			costEnvelopeAmount?: string | null | undefined;
			costEnvelopeCurrencyCode?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<HeadcountPlanLine>>;
}
