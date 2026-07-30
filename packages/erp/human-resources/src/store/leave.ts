import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesLeaveEntitlementId,
	HumanResourcesLeavePolicyId,
	HumanResourcesLeaveRequestId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type { EmploymentStatus } from "../shared/employment-status";
import type {
	DayPortion,
	LeaveAdjustmentKind,
	LeavePolicyAccrualBasis,
	LeavePolicyAccrualFrequency,
	LeavePolicyEntitlementExpiryRule,
	LeavePolicyStatus,
	LeaveRequestStatus,
	LeaveType,
	LeaveUnit,
} from "../shared/leave-status";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type {
	ApprovedLeaveHandoff,
	LeaveAdjustment,
	LeaveBalance,
	LeaveEntitlement,
	LeaveEntitlementListPage,
	LeavePolicy,
	LeavePolicyEligibility,
	LeavePolicyListPage,
	LeaveRequest,
	LeaveRequestListPage,
	LeaveRequestSegment,
	ResolvedLeavePolicy,
	TeamCalendarLeavePage,
} from "../types";

/**
 * Persistence contract for Leave management.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface LeavePolicyCreateRecord {
	accrualBasis: LeavePolicyAccrualBasis;
	accrualFrequency: LeavePolicyAccrualFrequency | null;
	accrualQuantityPerPeriod: string | null;
	allowedEmploymentStatuses: EmploymentStatus[];
	allowSelfApproval: boolean;
	allowsNegativeBalance: boolean;
	allowsPartialDay: boolean;
	carryForwardEnabled: boolean;
	carryForwardMaxQuantity: string | null;
	code: string;
	createdBy: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	entitlementExpiryDays: number | null;
	entitlementExpiryRule: LeavePolicyEntitlementExpiryRule;
	leaveType: LeaveType;
	minTenureDays: number | null;
	name: string;
	organizationId: string;
	paid: boolean;
	sensitive: boolean;
	unit: LeaveUnit;
}

export interface LeaveEntitlementGrantRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	openingQuantity: string;
	organizationId: string;
	periodEnd: string;
	periodStart: string;
	policyId: HumanResourcesLeavePolicyId;
}

export interface IdempotentLeaveEntitlementRecord {
	createRequestFingerprint: string;
	entitlement: LeaveEntitlement;
}

export interface IdempotentLeaveAdjustmentRecord {
	adjustment: LeaveAdjustment;
	createRequestFingerprint: string;
}

export interface LeaveAdjustmentCreateRecord {
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	delta: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	kind: LeaveAdjustmentKind;
	organizationId: string;
	reason: string;
	source: string;
	sourceRequestId: HumanResourcesLeaveRequestId | null;
}

export interface LeaveRequestCreateRecord {
	backdateJustification: string | null;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	endDate: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	isBackdated: boolean;
	organizationId: string;
	policyId: HumanResourcesLeavePolicyId;
	requestedQuantity: string;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	startDate: string;
	unit: LeaveUnit;
}

export interface LeaveRequestAmendRecord {
	actorUserId: string;
	backdateJustification: string | null;
	endDate: string;
	expectedVersion: number;
	isBackdated: boolean;
	organizationId: string;
	requestedQuantity: string;
	requestId: HumanResourcesLeaveRequestId;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	startDate: string;
}

export interface IdempotentLeaveRequestRecord {
	createRequestFingerprint: string;
	request: LeaveRequest;
}

export interface HumanResourcesLeaveStore {
	adjustLeaveEntitlement: (
		record: LeaveAdjustmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveAdjustment>>;

	amendLeaveRequest: (
		record: LeaveRequestAmendRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	approveLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	archiveLeavePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeavePolicy>>;

	cancelApprovedLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	carryForwardLeaveEntitlement: (
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			newPeriodStart: string;
			newPeriodEnd: string;
			carriedQuantity: string;
			createIdempotencyKey: string;
			createRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveEntitlement>>;

	createDraftLeaveRequest: (
		record: LeaveRequestCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	createLeavePolicy: (
		record: LeavePolicyCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeavePolicy>>;

	expireLeaveEntitlement: (
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveEntitlement>>;

	findLeaveAdjustmentByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentLeaveAdjustmentRecord | null>>;

	findLeaveEntitlementByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentLeaveEntitlementRecord | null>>;

	findLeavePolicyByCode: (input: {
		organizationId: string;
		code: string;
		effectiveFrom: string;
	}) => Promise<Result<LeavePolicy | null>>;

	findLeaveRequestByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentLeaveRequestRecord | null>>;

	getApprovedLeaveHandoff: (input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
		correlationId: string;
	}) => Promise<Result<ApprovedLeaveHandoff | null>>;

	getLeaveBalance: (input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}) => Promise<Result<LeaveBalance | null>>;
	// Leave Entitlement
	getLeaveEntitlementById: (input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}) => Promise<Result<LeaveEntitlement | null>>;
	// Leave Policy
	getLeavePolicyById: (input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}) => Promise<Result<LeavePolicy | null>>;

	getLeavePolicyEligibility: (input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}) => Promise<Result<LeavePolicyEligibility | null>>;
	// Leave Request
	getLeaveRequestById: (input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}) => Promise<Result<LeaveRequest | null>>;

	getPrimaryManagerForEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}) => Promise<Result<HumanResourcesEmployeeId | null>>;

	grantLeaveEntitlement: (
		record: LeaveEntitlementGrantRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveEntitlement>>;

	listLeaveEntitlements: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		employmentId?: HumanResourcesEmploymentId | undefined;
		policyId?: HumanResourcesLeavePolicyId | undefined;
	}) => Promise<Result<LeaveEntitlementListPage>>;

	listLeavePolicies: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: LeavePolicyStatus | undefined;
	}) => Promise<Result<LeavePolicyListPage>>;

	listLeaveRequestSegments: (input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}) => Promise<Result<LeaveRequestSegment[]>>;

	listLeaveRequests: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId | undefined;
		status?: LeaveRequestStatus | undefined;
	}) => Promise<Result<LeaveRequestListPage>>;

	listOverlappingLeaveSegments: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		excludeRequestId?: HumanResourcesLeaveRequestId | undefined;
		includeDraft?: boolean | undefined;
	}) => Promise<Result<LeaveRequestSegment[]>>;

	listPendingApprovalLeaveRequests: (input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}) => Promise<Result<LeaveRequestListPage>>;

	listPostedLeaveAdjustments: (input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}) => Promise<Result<LeaveAdjustment[]>>;

	listTeamCalendarLeaveRequests: (input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		rangeStart: string;
		rangeEnd: string;
		page: number;
		pageSize: number;
	}) => Promise<Result<TeamCalendarLeavePage>>;

	publishLeavePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeavePolicy>>;

	rejectLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	resolveApplicableLeavePolicy: (input: {
		organizationId: string;
		policyCode: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOfDate: string;
	}) => Promise<Result<ResolvedLeavePolicy | null>>;

	returnLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	submitLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;

	supersedeLeavePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			code: string;
			name: string;
			leaveType: LeaveType;
			unit: LeaveUnit;
			paid: boolean;
			sensitive: boolean;
			allowsNegativeBalance: boolean;
			allowSelfApproval: boolean;
			allowsPartialDay: boolean;
			accrualBasis: LeavePolicyAccrualBasis;
			accrualFrequency: LeavePolicyAccrualFrequency | null;
			accrualQuantityPerPeriod: string | null;
			carryForwardEnabled: boolean;
			carryForwardMaxQuantity: string | null;
			entitlementExpiryRule: LeavePolicyEntitlementExpiryRule;
			entitlementExpiryDays: number | null;
			effectiveFrom: string;
			effectiveTo: string | null;
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeavePolicy>>;

	updateLeavePolicy: (
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			name?: string | undefined;
			paid?: boolean | undefined;
			sensitive?: boolean | undefined;
			allowsNegativeBalance?: boolean | undefined;
			allowSelfApproval?: boolean | undefined;
			allowsPartialDay?: boolean | undefined;
			accrualBasis?: LeavePolicyAccrualBasis | undefined;
			accrualFrequency?: LeavePolicyAccrualFrequency | null | undefined;
			accrualQuantityPerPeriod?: string | null | undefined;
			carryForwardEnabled?: boolean | undefined;
			carryForwardMaxQuantity?: string | null | undefined;
			entitlementExpiryRule?: LeavePolicyEntitlementExpiryRule | undefined;
			entitlementExpiryDays?: number | null | undefined;
			effectiveTo?: string | null | undefined;
			minTenureDays?: number | null | undefined;
			allowedEmploymentStatuses?: EmploymentStatus[] | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeavePolicy>>;

	withdrawLeaveRequest: (
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<LeaveRequest>>;
}
