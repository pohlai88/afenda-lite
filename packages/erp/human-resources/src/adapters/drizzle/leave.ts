import { randomUUID } from "node:crypto";
import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	hrLeaveAdjustment,
	hrLeaveEntitlement,
	hrLeavePolicy,
	hrLeavePolicyEligibility,
	hrLeaveRequest,
	hrLeaveRequestSegment,
	inArray,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesLeaveRequestSegmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesLeaveAdjustmentId,
	parseHumanResourcesLeaveApprovalDecisionId,
	parseHumanResourcesLeaveEntitlementId,
	parseHumanResourcesLeavePolicyId,
	parseHumanResourcesLeaveRequestId,
	parseHumanResourcesLeaveRequestSegmentId,
} from "../../brands";
import { planLeaveMutationOutboxEventType } from "../../emissions/sql-side-effects";
import { resolvePublishedLeavePolicyByCodeLineageAsOf } from "../../leave/leave-policy-lineage";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
} from "../../module-ids";
import { getRegistryDomainEventType } from "../../mutation-emission-registry";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	effectiveRangeOverlap,
	invalidState,
	notFound,
} from "../../shared/domain-guards";
import {
	type EmploymentStatus,
	employmentStatusSchema,
} from "../../shared/employment-status";
import {
	computeLeaveBalance,
	negateLeaveQuantity,
} from "../../shared/leave-balance";
import {
	ACTIVE_LEAVE_OVERLAP_STATUSES,
	assertLeaveEntitlementActive,
	assertLeaveEntitlementStatusTransition,
	assertLeavePolicyEditable,
	assertLeaveRequestAmendable,
} from "../../shared/leave-guards";
import { mergeLeavePolicyBalanceRules } from "../../shared/leave-policy-balance-rules";
import {
	dayPortionSchema,
	type LeaveRequestStatus,
	leaveAdjustmentKindSchema,
	leaveAdjustmentStatusSchema,
	leaveEntitlementStatusSchema,
	leavePolicyAccrualBasisSchema,
	leavePolicyAccrualFrequencySchema,
	leavePolicyEntitlementExpiryRuleSchema,
	leavePolicyStatusSchema,
	leaveRequestStatusSchema,
	leaveTypeSchema,
	leaveUnitSchema,
} from "../../shared/leave-status";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import type {
	HumanResourcesStore,
	IdempotentLeaveAdjustmentRecord,
	IdempotentLeaveEntitlementRecord,
	IdempotentLeaveRequestRecord,
} from "../../store";
import type {
	ApprovedLeaveHandoff,
	LeaveAdjustment,
	LeaveBalance,
	LeaveEntitlement,
	LeavePolicy,
	LeavePolicyEligibility,
	LeaveRequest,
	LeaveRequestSegment,
	ReportingLine,
	ResolvedLeavePolicy,
	TeamCalendarLeavePage,
} from "../../types";
import {
	buildAmendLeaveRequestSql,
	buildApproveLeaveRequestSql,
	buildCancelApprovedLeaveRequestSql,
	buildCarryForwardEntitlementSql,
	buildCreateLeaveAdjustmentSql,
	buildCreateLeaveEntitlementSql,
	buildCreateLeavePolicySql,
	buildCreateLeaveRequestSql,
	buildExpireEntitlementSql,
	buildLeaveEmployeeBookingLockSql,
	buildPolicyStatusTransitionSql,
	buildStatusTransitionSql,
	buildSubmitLeaveRequestSql,
} from "./leave-sql-builders";
import {
	type LeavePolicySqlRow,
	type LeaveRequestSqlRow,
	resolveIdempotentCreateReplay,
	runLeaveTransaction,
	validateTransactionInput,
} from "./leave-transactions";

type LeaveRequestOverlapSqlRow = LeaveRequestSqlRow & {
	overlap_detected: boolean;
};

function mapLeaveRequestOverlapRow(
	row: LeaveRequestOverlapSqlRow | undefined,
	failureMessage: string,
): Result<LeaveRequest> {
	if (row === undefined) {
		return notFound(failureMessage);
	}
	if (row.overlap_detected) {
		return effectiveRangeOverlap("Leave request overlaps an existing booking");
	}
	if (row.id === undefined) {
		return notFound(failureMessage);
	}
	return mapLeaveRequest({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		entitlementId: row.entitlement_id,
		policyId: row.policy_id,
		startDate: row.start_date,
		endDate: row.end_date,
		requestedQuantity: row.requested_quantity,
		unit: row.unit,
		status: row.status,
		isBackdated: row.is_backdated,
		backdateJustification: row.backdate_justification,
		approvedAt: row.approved_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export type DrizzleLeaveMethods = Pick<
	HumanResourcesStore,
	| "getLeavePolicyById"
	| "getLeavePolicyEligibility"
	| "resolveApplicableLeavePolicy"
	| "getPrimaryManagerForEmployee"
	| "findLeavePolicyByCode"
	| "createLeavePolicy"
	| "updateLeavePolicy"
	| "publishLeavePolicy"
	| "supersedeLeavePolicy"
	| "archiveLeavePolicy"
	| "listLeavePolicies"
	| "getLeaveEntitlementById"
	| "findLeaveEntitlementByIdempotencyKey"
	| "grantLeaveEntitlement"
	| "carryForwardLeaveEntitlement"
	| "expireLeaveEntitlement"
	| "findLeaveAdjustmentByIdempotencyKey"
	| "adjustLeaveEntitlement"
	| "listLeaveEntitlements"
	| "listPostedLeaveAdjustments"
	| "getLeaveBalance"
	| "getLeaveRequestById"
	| "findLeaveRequestByIdempotencyKey"
	| "listLeaveRequestSegments"
	| "listOverlappingLeaveSegments"
	| "createDraftLeaveRequest"
	| "amendLeaveRequest"
	| "submitLeaveRequest"
	| "approveLeaveRequest"
	| "rejectLeaveRequest"
	| "returnLeaveRequest"
	| "withdrawLeaveRequest"
	| "cancelApprovedLeaveRequest"
	| "listLeaveRequests"
	| "listPendingApprovalLeaveRequests"
	| "listTeamCalendarLeaveRequests"
	| "getApprovedLeaveHandoff"
>;

type LeaveHost = {
	resolvePrimaryManager: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}) => Promise<Result<ReportingLine | null>>;
	getEmploymentById: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<import("../../types").Employment | null>>;
	listDirectReports: (input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}) => Promise<
		Result<{
			reportingLines: ReportingLine[];
			totalCount: number;
			page: number;
			pageSize: number;
		}>
	>;
} & DrizzleLeaveMethods;

function parseEmploymentStatuses(raw: string): Result<EmploymentStatus[]> {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return invalidState("Invalid leave policy eligibility statuses");
		}
		const statuses: EmploymentStatus[] = [];
		for (const item of parsed) {
			const status = employmentStatusSchema.safeParse(item);
			if (!status.success) {
				return invalidState("Invalid leave policy eligibility statuses");
			}
			statuses.push(status.data);
		}
		return errorResult.ok(statuses);
	} catch {
		return invalidState("Invalid leave policy eligibility statuses");
	}
}

