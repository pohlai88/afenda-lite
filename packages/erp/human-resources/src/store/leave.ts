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
export type LeavePolicyCreateRecord = {
	organizationId: string;
	code: string;
	name: string;
	leaveType: LeaveType;
	unit: LeaveUnit;
	paid: boolean;
	sensitive: boolean;
	allowsNegativeBalance: boolean;
	allowSelfApproval: boolean;
	allowsPartialDay: boolean;
	effectiveFrom: string;
	effectiveTo: string | null;
	minTenureDays: number | null;
	allowedEmploymentStatuses: EmploymentStatus[];
	createdBy: string;
};

export type LeaveEntitlementGrantRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	policyId: HumanResourcesLeavePolicyId;
	periodStart: string;
	periodEnd: string;
	openingQuantity: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentLeaveEntitlementRecord = {
	entitlement: LeaveEntitlement;
	createRequestFingerprint: string;
};

export type IdempotentLeaveAdjustmentRecord = {
	adjustment: LeaveAdjustment;
	createRequestFingerprint: string;
};

export type LeaveAdjustmentCreateRecord = {
	organizationId: string;
	entitlementId: HumanResourcesLeaveEntitlementId;
	sourceRequestId: HumanResourcesLeaveRequestId | null;
	kind: LeaveAdjustmentKind;
	delta: string;
	reason: string;
	source: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type LeaveRequestCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	entitlementId: HumanResourcesLeaveEntitlementId;
	policyId: HumanResourcesLeavePolicyId;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	unit: LeaveUnit;
	isBackdated: boolean;
	backdateJustification: string | null;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type LeaveRequestAmendRecord = {
	organizationId: string;
	requestId: HumanResourcesLeaveRequestId;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	isBackdated: boolean;
	backdateJustification: string | null;
	segments: Array<{
		segmentDate: string;
		quantity: string;
		dayPortion: DayPortion;
	}>;
	expectedVersion: number;
	actorUserId: string;
};

export type IdempotentLeaveRequestRecord = {
	request: LeaveRequest;
	createRequestFingerprint: string;
};

export type HumanResourcesLeaveStore = {
	// Leave Policy
	getLeavePolicyById(input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeavePolicy | null>>;

	getLeavePolicyEligibility(input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeavePolicyEligibility | null>>;

	resolveApplicableLeavePolicy(input: {
		organizationId: string;
		policyCode: string;
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
		asOfDate: string;
	}): Promise<Result<ResolvedLeavePolicy | null>>;

	getPrimaryManagerForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<HumanResourcesEmployeeId | null>>;

	findLeavePolicyByCode(input: {
		organizationId: string;
		code: string;
		effectiveFrom: string;
	}): Promise<Result<LeavePolicy | null>>;

	createLeavePolicy(
		record: LeavePolicyCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeavePolicy>>;

	updateLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			name?: string;
			paid?: boolean;
			sensitive?: boolean;
			allowsNegativeBalance?: boolean;
			allowSelfApproval?: boolean;
			allowsPartialDay?: boolean;
			effectiveTo?: string | null;
			minTenureDays?: number | null;
			allowedEmploymentStatuses?: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeavePolicy>>;

	publishLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeavePolicy>>;

	supersedeLeavePolicy(
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
			effectiveFrom: string;
			effectiveTo: string | null;
			minTenureDays: number | null;
			allowedEmploymentStatuses: EmploymentStatus[];
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeavePolicy>>;

	archiveLeavePolicy(
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeavePolicy>>;

	listLeavePolicies(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: LeavePolicyStatus;
	}): Promise<Result<LeavePolicyListPage>>;
	// Leave Entitlement
	getLeaveEntitlementById(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveEntitlement | null>>;

	findLeaveEntitlementByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLeaveEntitlementRecord | null>>;

	grantLeaveEntitlement(
		record: LeaveEntitlementGrantRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveEntitlement>>;

	carryForwardLeaveEntitlement(
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
	): Promise<Result<LeaveEntitlement>>;

	expireLeaveEntitlement(
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveEntitlement>>;

	findLeaveAdjustmentByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLeaveAdjustmentRecord | null>>;

	adjustLeaveEntitlement(
		record: LeaveAdjustmentCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveAdjustment>>;

	listLeaveEntitlements(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		employmentId?: HumanResourcesEmploymentId;
		policyId?: HumanResourcesLeavePolicyId;
	}): Promise<Result<LeaveEntitlementListPage>>;

	listPostedLeaveAdjustments(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveAdjustment[]>>;

	getLeaveBalance(input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	}): Promise<Result<LeaveBalance | null>>;
	// Leave Request
	getLeaveRequestById(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequest | null>>;

	findLeaveRequestByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentLeaveRequestRecord | null>>;

	listLeaveRequestSegments(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequestSegment[]>>;

	listOverlappingLeaveSegments(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		excludeRequestId?: HumanResourcesLeaveRequestId;
	}): Promise<Result<LeaveRequestSegment[]>>;

	createDraftLeaveRequest(
		record: LeaveRequestCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	amendLeaveRequest(
		record: LeaveRequestAmendRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	submitLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	approveLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	rejectLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	returnLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	withdrawLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	cancelApprovedLeaveRequest(
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<LeaveRequest>>;

	listLeaveRequests(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeId?: HumanResourcesEmployeeId;
		status?: LeaveRequestStatus;
	}): Promise<Result<LeaveRequestListPage>>;

	listPendingApprovalLeaveRequests(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		page: number;
		pageSize: number;
	}): Promise<Result<LeaveRequestListPage>>;

	listTeamCalendarLeaveRequests(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		rangeStart: string;
		rangeEnd: string;
		page: number;
		pageSize: number;
	}): Promise<Result<TeamCalendarLeavePage>>;

	getApprovedLeaveHandoff(input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
		correlationId: string;
	}): Promise<Result<ApprovedLeaveHandoff | null>>;
};