function mapLeavePolicy(
	row: typeof hrLeavePolicy.$inferSelect,
): Result<LeavePolicy> {
	const id = parseHumanResourcesLeavePolicyId(row.id);
	if (!id.ok) {
		return id;
	}
	const leaveType = leaveTypeSchema.safeParse(row.leaveType);
	if (!leaveType.success) {
		return invalidState("Invalid leave policy type");
	}
	const unit = leaveUnitSchema.safeParse(row.unit);
	if (!unit.success) {
		return invalidState("Invalid leave policy unit");
	}
	const status = leavePolicyStatusSchema.safeParse(row.status);
	if (!status.success) {
		return invalidState("Invalid leave policy status");
	}
	const accrualBasis = leavePolicyAccrualBasisSchema.safeParse(
		row.accrualBasis,
	);
	if (!accrualBasis.success) {
		return invalidState("Invalid leave policy accrual basis");
	}
	let accrualFrequency: LeavePolicy["accrualFrequency"] = null;
	if (row.accrualFrequency !== null) {
		const parsed = leavePolicyAccrualFrequencySchema.safeParse(
			row.accrualFrequency,
		);
		if (!parsed.success) {
			return invalidState("Invalid leave policy accrual frequency");
		}
		accrualFrequency = parsed.data;
	}
	const entitlementExpiryRule =
		leavePolicyEntitlementExpiryRuleSchema.safeParse(row.entitlementExpiryRule);
	if (!entitlementExpiryRule.success) {
		return invalidState("Invalid leave policy entitlement expiry rule");
	}
	let supersedesPolicyId: LeavePolicy["supersedesPolicyId"] = null;
	if (row.supersedesPolicyId !== null) {
		const parsed = parseHumanResourcesLeavePolicyId(row.supersedesPolicyId);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesPolicyId = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		leaveType: leaveType.data,
		unit: unit.data,
		paid: row.paid,
		sensitive: row.sensitive,
		allowsNegativeBalance: row.allowsNegativeBalance,
		allowSelfApproval: row.allowSelfApproval,
		allowsPartialDay: row.allowsPartialDay,
		accrualBasis: accrualBasis.data,
		accrualFrequency,
		accrualQuantityPerPeriod: row.accrualQuantityPerPeriod,
		carryForwardEnabled: row.carryForwardEnabled,
		carryForwardMaxQuantity: row.carryForwardMaxQuantity,
		entitlementExpiryRule: entitlementExpiryRule.data,
		entitlementExpiryDays: row.entitlementExpiryDays,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: status.data,
		supersedesPolicyId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLeavePolicySqlRow(row: LeavePolicySqlRow): Result<LeavePolicy> {
	return mapLeavePolicy({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		leaveType: row.leave_type,
		unit: row.unit,
		paid: row.paid,
		sensitive: row.sensitive,
		allowsNegativeBalance: row.allows_negative_balance,
		allowSelfApproval: row.allow_self_approval,
		allowsPartialDay: row.allows_partial_day,
		accrualBasis: row.accrual_basis,
		accrualFrequency: row.accrual_frequency,
		accrualQuantityPerPeriod: row.accrual_quantity_per_period,
		carryForwardEnabled: row.carry_forward_enabled,
		carryForwardMaxQuantity: row.carry_forward_max_quantity,
		entitlementExpiryRule: row.entitlement_expiry_rule,
		entitlementExpiryDays: row.entitlement_expiry_days,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		status: row.status,
		supersedesPolicyId: row.supersedes_policy_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapLeavePolicyEligibility(
	row: typeof hrLeavePolicyEligibility.$inferSelect,
): Result<LeavePolicyEligibility> {
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) {
		return policyId;
	}
	const statuses = parseEmploymentStatuses(row.allowedEmploymentStatuses);
	if (!statuses.ok) {
		return statuses;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		policyId: policyId.data,
		minTenureDays: row.minTenureDays,
		allowedEmploymentStatuses: statuses.data,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLeaveEntitlement(
	row: typeof hrLeaveEntitlement.$inferSelect,
): Result<LeaveEntitlement> {
	const id = parseHumanResourcesLeaveEntitlementId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) {
		return policyId;
	}
	const status = leaveEntitlementStatusSchema.safeParse(row.status);
	if (!status.success) {
		return invalidState("Invalid leave entitlement status");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		policyId: policyId.data,
		periodStart: row.periodStart,
		periodEnd: row.periodEnd,
		openingQuantity: row.openingQuantity,
		status: status.data,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLeaveAdjustment(
	row: typeof hrLeaveAdjustment.$inferSelect,
): Result<LeaveAdjustment> {
	const id = parseHumanResourcesLeaveAdjustmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const entitlementId = parseHumanResourcesLeaveEntitlementId(
		row.entitlementId,
	);
	if (!entitlementId.ok) {
		return entitlementId;
	}
	let sourceRequestId: LeaveAdjustment["sourceRequestId"] = null;
	if (row.sourceRequestId !== null) {
		const parsed = parseHumanResourcesLeaveRequestId(row.sourceRequestId);
		if (!parsed.ok) {
			return parsed;
		}
		sourceRequestId = parsed.data;
	}
	const kind = leaveAdjustmentKindSchema.safeParse(row.kind);
	if (!kind.success) {
		return invalidState("Invalid leave adjustment kind");
	}
	const status = leaveAdjustmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return invalidState("Invalid leave adjustment status");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		entitlementId: entitlementId.data,
		sourceRequestId,
		kind: kind.data,
		delta: row.delta,
		reason: row.reason,
		source: row.source,
		status: status.data,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLeaveRequest(
	row: typeof hrLeaveRequest.$inferSelect,
): Result<LeaveRequest> {
	const id = parseHumanResourcesLeaveRequestId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const entitlementId = parseHumanResourcesLeaveEntitlementId(
		row.entitlementId,
	);
	if (!entitlementId.ok) {
		return entitlementId;
	}
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) {
		return policyId;
	}
	const unit = leaveUnitSchema.safeParse(row.unit);
	if (!unit.success) {
		return invalidState("Invalid leave request unit");
	}
	const status = leaveRequestStatusSchema.safeParse(row.status);
	if (!status.success) {
		return invalidState("Invalid leave request status");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		entitlementId: entitlementId.data,
		policyId: policyId.data,
		startDate: row.startDate,
		endDate: row.endDate,
		requestedQuantity: row.requestedQuantity,
		unit: unit.data,
		status: status.data,
		isBackdated: row.isBackdated,
		backdateJustification: row.backdateJustification,
		approvedAt: row.approvedAt,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapLeaveRequestSegment(
	row: typeof hrLeaveRequestSegment.$inferSelect,
): Result<LeaveRequestSegment> {
	const id = parseHumanResourcesLeaveRequestSegmentId(row.id);
	if (!id.ok) {
		return id;
	}
	const requestId = parseHumanResourcesLeaveRequestId(row.requestId);
	if (!requestId.ok) {
		return requestId;
	}
	const dayPortion = dayPortionSchema.safeParse(row.dayPortion);
	if (!dayPortion.success) {
		return invalidState("Invalid leave segment day portion");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		requestId: requestId.data,
		segmentDate: row.segmentDate,
		quantity: row.quantity,
		dayPortion: dayPortion.data,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function activeLeaveOverlapStatuses(): LeaveRequestStatus[] {
	return [...ACTIVE_LEAVE_OVERLAP_STATUSES];
}

export const drizzleLeaveMethods: DrizzleLeaveMethods = {
	async getLeavePolicyById(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeavePolicy)
				.where(
					and(
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.id, input.policyId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapLeavePolicy(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave policy");
		}
	},

	async getLeavePolicyEligibility(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeavePolicyEligibility)
				.where(
					and(
						eq(hrLeavePolicyEligibility.organizationId, input.organizationId),
						eq(hrLeavePolicyEligibility.policyId, input.policyId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapLeavePolicyEligibility(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load leave policy eligibility",
			);
		}
	},

	async resolveApplicableLeavePolicy(input) {
		const host = this as LeaveHost;
		const employment = await host.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: input.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return errorResult.ok(null);
		}
		if (employment.data.employeeId !== input.employeeId) {
			return errorResult.ok(null);
		}

		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeavePolicy)
				.where(
					and(
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.code, input.policyCode),
						inArray(hrLeavePolicy.status, ["published", "superseded"]),
					),
				);
			const policies: LeavePolicy[] = [];
			for (const row of rows) {
				const mapped = mapLeavePolicy(row);
				if (!mapped.ok) {
					return mapped;
				}
				policies.push(mapped.data);
			}
			const policy = resolvePublishedLeavePolicyByCodeLineageAsOf({
				policies,
				code: input.policyCode,
				asOf: input.asOfDate,
			});
			if (policy === null) {
				return errorResult.ok(null);
			}

			const eligibility = await this.getLeavePolicyEligibility({
				organizationId: input.organizationId,
				policyId: policy.id,
			});
			if (!eligibility.ok) {
				return eligibility;
			}
			if (eligibility.data === null) {
				return errorResult.ok(null);
			}

			const tenureDays = Math.floor(
				(Date.parse(`${input.asOfDate}T00:00:00.000Z`) -
					Date.parse(`${employment.data.startsOn}T00:00:00.000Z`)) /
					(1000 * 60 * 60 * 24),
			);
			if (
				!eligibility.data.allowedEmploymentStatuses.includes(
					employment.data.status,
				)
			) {
				return errorResult.ok(null);
			}
			if (
				eligibility.data.minTenureDays !== null &&
				tenureDays < eligibility.data.minTenureDays
			) {
				return errorResult.ok(null);
			}

			const resolved: ResolvedLeavePolicy = {
				policy,
				eligibility: eligibility.data,
			};
			return errorResult.ok(resolved);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve applicable leave policy",
			);
		}
	},

	async getPrimaryManagerForEmployee(input) {
		const host = this as LeaveHost;
		const primary = await host.resolvePrimaryManager({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			asOf: input.asOf,
		});
		if (!primary.ok) {
			return primary;
		}
		return errorResult.ok(primary.data?.managerEmployeeId ?? null);
	},

	async findLeavePolicyByCode(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeavePolicy)
				.where(
					and(
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.code, input.code),
						eq(hrLeavePolicy.effectiveFrom, input.effectiveFrom),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapLeavePolicy(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find leave policy by code",
			);
		}
	},

	async createLeavePolicy(record, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: record.organizationId,
			correlationId: meta.correlationId,
			actorUserId: record.createdBy,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const duplicate = await this.findLeavePolicyByCode({
			organizationId: record.organizationId,
			code: record.code,
			effectiveFrom: record.effectiveFrom,
		});
		if (!duplicate.ok) {
			return duplicate;
		}
		if (duplicate.data !== null) {
			return conflict("Leave policy code already exists for effective date");
		}

		const policyId = parseHumanResourcesLeavePolicyId(randomUUID());
		if (!policyId.ok) {
			return policyId;
		}
		const eligibilityId = randomUUID();

		try {
			const sqlValue15 = buildCreateLeavePolicySql({
				policyId: policyId.data,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				leaveType: record.leaveType,
				unit: record.unit,
				paid: record.paid,
				sensitive: record.sensitive,
				allowsNegativeBalance: record.allowsNegativeBalance,
				allowSelfApproval: record.allowSelfApproval,
				allowsPartialDay: record.allowsPartialDay,
				accrualBasis: record.accrualBasis,
				accrualFrequency: record.accrualFrequency,
				accrualQuantityPerPeriod: record.accrualQuantityPerPeriod,
				carryForwardEnabled: record.carryForwardEnabled,
				carryForwardMaxQuantity: record.carryForwardMaxQuantity,
				entitlementExpiryRule: record.entitlementExpiryRule,
				entitlementExpiryDays: record.entitlementExpiryDays,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				createdBy: record.createdBy,
				correlationId: meta.correlationId,
				eligibilityId,
				minTenureDays: record.minTenureDays,
				allowedEmploymentStatuses: record.allowedEmploymentStatuses,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue15),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave policy creation failed");
			}

			return mapLeavePolicySqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Leave policy code already exists for effective date");
			}
			return mapPersistenceFailure(error, "Failed to create leave policy");
		}
	},

	async updateLeavePolicy(input, _ports, meta) {
		const existing = await this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: input.policyId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Leave policy not found");
		}
		const currentPolicy = existing.data;
		const versionCheck = assertExpectedVersion(
			currentPolicy.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const editable = assertLeavePolicyEditable(currentPolicy.status);
		if (!editable.ok) {
			return editable;
		}

		const balanceRules = mergeLeavePolicyBalanceRules(currentPolicy, input);
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			module: "human-resources",
			entity: "hr_leave_policy",
			entityId: input.policyId,
			action: "UPDATE",
			oldValue: { version: currentPolicy.version },
			newValue: { version: nextVersion },
			eventContext: {
				version: nextVersion,
				outcome: "SUCCEEDED",
				source: "human-resources.leave-drizzle",
				causationId:
					meta.causationId ?? meta.idempotencyKey ?? meta.correlationId,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const updateEligibility =
			input.minTenureDays !== undefined ||
			input.allowedEmploymentStatuses !== undefined;
		const minTenureDays = input.minTenureDays ?? null;
		const allowedEmploymentStatuses =
			input.allowedEmploymentStatuses === undefined
				? null
				: JSON.stringify(input.allowedEmploymentStatuses);
		try {
			const [updatedRows] = await runLeaveTransaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_leave_policy SET
							name = ${input.name ?? currentPolicy.name},
							paid = ${input.paid ?? currentPolicy.paid},
							sensitive = ${input.sensitive ?? currentPolicy.sensitive},
							allows_negative_balance = ${input.allowsNegativeBalance ?? currentPolicy.allowsNegativeBalance},
							allow_self_approval = ${input.allowSelfApproval ?? currentPolicy.allowSelfApproval},
							allows_partial_day = ${input.allowsPartialDay ?? currentPolicy.allowsPartialDay},
							accrual_basis = ${balanceRules.accrualBasis},
							accrual_frequency = ${balanceRules.accrualFrequency},
							accrual_quantity_per_period = ${balanceRules.accrualQuantityPerPeriod},
							carry_forward_enabled = ${balanceRules.carryForwardEnabled},
							carry_forward_max_quantity = ${balanceRules.carryForwardMaxQuantity},
							entitlement_expiry_rule = ${balanceRules.entitlementExpiryRule},
							entitlement_expiry_days = ${balanceRules.entitlementExpiryDays},
							effective_to = ${input.effectiveTo === undefined ? currentPolicy.effectiveTo : input.effectiveTo},
							version = ${nextVersion}, updated_by = ${input.actorUserId}, updated_at = NOW()
						WHERE id = ${input.policyId} AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion} AND status = 'draft'
						RETURNING id
					),
					eligibility_updated AS (
						UPDATE hr_leave_policy_eligibility SET
							min_tenure_days = CASE WHEN ${updateEligibility && input.minTenureDays !== undefined} THEN ${minTenureDays} ELSE min_tenure_days END,
							allowed_employment_statuses = CASE WHEN ${updateEligibility && input.allowedEmploymentStatuses !== undefined} THEN ${allowedEmploymentStatuses} ELSE allowed_employment_statuses END,
							updated_by = ${input.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${input.organizationId} AND policy_id IN (SELECT id FROM mutated)
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId},
							${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
							${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
							${audit.ipAddress}, ${audit.userAgent}
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
				`,
			]);
			if (updatedRows.length === 0) {
				return notFound("Leave policy not found or stale version");
			}
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update leave policy");
		}

		return this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: input.policyId,
		}).then((result) => {
			if (!result.ok) {
				return result;
			}
			if (result.data === null) {
				return notFound("Leave policy not found");
			}
			return errorResult.ok(result.data);
		});
	},

	async publishLeavePolicy(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		try {
			const sqlValue14 = buildPolicyStatusTransitionSql({
				policyId: input.policyId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				nextStatus: "published",
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue14),
			]);

			const [row] = rows;
			if (row === undefined || row === null) {
				return notFound("Leave policy publication failed");
			}

			return mapLeavePolicySqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to publish leave policy");
		}
	},

	async archiveLeavePolicy(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		try {
			const sqlValue13 = buildPolicyStatusTransitionSql({
				policyId: input.policyId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				nextStatus: "archived",
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue13),
			]);

			const [row] = rows;
			if (row === undefined || row === null) {
				return notFound("Leave policy archival failed");
			}

			return mapLeavePolicySqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive leave policy");
		}
	},

	async supersedeLeavePolicy(input, _ports, meta) {
		const current = await this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: input.policyId,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return notFound("Leave policy not found");
		}
		const versionCheck = assertExpectedVersion(
			current.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (current.data.status !== "published") {
			return invalidState("Only published leave policies can be superseded");
		}

		const successorId = parseHumanResourcesLeavePolicyId(randomUUID());
		if (!successorId.ok) {
			return successorId;
		}
		const eligibilityId = randomUUID();
		const transitionSql = buildPolicyStatusTransitionSql({
			policyId: input.policyId,
			organizationId: input.organizationId,
			expectedVersion: input.expectedVersion,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			nextStatus: "superseded",
		});
		const successorSql = buildCreateLeavePolicySql({
			policyId: successorId.data,
			organizationId: input.organizationId,
			code: input.code,
			name: input.name,
			leaveType: input.leaveType,
			unit: input.unit,
			paid: input.paid,
			sensitive: input.sensitive,
			allowsNegativeBalance: input.allowsNegativeBalance,
			allowSelfApproval: input.allowSelfApproval,
			allowsPartialDay: input.allowsPartialDay,
			accrualBasis: input.accrualBasis,
			accrualFrequency: input.accrualFrequency,
			accrualQuantityPerPeriod: input.accrualQuantityPerPeriod,
			carryForwardEnabled: input.carryForwardEnabled,
			carryForwardMaxQuantity: input.carryForwardMaxQuantity,
			entitlementExpiryRule: input.entitlementExpiryRule,
			entitlementExpiryDays: input.entitlementExpiryDays,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: input.effectiveTo,
			createdBy: input.actorUserId,
			correlationId: meta.correlationId,
			eligibilityId,
			minTenureDays: input.minTenureDays,
			allowedEmploymentStatuses: input.allowedEmploymentStatuses,
			status: "published",
			supersedesPolicyId: input.policyId,
			version: 2,
		});

		try {
			const [, successorRows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(transitionSql),
				sqlClient.query(successorSql),
			]);
			const [successor] = successorRows;
			if (successor === undefined) {
				return notFound("Superseding leave policy creation failed");
			}
			return mapLeavePolicySqlRow(successor);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Leave policy code already exists for effective date");
			}
			return mapPersistenceFailure(error, "Failed to supersede leave policy");
		}
	},

	async listLeavePolicies(input) {
		try {
			let rows = await afendaDatabase.client
				.select()
				.from(hrLeavePolicy)
				.where(eq(hrLeavePolicy.organizationId, input.organizationId));
			if (input.status !== undefined) {
				rows = rows.filter((row) => row.status === input.status);
			}
			rows.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const policies: LeavePolicy[] = [];
			for (const row of paged) {
				const mapped = mapLeavePolicy(row);
				if (!mapped.ok) {
					return mapped;
				}
				policies.push(mapped.data);
			}
			return errorResult.ok({
				policies,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list leave policies");
		}
	},

	async getLeaveEntitlementById(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveEntitlement)
				.where(
					and(
						eq(hrLeaveEntitlement.organizationId, input.organizationId),
						eq(hrLeaveEntitlement.id, input.entitlementId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapLeaveEntitlement(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave entitlement");
		}
	},

	async findLeaveEntitlementByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveEntitlement)
				.where(
					and(
						eq(hrLeaveEntitlement.organizationId, input.organizationId),
						eq(hrLeaveEntitlement.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const entitlement = mapLeaveEntitlement(row);
			if (!entitlement.ok) {
				return entitlement;
			}
			return errorResult.ok({
				entitlement: entitlement.data,
				createRequestFingerprint: row.createRequestFingerprint,
			} satisfies IdempotentLeaveEntitlementRecord);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find leave entitlement by idempotency key",
			);
		}
	},

	async grantLeaveEntitlement(record, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: record.organizationId,
			correlationId: meta.correlationId,
			actorUserId: record.createdBy,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const policy = await this.getLeavePolicyById({
			organizationId: record.organizationId,
			policyId: record.policyId,
		});
		if (!policy.ok) {
			return policy;
		}
		if (policy.data === null) {
			return notFound("Leave policy not found");
		}
		if (policy.data.status !== "published") {
			return invalidState("Leave policy must be published");
		}

		const entitlementId = parseHumanResourcesLeaveEntitlementId(randomUUID());
		if (!entitlementId.ok) {
			return entitlementId;
		}

		try {
			const sqlValue12 = buildCreateLeaveEntitlementSql({
				entitlementId: entitlementId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				policyId: record.policyId,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				openingQuantity: record.openingQuantity,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				createdBy: record.createdBy,
				correlationId: meta.correlationId,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue12),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave entitlement creation failed");
			}

			return mapLeaveEntitlement({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				policyId: row.policy_id,
				periodStart: row.period_start,
				periodEnd: row.period_end,
				openingQuantity: row.opening_quantity,
				status: row.status,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findLeaveEntitlementByIdempotencyKey({
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
						return errorResult.ok(replay.data.entitlement);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to grant leave entitlement");
		}
	},

	async carryForwardLeaveEntitlement(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const source = await this.getLeaveEntitlementById({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!source.ok) {
			return source;
		}
		if (source.data === null) {
			return notFound("Leave entitlement not found");
		}

		const transition = assertLeaveEntitlementStatusTransition(
			source.data.status,
			"carried_forward",
		);
		if (!transition.ok) {
			return transition;
		}

		const versionCheck = assertExpectedVersion(
			source.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		// Generate IDs for transaction components
		const newEntitlementId = parseHumanResourcesLeaveEntitlementId(
			randomUUID(),
		);
		if (!newEntitlementId.ok) {
			return newEntitlementId;
		}

		const sourceCarryOutAdjustmentId = parseHumanResourcesLeaveAdjustmentId(
			randomUUID(),
		);
		if (!sourceCarryOutAdjustmentId.ok) {
			return sourceCarryOutAdjustmentId;
		}

		const carryEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: newEntitlementId.data,
			audit: {
				entity: "hr_leave_entitlement",
				entityId: newEntitlementId.data,
				action: "CREATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			),
			eventEntityId: input.entitlementId,
			eventEntityType: "hr_leave_entitlement",
		});
		if (carryEventType === undefined) {
			return invalidState("Carry-forward adjustment requires a domain event");
		}

		try {
			const sqlValue11 = buildCarryForwardEntitlementSql({
				sourceEntitlementId: input.entitlementId,
				newEntitlementId: newEntitlementId.data,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				newPeriodStart: input.newPeriodStart,
				newPeriodEnd: input.newPeriodEnd,
				carriedQuantity: input.carriedQuantity,
				sourceCarryOutDelta: negateLeaveQuantity(input.carriedQuantity),
				createIdempotencyKey: input.createIdempotencyKey,
				createRequestFingerprint: input.createRequestFingerprint,
				sourceCarryOutAdjustmentId: sourceCarryOutAdjustmentId.data,
				eventType: carryEventType,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue11),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Carry forward operation failed");
			}

			return mapLeaveEntitlement({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				policyId: row.policy_id,
				periodStart: row.period_start,
				periodEnd: row.period_end,
				openingQuantity: row.opening_quantity,
				status: row.status,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to carry forward leave entitlement",
			);
		}
	},

	async expireLeaveEntitlement(input, _ports, meta) {
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		const existing = await this.getLeaveEntitlementById({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Leave entitlement not found");
		}

		const expiryAdjustmentId = parseHumanResourcesLeaveAdjustmentId(
			randomUUID(),
		);
		if (!expiryAdjustmentId.ok) {
			return expiryAdjustmentId;
		}

		const expiryEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.entitlementId,
			audit: {
				entity: "hr_leave_entitlement",
				entityId: input.entitlementId,
				action: "UPDATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			),
			eventEntityId: input.entitlementId,
			eventEntityType: "hr_leave_entitlement",
		});

		try {
			const sqlValue10 = buildExpireEntitlementSql({
				entitlementId: input.entitlementId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				expiryAdjustmentId: expiryAdjustmentId.data,
				createRequestFingerprint: existing.data.fingerprint,
				...(expiryEventType === undefined
					? {}
					: { eventType: expiryEventType }),
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue10),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave entitlement expiry failed");
			}

			return mapLeaveEntitlement({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				policyId: row.policy_id,
				periodStart: row.period_start,
				periodEnd: row.period_end,
				openingQuantity: row.opening_quantity,
				status: row.status,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to expire leave entitlement");
		}
	},

	async findLeaveAdjustmentByIdempotencyKey(
		input,
	): Promise<Result<IdempotentLeaveAdjustmentRecord | null>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveAdjustment)
				.where(
					and(
						eq(hrLeaveAdjustment.organizationId, input.organizationId),
						eq(hrLeaveAdjustment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const adjustment = mapLeaveAdjustment(row);
			if (!adjustment.ok) {
				return adjustment;
			}
			return errorResult.ok({
				adjustment: adjustment.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find leave adjustment by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async adjustLeaveEntitlement(record, _ports, meta) {
		const replay = await this.findLeaveAdjustmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			if (
				replay.data.createRequestFingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok(replay.data.adjustment);
			}
			return conflict("Idempotency key already used with different data");
		}
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: record.organizationId,
			correlationId: meta.correlationId,
			actorUserId: record.createdBy,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const entitlement = await this.getLeaveEntitlementById({
			organizationId: record.organizationId,
			entitlementId: record.entitlementId,
		});
		if (!entitlement.ok) {
			return entitlement;
		}
		if (entitlement.data === null) {
			return notFound("Leave entitlement not found");
		}
		const active = assertLeaveEntitlementActive(entitlement.data.status);
		if (!active.ok) {
			return active;
		}

		const adjustmentId = parseHumanResourcesLeaveAdjustmentId(randomUUID());
		if (!adjustmentId.ok) {
			return adjustmentId;
		}

		// Determine if this adjustment type should emit an outbox event
		const shouldEmitEvent =
			record.kind === "manual" ||
			record.kind === "accrual" ||
			record.kind === "carry_forward" ||
			record.kind === "expiry";

		const plannedEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
			meta,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			aggregateId: record.entitlementId,
			audit: {
				entity: "hr_leave_adjustment",
				entityId: adjustmentId.data,
				action: "CREATE",
				changes: [],
			},
			...(shouldEmitEvent
				? {
						eventType: getRegistryDomainEventType(
							HUMAN_RESOURCES_COMMAND_LEAVE_ENTITLEMENT_ADJUST,
						),
					}
				: {}),
			eventEntityId: record.entitlementId,
			eventEntityType: "hr_leave_entitlement",
			conditionalEventSuppressed: !shouldEmitEvent,
		});

		try {
			const sqlValue9 = buildCreateLeaveAdjustmentSql({
				adjustmentId: adjustmentId.data,
				organizationId: record.organizationId,
				entitlementId: record.entitlementId,
				sourceRequestId: record.sourceRequestId,
				kind: record.kind,
				delta: record.delta,
				reason: record.reason,
				source: record.source,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				createdBy: record.createdBy,
				correlationId: meta.correlationId,
				...(plannedEventType === undefined
					? {}
					: { eventType: plannedEventType }),
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue9),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave adjustment creation failed");
			}

			return mapLeaveAdjustment({
				id: row.id,
				organizationId: row.organization_id,
				entitlementId: row.entitlement_id,
				sourceRequestId: row.source_request_id,
				kind: row.kind,
				delta: row.delta,
				reason: row.reason,
				source: row.source,
				status: row.status,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replayValue = await this.findLeaveAdjustmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replayValue.ok) {
					return replayValue;
				}
				if (replayValue.data !== null) {
					if (
						replayValue.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return errorResult.ok(replayValue.data.adjustment);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to adjust leave entitlement");
		}
	},

	async listLeaveEntitlements(input) {
		try {
			let rows = await afendaDatabase.client
				.select()
				.from(hrLeaveEntitlement)
				.where(eq(hrLeaveEntitlement.organizationId, input.organizationId));
			if (input.employeeId !== undefined) {
				rows = rows.filter((row) => row.employeeId === input.employeeId);
			}
			if (input.employmentId !== undefined) {
				rows = rows.filter((row) => row.employmentId === input.employmentId);
			}
			if (input.policyId !== undefined) {
				rows = rows.filter((row) => row.policyId === input.policyId);
			}
			rows.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const entitlements: LeaveEntitlement[] = [];
			for (const row of paged) {
				const mapped = mapLeaveEntitlement(row);
				if (!mapped.ok) {
					return mapped;
				}
				entitlements.push(mapped.data);
			}
			return errorResult.ok({
				entitlements,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list leave entitlements");
		}
	},

	async listPostedLeaveAdjustments(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveAdjustment)
				.where(
					and(
						eq(hrLeaveAdjustment.organizationId, input.organizationId),
						eq(hrLeaveAdjustment.entitlementId, input.entitlementId),
						eq(hrLeaveAdjustment.status, "posted"),
					),
				);
			const adjustments: LeaveAdjustment[] = [];
			for (const row of rows) {
				const mapped = mapLeaveAdjustment(row);
				if (!mapped.ok) {
					return mapped;
				}
				adjustments.push(mapped.data);
			}
			return errorResult.ok(adjustments);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list leave adjustments");
		}
	},

	async getLeaveBalance(input) {
		const entitlement = await this.getLeaveEntitlementById(input);
		if (!entitlement.ok) {
			return entitlement;
		}
		if (entitlement.data === null) {
			return errorResult.ok(null);
		}

		const policy = await this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: entitlement.data.policyId,
		});
		if (!policy.ok) {
			return policy;
		}

		const adjustments = await this.listPostedLeaveAdjustments({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!adjustments.ok) {
			return adjustments;
		}

		const balance: LeaveBalance = {
			entitlementId: entitlement.data.id,
			employeeId: entitlement.data.employeeId,
			policyId: entitlement.data.policyId,
			unit: policy.data?.unit ?? "days",
			openingQuantity: entitlement.data.openingQuantity,
			balance: computeLeaveBalance(
				entitlement.data.openingQuantity,
				adjustments.data,
			),
		};
		return errorResult.ok(balance);
	},

	async getLeaveRequestById(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.id, input.requestId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapLeaveRequest(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave request");
		}
	},

	async findLeaveRequestByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const request = mapLeaveRequest(row);
			if (!request.ok) {
				return request;
			}
			return errorResult.ok({
				request: request.data,
				createRequestFingerprint: row.createRequestFingerprint,
			} satisfies IdempotentLeaveRequestRecord);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find leave request by idempotency key",
			);
		}
	},

	async listLeaveRequestSegments(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequestSegment)
				.where(
					and(
						eq(hrLeaveRequestSegment.organizationId, input.organizationId),
						eq(hrLeaveRequestSegment.requestId, input.requestId),
					),
				);
			rows.sort((a, b) => a.segmentDate.localeCompare(b.segmentDate));
			const segments: LeaveRequestSegment[] = [];
			for (const row of rows) {
				const mapped = mapLeaveRequestSegment(row);
				if (!mapped.ok) {
					return mapped;
				}
				segments.push(mapped.data);
			}
			return errorResult.ok(segments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list leave request segments",
			);
		}
	},

	async listOverlappingLeaveSegments(input) {
		try {
			let requests = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.employeeId, input.employeeId),
					),
				);
			requests = requests.filter(
				(row) =>
					activeLeaveOverlapStatuses().includes(
						row.status as LeaveRequestStatus,
					) &&
					(input.includeDraft !== false || row.status !== "draft") &&
					row.id !== input.excludeRequestId,
			);
			if (requests.length === 0) {
				return errorResult.ok([]);
			}
			const requestIds = requests.map((row) => row.id);
			const rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequestSegment)
				.where(
					and(
						eq(hrLeaveRequestSegment.organizationId, input.organizationId),
						inArray(hrLeaveRequestSegment.requestId, requestIds),
					),
				);
			const segments: LeaveRequestSegment[] = [];
			for (const row of rows) {
				const mapped = mapLeaveRequestSegment(row);
				if (!mapped.ok) {
					return mapped;
				}
				segments.push(mapped.data);
			}
			return errorResult.ok(segments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list overlapping leave segments",
			);
		}
	},

	async createDraftLeaveRequest(record, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: record.organizationId,
			correlationId: meta.correlationId,
			actorUserId: record.createdBy,
		});
		if (!validation.ok) {
			return validation;
		}

		const requestId = parseHumanResourcesLeaveRequestId(randomUUID());
		if (!requestId.ok) {
			return requestId;
		}

		// Generate segment IDs
		const segments: Array<{
			id: HumanResourcesLeaveRequestSegmentId;
			segmentDate: string;
			quantity: string;
			dayPortion: "morning" | "afternoon" | "full";
		}> = [];
		for (const segment of record.segments) {
			const segmentId = parseHumanResourcesLeaveRequestSegmentId(randomUUID());
			if (!segmentId.ok) {
				return segmentId;
			}
			segments.push({
				id: segmentId.data,
				segmentDate: segment.segmentDate,
				quantity: segment.quantity,
				dayPortion: segment.dayPortion,
			});
		}

		try {
			const sqlValue8 = buildCreateLeaveRequestSql({
				requestId: requestId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				entitlementId: record.entitlementId,
				policyId: record.policyId,
				startDate: record.startDate,
				endDate: record.endDate,
				requestedQuantity: record.requestedQuantity,
				unit: record.unit,
				isBackdated: record.isBackdated,
				backdateJustification: record.backdateJustification,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				createdBy: record.createdBy,
				correlationId: meta.correlationId,
				segments,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue8),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave request creation failed");
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return resolveIdempotentCreateReplay({
					expectedFingerprint: record.createRequestFingerprint,
					find: async () => {
						const replay = await this.findLeaveRequestByIdempotencyKey({
							organizationId: record.organizationId,
							idempotencyKey: record.createIdempotencyKey,
						});
						if (!replay.ok) {
							return replay;
						}
						if (replay.data === null) {
							return errorResult.ok(null);
						}
						return errorResult.ok({
							fingerprint: replay.data.createRequestFingerprint,
							value: replay.data.request,
						});
					},
				});
			}
			return mapPersistenceFailure(error, "Failed to create leave request");
		}
	},

	async amendLeaveRequest(record, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: record.organizationId,
			correlationId: meta.correlationId,
			actorUserId: record.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const existing = await this.getLeaveRequestById({
			organizationId: record.organizationId,
			requestId: record.requestId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Leave request not found");
		}

		const versionCheck = assertExpectedVersion(
			existing.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const amendable = assertLeaveRequestAmendable(existing.data.status);
		if (!amendable.ok) {
			return amendable;
		}

		// Generate segment IDs
		const segments: Array<{
			id: HumanResourcesLeaveRequestSegmentId;
			segmentDate: string;
			quantity: string;
			dayPortion: "morning" | "afternoon" | "full";
		}> = [];
		for (const segment of record.segments) {
			const segmentId = parseHumanResourcesLeaveRequestSegmentId(randomUUID());
			if (!segmentId.ok) {
				return segmentId;
			}
			segments.push({
				id: segmentId.data,
				segmentDate: segment.segmentDate,
				quantity: segment.quantity,
				dayPortion: segment.dayPortion,
			});
		}

		try {
			const sqlValue7 = buildAmendLeaveRequestSql({
				requestId: record.requestId,
				organizationId: record.organizationId,
				expectedVersion: record.expectedVersion,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				startDate: record.startDate,
				endDate: record.endDate,
				requestedQuantity: record.requestedQuantity,
				isBackdated: record.isBackdated,
				backdateJustification: record.backdateJustification,
				segments,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue7),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave request amendment failed");
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend leave request");
		}
	},

	async submitLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		const submitEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.requestId,
			audit: {
				entity: "hr_leave_request",
				action: "UPDATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
			),
			eventEntityId: input.requestId,
			eventEntityType: "hr_leave_request",
		});

		try {
			const bookingLockSql = buildLeaveEmployeeBookingLockSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
			});
			const sqlValue6 = buildSubmitLeaveRequestSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				eventType: submitEventType,
			});

			const [, rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(bookingLockSql),
				sqlClient.query(sqlValue6),
			]);

			return mapLeaveRequestOverlapRow(
				rows[0],
				"Leave request submission failed",
			);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to submit leave request");
		}
	},

	async approveLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const request = await this.getLeaveRequestById({
			organizationId: input.organizationId,
			requestId: input.requestId,
		});
		if (!request.ok) {
			return request;
		}
		if (request.data === null) {
			return notFound("Leave request not found");
		}

		// Generate IDs for transaction components
		const consumptionAdjustmentId = parseHumanResourcesLeaveAdjustmentId(
			randomUUID(),
		);
		if (!consumptionAdjustmentId.ok) {
			return consumptionAdjustmentId;
		}

		const decisionId = parseHumanResourcesLeaveApprovalDecisionId(randomUUID());
		if (!decisionId.ok) {
			return decisionId;
		}

		const approveEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.requestId,
			audit: {
				entity: "hr_leave_request",
				action: "UPDATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
			),
			eventEntityId: input.requestId,
			eventEntityType: "hr_leave_request",
		});
		if (approveEventType === undefined) {
			return invalidState("Leave request approval requires a domain event");
		}

		try {
			const bookingLockSql = buildLeaveEmployeeBookingLockSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
			});
			const sqlValue5 = buildApproveLeaveRequestSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				note: input.note,
				consumptionAdjustmentId: consumptionAdjustmentId.data,
				decisionId: decisionId.data,
				createRequestFingerprint: request.data.fingerprint,
				eventType: approveEventType,
			});

			const [, rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(bookingLockSql),
				sqlClient.query(sqlValue5),
			]);

			return mapLeaveRequestOverlapRow(
				rows[0],
				"Leave request approval failed - insufficient balance or stale version",
			);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to approve leave request");
		}
	},

	async rejectLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Generate decision ID
		const decisionId = parseHumanResourcesLeaveApprovalDecisionId(randomUUID());
		if (!decisionId.ok) {
			return decisionId;
		}

		const rejectEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.requestId,
			audit: {
				entity: "hr_leave_request",
				action: "UPDATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
			),
			eventEntityId: input.requestId,
			eventEntityType: "hr_leave_request",
		});

		try {
			const sqlValue4 = buildStatusTransitionSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				nextStatus: "rejected",
				decision: "rejected",
				decisionId: decisionId.data,
				note: input.note,
				eventType: rejectEventType,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue4),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave request rejection failed");
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to reject leave request");
		}
	},

	async returnLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Generate decision ID
		const decisionId = parseHumanResourcesLeaveApprovalDecisionId(randomUUID());
		if (!decisionId.ok) {
			return decisionId;
		}

		try {
			const sqlValue3 = buildStatusTransitionSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				nextStatus: "returned",
				decision: "returned",
				decisionId: decisionId.data,
				note: input.note,
				// Note: return does not emit outbox event per original code
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue3),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave request return failed");
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to return leave request");
		}
	},

	async withdrawLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		try {
			const sqlValue2 = buildStatusTransitionSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				nextStatus: "withdrawn",
				// Note: withdraw does not emit outbox event per original code
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue2),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound("Leave request withdrawal failed");
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to withdraw leave request");
		}
	},

	async cancelApprovedLeaveRequest(input, _ports, meta) {
		// Validate transaction inputs
		const validation = validateTransactionInput({
			organizationId: input.organizationId,
			correlationId: meta.correlationId,
			actorUserId: input.actorUserId,
		});
		if (!validation.ok) {
			return validation;
		}

		// Pre-transaction validation
		const request = await this.getLeaveRequestById({
			organizationId: input.organizationId,
			requestId: input.requestId,
		});
		if (!request.ok) {
			return request;
		}
		if (request.data === null) {
			return notFound("Leave request not found");
		}

		// Generate IDs for transaction components
		const reversalAdjustmentId = parseHumanResourcesLeaveAdjustmentId(
			randomUUID(),
		);
		if (!reversalAdjustmentId.ok) {
			return reversalAdjustmentId;
		}

		const decisionId = parseHumanResourcesLeaveApprovalDecisionId(randomUUID());
		if (!decisionId.ok) {
			return decisionId;
		}

		const cancelEventType = planLeaveMutationOutboxEventType({
			commandId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.requestId,
			audit: {
				entity: "hr_leave_request",
				action: "UPDATE",
				changes: [],
			},
			eventType: getRegistryDomainEventType(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
			),
			eventEntityId: input.requestId,
			eventEntityType: "hr_leave_request",
		});
		if (cancelEventType === undefined) {
			return invalidState("Leave request cancellation requires a domain event");
		}

		try {
			const sqlValue = buildCancelApprovedLeaveRequestSql({
				requestId: input.requestId,
				organizationId: input.organizationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				note: input.note,
				reversalAdjustmentId: reversalAdjustmentId.data,
				decisionId: decisionId.data,
				createRequestFingerprint: request.data.fingerprint,
				eventType: cancelEventType,
			});

			const [rows] = await runLeaveTransaction((sqlClient) => [
				sqlClient.query(sqlValue),
			]);

			const [row] = rows;
			if (row === undefined) {
				return notFound(
					"Leave request cancellation failed - request not in approved status or stale version",
				);
			}

			return mapLeaveRequest({
				id: row.id,
				organizationId: row.organization_id,
				employeeId: row.employee_id,
				employmentId: row.employment_id,
				entitlementId: row.entitlement_id,
				policyId: row.policy_id,
				startDate: row.start_date,
				endDate: row.end_date,
				requestedQuantity: row.requested_quantity,
				unit: row.unit,
				status: row.status,
				isBackdated: row.is_backdated,
				backdateJustification: row.backdate_justification,
				approvedAt: row.approved_at,
				createIdempotencyKey: row.create_idempotency_key,
				createRequestFingerprint: row.create_request_fingerprint,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to cancel approved leave request",
			);
		}
	},

	async listLeaveRequests(input) {
		try {
			let rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, input.organizationId));
			if (input.employeeId !== undefined) {
				rows = rows.filter((row) => row.employeeId === input.employeeId);
			}
			if (input.status !== undefined) {
				rows = rows.filter((row) => row.status === input.status);
			}
			rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const requests: LeaveRequest[] = [];
			for (const row of paged) {
				const mapped = mapLeaveRequest(row);
				if (!mapped.ok) {
					return mapped;
				}
				requests.push(mapped.data);
			}
			return errorResult.ok({
				requests,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list leave requests");
		}
	},

	async listPendingApprovalLeaveRequests(input) {
		const host = this as LeaveHost;
		const directReports = await host.listDirectReports({
			organizationId: input.organizationId,
			managerEmployeeId: input.managerEmployeeId,
			asOf: new Date().toISOString().slice(0, 10),
			page: 1,
			pageSize: 10_000,
		});
		if (!directReports.ok) {
			return directReports;
		}

		const reportIds = new Set(
			directReports.data.reportingLines.map((line) => line.employeeId),
		);

		try {
			let rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.status, "submitted"),
					),
				);
			rows = rows.filter((row) =>
				reportIds.has(row.employeeId as HumanResourcesEmployeeId),
			);
			rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const requests: LeaveRequest[] = [];
			for (const row of paged) {
				const mapped = mapLeaveRequest(row);
				if (!mapped.ok) {
					return mapped;
				}
				requests.push(mapped.data);
			}
			return errorResult.ok({
				requests,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list pending approval leave requests",
			);
		}
	},

	async listTeamCalendarLeaveRequests(input) {
		const host = this as LeaveHost;
		const directReports = await host.listDirectReports({
			organizationId: input.organizationId,
			managerEmployeeId: input.managerEmployeeId,
			asOf: new Date().toISOString().slice(0, 10),
			page: 1,
			pageSize: 10_000,
		});
		if (!directReports.ok) {
			return directReports;
		}

		const reportIds = new Set(
			directReports.data.reportingLines.map((line) => line.employeeId),
		);

		try {
			let rows = await afendaDatabase.client
				.select()
				.from(hrLeaveRequest)
				.where(eq(hrLeaveRequest.organizationId, input.organizationId));
			rows = rows.filter(
				(row) =>
					(row.status === "approved" || row.status === "submitted") &&
					reportIds.has(row.employeeId as HumanResourcesEmployeeId) &&
					row.endDate >= input.rangeStart &&
					row.startDate <= input.rangeEnd,
			);
			rows.sort((a, b) => a.startDate.localeCompare(b.startDate));
			const totalCount = rows.length;
			const start = (input.page - 1) * input.pageSize;
			const paged = rows.slice(start, start + input.pageSize);
			const entries: TeamCalendarLeavePage["entries"] = [];
			const sequentialOutcome1 = await runSequential(paged, async (row) => {
				const request = mapLeaveRequest(row);
				if (!request.ok) {
					return sequentialReturn(request);
				}
				const segments = await this.listLeaveRequestSegments({
					organizationId: input.organizationId,
					requestId: request.data.id,
				});
				entries.push({
					request: request.data,
					segments: segments.ok ? segments.data : [],
				});
			});
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return errorResult.ok({
				entries,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list team calendar leave");
		}
	},

	async getApprovedLeaveHandoff(input) {
		try {
			const request = await this.getLeaveRequestById({
				organizationId: input.organizationId,
				requestId: input.requestId,
			});
			if (!request.ok) {
				return request;
			}
			if (
				request.data === null ||
				request.data.status !== "approved" ||
				request.data.approvedAt === null
			) {
				return errorResult.ok(null);
			}

			const policy = await this.getLeavePolicyById({
				organizationId: input.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) {
				return policy;
			}
			if (policy.data === null) {
				return errorResult.ok(null);
			}

			const segments = await this.listLeaveRequestSegments({
				organizationId: input.organizationId,
				requestId: request.data.id,
			});
			if (!segments.ok) {
				return segments;
			}

			const handoff: ApprovedLeaveHandoff = {
				organizationId: input.organizationId,
				employeeId: request.data.employeeId,
				employmentId: request.data.employmentId,
				requestId: request.data.id,
				policyId: request.data.policyId,
				policyVersion: policy.data.version,
				paid: policy.data.paid,
				unit: request.data.unit,
				startDate: request.data.startDate,
				endDate: request.data.endDate,
				quantity: request.data.requestedQuantity,
				segments: segments.data.map((segment) => ({
					date: segment.segmentDate,
					quantity: segment.quantity,
					dayPortion: segment.dayPortion,
				})),
				approvedAt: request.data.approvedAt.toISOString(),
				correlationId: input.correlationId,
			};
			return errorResult.ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved leave handoff",
			);
		}
	},
};

export function attachDrizzleLeave(target: LeaveHost): void {
	Object.assign(target, drizzleLeaveMethods);
}

/** Standalone leave adapter for concurrency / failure-injection tests. */
export const drizzleLeave = {} as DrizzleLeaveMethods;
attachDrizzleLeave(drizzleLeave as LeaveHost);
