import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	hrLeaveAdjustment,
	hrLeaveApprovalDecision,
	hrLeaveEntitlement,
	hrLeavePolicy,
	hrLeavePolicyEligibility,
	hrLeaveRequest,
	hrLeaveRequestSegment,
	inArray,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesLeaveEntitlementId,
	type HumanResourcesLeavePolicyId,
	type HumanResourcesLeaveRequestId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesLeaveAdjustmentId,
	parseHumanResourcesLeaveApprovalDecisionId,
	parseHumanResourcesLeaveEntitlementId,
	parseHumanResourcesLeavePolicyId,
	parseHumanResourcesLeaveRequestId,
	parseHumanResourcesLeaveRequestSegmentId,
} from "../../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../error-codes";
import type { MutationPorts, OutboxFactInput } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import {
	type EmploymentStatus,
	employmentStatusSchema,
} from "../../shared/employment-status";
import {
	computeLeaveBalance,
	negateLeaveQuantity,
} from "../../shared/leave-balance";
import {
	assertLeaveEntitlementActive,
	assertLeaveEntitlementStatusTransition,
	assertLeavePolicyEditable,
	assertLeavePolicyStatusTransition,
	assertLeaveRequestAmendable,
	assertLeaveRequestStatusTransition,
} from "../../shared/leave-guards";
import {
	approvalDecisionSchema,
	dayPortionSchema,
	type LeavePolicyStatus,
	type LeaveRequestStatus,
	leaveAdjustmentKindSchema,
	leaveAdjustmentStatusSchema,
	leaveEntitlementStatusSchema,
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
import type {
	HumanResourcesStore,
	IdempotentLeaveEntitlementRecord,
	IdempotentLeaveRequestRecord,
	LeaveAdjustmentCreateRecord,
	LeaveEntitlementGrantRecord,
	LeavePolicyCreateRecord,
	LeaveRequestAmendRecord,
	LeaveRequestCreateRecord,
} from "../../store";
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
	ReportingLine,
	ResolvedLeavePolicy,
	TeamCalendarLeavePage,
} from "../../types";

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
	resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>>;
	getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<import("../../types").Employment | null>>;
	listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<
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
		return ok(statuses);
	} catch {
		return invalidState("Invalid leave policy eligibility statuses");
	}
}

function mapLeavePolicy(
	row: typeof hrLeavePolicy.$inferSelect,
): Result<LeavePolicy> {
	const id = parseHumanResourcesLeavePolicyId(row.id);
	if (!id.ok) return id;
	const leaveType = leaveTypeSchema.safeParse(row.leaveType);
	if (!leaveType.success) return invalidState("Invalid leave policy type");
	const unit = leaveUnitSchema.safeParse(row.unit);
	if (!unit.success) return invalidState("Invalid leave policy unit");
	const status = leavePolicyStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid leave policy status");
	let supersedesPolicyId: LeavePolicy["supersedesPolicyId"] = null;
	if (row.supersedesPolicyId !== null) {
		const parsed = parseHumanResourcesLeavePolicyId(row.supersedesPolicyId);
		if (!parsed.ok) return parsed;
		supersedesPolicyId = parsed.data;
	}
	return ok({
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

function mapLeavePolicyEligibility(
	row: typeof hrLeavePolicyEligibility.$inferSelect,
): Result<LeavePolicyEligibility> {
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) return policyId;
	const statuses = parseEmploymentStatuses(row.allowedEmploymentStatuses);
	if (!statuses.ok) return statuses;
	return ok({
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
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) return policyId;
	const status = leaveEntitlementStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid leave entitlement status");
	return ok({
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
	if (!id.ok) return id;
	const entitlementId = parseHumanResourcesLeaveEntitlementId(
		row.entitlementId,
	);
	if (!entitlementId.ok) return entitlementId;
	let sourceRequestId: LeaveAdjustment["sourceRequestId"] = null;
	if (row.sourceRequestId !== null) {
		const parsed = parseHumanResourcesLeaveRequestId(row.sourceRequestId);
		if (!parsed.ok) return parsed;
		sourceRequestId = parsed.data;
	}
	const kind = leaveAdjustmentKindSchema.safeParse(row.kind);
	if (!kind.success) return invalidState("Invalid leave adjustment kind");
	const status = leaveAdjustmentStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid leave adjustment status");
	return ok({
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
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const entitlementId = parseHumanResourcesLeaveEntitlementId(
		row.entitlementId,
	);
	if (!entitlementId.ok) return entitlementId;
	const policyId = parseHumanResourcesLeavePolicyId(row.policyId);
	if (!policyId.ok) return policyId;
	const unit = leaveUnitSchema.safeParse(row.unit);
	if (!unit.success) return invalidState("Invalid leave request unit");
	const status = leaveRequestStatusSchema.safeParse(row.status);
	if (!status.success) return invalidState("Invalid leave request status");
	return ok({
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
	if (!id.ok) return id;
	const requestId = parseHumanResourcesLeaveRequestId(row.requestId);
	if (!requestId.ok) return requestId;
	const dayPortion = dayPortionSchema.safeParse(row.dayPortion);
	if (!dayPortion.success)
		return invalidState("Invalid leave segment day portion");
	return ok({
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

function activeOverlapStatuses(): LeaveRequestStatus[] {
	return ["draft", "submitted", "returned", "approved"];
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

async function emitOutbox(
	ports: MutationPorts,
	input: {
		organizationId: string;
		eventType: OutboxFactInput["type"];
		entityType: string;
		entityId: string;
		actorId: string;
		correlationId: string;
	},
): Promise<Result<{ id: string }>> {
	return ports.outbox.append({
		organizationId: input.organizationId,
		actorUserId: input.actorId,
		correlationId: input.correlationId,
		type: input.eventType,
		payload: {
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.entityId,
			actorId: input.actorId,
			correlationId: input.correlationId,
		},
	});
}

export const drizzleLeaveMethods: DrizzleLeaveMethods = {
	async getLeavePolicyById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLeavePolicy)
				.where(
					and(
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.id, input.policyId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
			return mapLeavePolicy(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave policy");
		}
	},

	async getLeavePolicyEligibility(input) {
		try {
			const rows = await db
				.select()
				.from(hrLeavePolicyEligibility)
				.where(
					and(
						eq(hrLeavePolicyEligibility.organizationId, input.organizationId),
						eq(hrLeavePolicyEligibility.policyId, input.policyId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
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
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return ok(null);
		}
		if (employment.data.employeeId !== input.employeeId) {
			return ok(null);
		}

		try {
			const rows = await db
				.select()
				.from(hrLeavePolicy)
				.where(
					and(
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.code, input.policyCode),
						eq(hrLeavePolicy.status, "published"),
					),
				);
			const candidates: LeavePolicy[] = [];
			for (const row of rows) {
				const mapped = mapLeavePolicy(row);
				if (!mapped.ok) return mapped;
				if (
					mapped.data.effectiveFrom <= input.asOfDate &&
					(mapped.data.effectiveTo === null ||
						mapped.data.effectiveTo >= input.asOfDate)
				) {
					candidates.push(mapped.data);
				}
			}
			candidates.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			const policy = candidates[0];
			if (policy === undefined) {
				return ok(null);
			}

			const eligibility = await this.getLeavePolicyEligibility({
				organizationId: input.organizationId,
				policyId: policy.id,
			});
			if (!eligibility.ok) return eligibility;
			if (eligibility.data === null) {
				return ok(null);
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
				return ok(null);
			}
			if (
				eligibility.data.minTenureDays !== null &&
				tenureDays < eligibility.data.minTenureDays
			) {
				return ok(null);
			}

			const resolved: ResolvedLeavePolicy = {
				policy,
				eligibility: eligibility.data,
			};
			return ok(resolved);
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
		if (!primary.ok) return primary;
		return ok(primary.data?.managerEmployeeId ?? null);
	},

	async findLeavePolicyByCode(input) {
		try {
			const rows = await db
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
			const row = rows[0];
			if (row === undefined) return ok(null);
			return mapLeavePolicy(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find leave policy by code",
			);
		}
	},

	async createLeavePolicy(record, ports, meta) {
		const duplicate = await this.findLeavePolicyByCode({
			organizationId: record.organizationId,
			code: record.code,
			effectiveFrom: record.effectiveFrom,
		});
		if (!duplicate.ok) return duplicate;
		if (duplicate.data !== null) {
			return conflict("Leave policy code already exists for effective date");
		}

		const policyId = parseHumanResourcesLeavePolicyId(randomUUID());
		if (!policyId.ok) return policyId;
		const eligibilityId = randomUUID();
		const statusesJson = JSON.stringify(record.allowedEmploymentStatuses);

		try {
			await db.insert(hrLeavePolicy).values({
				id: policyId.data,
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
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				status: "draft",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
			});
			await db.insert(hrLeavePolicyEligibility).values({
				id: eligibilityId,
				organizationId: record.organizationId,
				policyId: policyId.data,
				minTenureDays: record.minTenureDays,
				allowedEmploymentStatuses: statusesJson,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
			});
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Leave policy code already exists for effective date");
			}
			return mapPersistenceFailure(error, "Failed to create leave policy");
		}

		const audit = await recordAudit(ports, {
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_policy",
			entityId: policyId.data,
			action: "CREATE",
		});
		if (!audit.ok) return audit;

		return this.getLeavePolicyById({
			organizationId: record.organizationId,
			policyId: policyId.data,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) {
				return notFound("Leave policy not found after create");
			}
			return ok(result.data);
		});
	},

	async updateLeavePolicy(input, ports, meta) {
		const existing = await this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: input.policyId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) return notFound("Leave policy not found");
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const editable = assertLeavePolicyEditable(existing.data.status);
		if (!editable.ok) return editable;

		const nextVersion = input.expectedVersion + 1;
		try {
			const updated = await db
				.update(hrLeavePolicy)
				.set({
					name: input.name ?? existing.data.name,
					paid: input.paid ?? existing.data.paid,
					sensitive: input.sensitive ?? existing.data.sensitive,
					allowsNegativeBalance:
						input.allowsNegativeBalance ?? existing.data.allowsNegativeBalance,
					allowSelfApproval:
						input.allowSelfApproval ?? existing.data.allowSelfApproval,
					allowsPartialDay:
						input.allowsPartialDay ?? existing.data.allowsPartialDay,
					effectiveTo:
						input.effectiveTo !== undefined
							? input.effectiveTo
							: existing.data.effectiveTo,
					version: nextVersion,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrLeavePolicy.id, input.policyId),
						eq(hrLeavePolicy.organizationId, input.organizationId),
						eq(hrLeavePolicy.version, input.expectedVersion),
					),
				)
				.returning();
			if (updated.length === 0) {
				return notFound("Leave policy not found or stale version");
			}

			if (
				input.minTenureDays !== undefined ||
				input.allowedEmploymentStatuses !== undefined
			) {
				const eligibility = await this.getLeavePolicyEligibility({
					organizationId: input.organizationId,
					policyId: input.policyId,
				});
				if (!eligibility.ok) return eligibility;
				if (eligibility.data !== null) {
					await db
						.update(hrLeavePolicyEligibility)
						.set({
							minTenureDays:
								input.minTenureDays !== undefined
									? input.minTenureDays
									: eligibility.data.minTenureDays,
							allowedEmploymentStatuses:
								input.allowedEmploymentStatuses !== undefined
									? JSON.stringify(input.allowedEmploymentStatuses)
									: JSON.stringify(eligibility.data.allowedEmploymentStatuses),
							updatedBy: input.actorUserId,
							updatedAt: new Date(),
						})
						.where(eq(hrLeavePolicyEligibility.id, eligibility.data.id));
				}
			}
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update leave policy");
		}

		const audit = await recordAudit(ports, {
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_leave_policy",
			entityId: input.policyId,
			action: "UPDATE",
		});
		if (!audit.ok) return audit;

		return this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: input.policyId,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) return notFound("Leave policy not found");
			return ok(result.data);
		});
	},

	async publishLeavePolicy(input, ports, meta) {
		return transitionLeavePolicyStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "published",
			ports,
			meta,
		});
	},

	async archiveLeavePolicy(input, ports, meta) {
		return transitionLeavePolicyStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "archived",
			ports,
			meta,
		});
	},

	async supersedeLeavePolicy(input, ports, meta) {
		const superseded = await transitionLeavePolicyStatus.call(
			this as LeaveHost,
			{
				organizationId: input.organizationId,
				policyId: input.policyId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "superseded",
				ports,
				meta,
			},
		);
		if (!superseded.ok) return superseded;

		const created = await this.createLeavePolicy(
			{
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
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				minTenureDays: input.minTenureDays,
				allowedEmploymentStatuses: input.allowedEmploymentStatuses,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!created.ok) return created;

		try {
			await db
				.update(hrLeavePolicy)
				.set({
					status: "published",
					supersedesPolicyId: input.policyId,
					version: created.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrLeavePolicy.id, created.data.id),
						eq(hrLeavePolicy.organizationId, input.organizationId),
					),
				);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to publish superseding leave policy",
			);
		}

		return this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: created.data.id,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) return notFound("Leave policy not found");
			return ok(result.data);
		});
	},

	async listLeavePolicies(input) {
		try {
			let rows = await db
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
				if (!mapped.ok) return mapped;
				policies.push(mapped.data);
			}
			return ok({
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
			const rows = await db
				.select()
				.from(hrLeaveEntitlement)
				.where(
					and(
						eq(hrLeaveEntitlement.organizationId, input.organizationId),
						eq(hrLeaveEntitlement.id, input.entitlementId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
			return mapLeaveEntitlement(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave entitlement");
		}
	},

	async findLeaveEntitlementByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLeaveEntitlement)
				.where(
					and(
						eq(hrLeaveEntitlement.organizationId, input.organizationId),
						eq(hrLeaveEntitlement.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
			const entitlement = mapLeaveEntitlement(row);
			if (!entitlement.ok) return entitlement;
			return ok({
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

	async grantLeaveEntitlement(record, ports, meta) {
		const policy = await this.getLeavePolicyById({
			organizationId: record.organizationId,
			policyId: record.policyId,
		});
		if (!policy.ok) return policy;
		if (policy.data === null) return notFound("Leave policy not found");
		if (policy.data.status !== "published") {
			return invalidState("Leave policy must be published");
		}

		const entitlementId = parseHumanResourcesLeaveEntitlementId(randomUUID());
		if (!entitlementId.ok) return entitlementId;

		try {
			await db.insert(hrLeaveEntitlement).values({
				id: entitlementId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				policyId: record.policyId,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				openingQuantity: record.openingQuantity,
				status: "active",
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findLeaveEntitlementByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.entitlement);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to grant leave entitlement");
		}

		const audit = await recordAudit(ports, {
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_entitlement",
			entityId: entitlementId.data,
			action: "CREATE",
		});
		if (!audit.ok) return audit;

		return this.getLeaveEntitlementById({
			organizationId: record.organizationId,
			entitlementId: entitlementId.data,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) return notFound("Leave entitlement not found");
			return ok(result.data);
		});
	},

	async carryForwardLeaveEntitlement(input, ports, meta) {
		const source = await this.getLeaveEntitlementById({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!source.ok) return source;
		if (source.data === null) return notFound("Leave entitlement not found");

		const transition = assertLeaveEntitlementStatusTransition(
			source.data.status,
			"carried_forward",
		);
		if (!transition.ok) return transition;
		const versionCheck = assertExpectedVersion(
			source.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const expired = await transitionLeaveEntitlementStatus.call(
			this as LeaveHost,
			{
				organizationId: input.organizationId,
				entitlementId: input.entitlementId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "carried_forward",
				ports,
				meta,
			},
		);
		if (!expired.ok) return expired;

		const granted = await this.grantLeaveEntitlement(
			{
				organizationId: input.organizationId,
				employeeId: source.data.employeeId,
				employmentId: source.data.employmentId,
				policyId: source.data.policyId,
				periodStart: input.newPeriodStart,
				periodEnd: input.newPeriodEnd,
				openingQuantity: input.carriedQuantity,
				createIdempotencyKey: input.createIdempotencyKey,
				createRequestFingerprint: input.createRequestFingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!granted.ok) return granted;

		const carryAdjustment = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: granted.data.id,
				sourceRequestId: null,
				kind: "carry_forward",
				delta: input.carriedQuantity,
				reason: `Carry forward from entitlement ${source.data.id}`,
				source: "system",
				createIdempotencyKey: `${input.createIdempotencyKey}:carry`,
				createRequestFingerprint: input.createRequestFingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!carryAdjustment.ok) return carryAdjustment;

		return ok(granted.data);
	},

	async expireLeaveEntitlement(input, ports, meta) {
		return transitionLeaveEntitlementStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "expired",
			ports,
			meta,
		});
	},

	async adjustLeaveEntitlement(record, ports, meta) {
		const entitlement = await this.getLeaveEntitlementById({
			organizationId: record.organizationId,
			entitlementId: record.entitlementId,
		});
		if (!entitlement.ok) return entitlement;
		if (entitlement.data === null)
			return notFound("Leave entitlement not found");
		const active = assertLeaveEntitlementActive(entitlement.data.status);
		if (!active.ok) return active;

		const adjustmentId = parseHumanResourcesLeaveAdjustmentId(randomUUID());
		if (!adjustmentId.ok) return adjustmentId;

		try {
			await db.insert(hrLeaveAdjustment).values({
				id: adjustmentId.data,
				organizationId: record.organizationId,
				entitlementId: record.entitlementId,
				sourceRequestId: record.sourceRequestId,
				kind: record.kind,
				delta: record.delta,
				reason: record.reason,
				source: record.source,
				status: "posted",
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
			});
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				return conflict("Idempotency key already used with different data");
			}
			return mapPersistenceFailure(error, "Failed to adjust leave entitlement");
		}

		const audit = await recordAudit(ports, {
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_adjustment",
			entityId: adjustmentId.data,
			action: "CREATE",
		});
		if (!audit.ok) return audit;

		if (
			record.kind === "manual" ||
			record.kind === "carry_forward" ||
			record.kind === "expiry"
		) {
			const event = await emitOutbox(ports, {
				organizationId: record.organizationId,
				eventType: HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
				entityType: "hr_leave_entitlement",
				entityId: record.entitlementId,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			});
			if (!event.ok) return event;
		}

		const rows = await db
			.select()
			.from(hrLeaveAdjustment)
			.where(eq(hrLeaveAdjustment.id, adjustmentId.data))
			.limit(1);
		const row = rows[0];
		if (row === undefined) return notFound("Leave adjustment not found");
		return mapLeaveAdjustment(row);
	},

	async listLeaveEntitlements(input) {
		try {
			let rows = await db
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
				if (!mapped.ok) return mapped;
				entitlements.push(mapped.data);
			}
			return ok({
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
			const rows = await db
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
				if (!mapped.ok) return mapped;
				adjustments.push(mapped.data);
			}
			return ok(adjustments);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list leave adjustments");
		}
	},

	async getLeaveBalance(input) {
		const entitlement = await this.getLeaveEntitlementById(input);
		if (!entitlement.ok) return entitlement;
		if (entitlement.data === null) return ok(null);

		const policy = await this.getLeavePolicyById({
			organizationId: input.organizationId,
			policyId: entitlement.data.policyId,
		});
		if (!policy.ok) return policy;

		const adjustments = await this.listPostedLeaveAdjustments({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!adjustments.ok) return adjustments;

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
		return ok(balance);
	},

	async getLeaveRequestById(input) {
		try {
			const rows = await db
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.id, input.requestId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
			return mapLeaveRequest(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load leave request");
		}
	},

	async findLeaveRequestByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrLeaveRequest)
				.where(
					and(
						eq(hrLeaveRequest.organizationId, input.organizationId),
						eq(hrLeaveRequest.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) return ok(null);
			const request = mapLeaveRequest(row);
			if (!request.ok) return request;
			return ok({
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
			const rows = await db
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
				if (!mapped.ok) return mapped;
				segments.push(mapped.data);
			}
			return ok(segments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list leave request segments",
			);
		}
	},

	async listOverlappingLeaveSegments(input) {
		try {
			let requests = await db
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
					activeOverlapStatuses().includes(row.status as LeaveRequestStatus) &&
					row.id !== input.excludeRequestId,
			);
			if (requests.length === 0) return ok([]);
			const requestIds = requests.map((row) => row.id);
			const rows = await db
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
				if (!mapped.ok) return mapped;
				segments.push(mapped.data);
			}
			return ok(segments);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list overlapping leave segments",
			);
		}
	},

	async createDraftLeaveRequest(record, ports, meta) {
		const requestId = parseHumanResourcesLeaveRequestId(randomUUID());
		if (!requestId.ok) return requestId;

		try {
			await db.insert(hrLeaveRequest).values({
				id: requestId.data,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				entitlementId: record.entitlementId,
				policyId: record.policyId,
				startDate: record.startDate,
				endDate: record.endDate,
				requestedQuantity: record.requestedQuantity,
				unit: record.unit,
				status: "draft",
				isBackdated: record.isBackdated,
				backdateJustification: record.backdateJustification,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
			});

			for (const segment of record.segments) {
				const segmentId = parseHumanResourcesLeaveRequestSegmentId(
					randomUUID(),
				);
				if (!segmentId.ok) return segmentId;
				await db.insert(hrLeaveRequestSegment).values({
					id: segmentId.data,
					organizationId: record.organizationId,
					requestId: requestId.data,
					segmentDate: segment.segmentDate,
					quantity: segment.quantity,
					dayPortion: segment.dayPortion,
				});
			}
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findLeaveRequestByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.request);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to create leave request");
		}

		const audit = await recordAudit(ports, {
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_request",
			entityId: requestId.data,
			action: "CREATE",
		});
		if (!audit.ok) return audit;

		return this.getLeaveRequestById({
			organizationId: record.organizationId,
			requestId: requestId.data,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) return notFound("Leave request not found");
			return ok(result.data);
		});
	},

	async amendLeaveRequest(record, ports, meta) {
		const existing = await this.getLeaveRequestById({
			organizationId: record.organizationId,
			requestId: record.requestId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) return notFound("Leave request not found");
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const amendable = assertLeaveRequestAmendable(existing.data.status);
		if (!amendable.ok) return amendable;

		const nextVersion = record.expectedVersion + 1;
		try {
			const updated = await db
				.update(hrLeaveRequest)
				.set({
					startDate: record.startDate,
					endDate: record.endDate,
					requestedQuantity: record.requestedQuantity,
					isBackdated: record.isBackdated,
					backdateJustification: record.backdateJustification,
					version: nextVersion,
					updatedBy: record.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(hrLeaveRequest.id, record.requestId),
						eq(hrLeaveRequest.organizationId, record.organizationId),
						eq(hrLeaveRequest.version, record.expectedVersion),
					),
				)
				.returning();
			if (updated.length === 0) {
				return notFound("Leave request not found or stale version");
			}

			await db
				.delete(hrLeaveRequestSegment)
				.where(
					and(
						eq(hrLeaveRequestSegment.organizationId, record.organizationId),
						eq(hrLeaveRequestSegment.requestId, record.requestId),
					),
				);

			for (const segment of record.segments) {
				const segmentId = parseHumanResourcesLeaveRequestSegmentId(
					randomUUID(),
				);
				if (!segmentId.ok) return segmentId;
				await db.insert(hrLeaveRequestSegment).values({
					id: segmentId.data,
					organizationId: record.organizationId,
					requestId: record.requestId,
					segmentDate: segment.segmentDate,
					quantity: segment.quantity,
					dayPortion: segment.dayPortion,
				});
			}
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend leave request");
		}

		const audit = await recordAudit(ports, {
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_leave_request",
			entityId: record.requestId,
			action: "UPDATE",
		});
		if (!audit.ok) return audit;

		return this.getLeaveRequestById({
			organizationId: record.organizationId,
			requestId: record.requestId,
		}).then((result) => {
			if (!result.ok) return result;
			if (result.data === null) return notFound("Leave request not found");
			return ok(result.data);
		});
	},

	async submitLeaveRequest(input, ports, meta) {
		return transitionLeaveRequestStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "submitted",
			ports,
			meta,
			emitEvent: HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
		});
	},

	async approveLeaveRequest(input, ports, meta) {
		const request = await this.getLeaveRequestById({
			organizationId: input.organizationId,
			requestId: input.requestId,
		});
		if (!request.ok) return request;
		if (request.data === null) return notFound("Leave request not found");

		const consumption = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: request.data.entitlementId,
				sourceRequestId: request.data.id,
				kind: "consumption",
				delta: negateLeaveQuantity(request.data.requestedQuantity),
				reason: `Approved leave request ${request.data.id}`,
				source: "approval",
				createIdempotencyKey: `${request.data.id}:consumption`,
				createRequestFingerprint: request.data.fingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!consumption.ok) return consumption;

		const approved = await transitionLeaveRequestStatus.call(
			this as LeaveHost,
			{
				organizationId: input.organizationId,
				requestId: input.requestId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				nextStatus: "approved",
				note: input.note,
				decision: "approved",
				ports,
				meta,
				emitEvent: HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
				approvedAt: new Date(),
			},
		);
		if (!approved.ok) {
			try {
				await db
					.delete(hrLeaveAdjustment)
					.where(eq(hrLeaveAdjustment.id, consumption.data.id));
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to roll back leave consumption adjustment",
				);
			}
			return approved;
		}

		return approved;
	},

	async rejectLeaveRequest(input, ports, meta) {
		return transitionLeaveRequestStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "rejected",
			decision: "rejected",
			ports,
			meta,
			emitEvent: HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
		});
	},

	async returnLeaveRequest(input, ports, meta) {
		return transitionLeaveRequestStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "returned",
			decision: "returned",
			ports,
			meta,
		});
	},

	async withdrawLeaveRequest(input, ports, meta) {
		return transitionLeaveRequestStatus.call(this as LeaveHost, {
			...input,
			nextStatus: "withdrawn",
			ports,
			meta,
		});
	},

	async cancelApprovedLeaveRequest(input, ports, meta) {
		const request = await this.getLeaveRequestById({
			organizationId: input.organizationId,
			requestId: input.requestId,
		});
		if (!request.ok) return request;
		if (request.data === null) return notFound("Leave request not found");

		const reversal = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: request.data.entitlementId,
				sourceRequestId: request.data.id,
				kind: "cancellation_reversal",
				delta: request.data.requestedQuantity,
				reason: `Cancelled approved leave request ${request.data.id}`,
				source: "cancellation",
				createIdempotencyKey: `${request.data.id}:reversal`,
				createRequestFingerprint: request.data.fingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!reversal.ok) return reversal;

		return transitionLeaveRequestStatus.call(this as LeaveHost, {
			organizationId: input.organizationId,
			requestId: input.requestId,
			expectedVersion: input.expectedVersion,
			actorUserId: input.actorUserId,
			nextStatus: "cancelled",
			note: input.note,
			decision: "cancelled",
			ports,
			meta,
			emitEvent: HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
		});
	},

	async listLeaveRequests(input) {
		try {
			let rows = await db
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
				if (!mapped.ok) return mapped;
				requests.push(mapped.data);
			}
			return ok({
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
		if (!directReports.ok) return directReports;

		const reportIds = new Set(
			directReports.data.reportingLines.map((line) => line.employeeId),
		);

		try {
			let rows = await db
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
				if (!mapped.ok) return mapped;
				requests.push(mapped.data);
			}
			return ok({
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
		if (!directReports.ok) return directReports;

		const reportIds = new Set(
			directReports.data.reportingLines.map((line) => line.employeeId),
		);

		try {
			let rows = await db
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
			for (const row of paged) {
				const request = mapLeaveRequest(row);
				if (!request.ok) return request;
				const segments = await this.listLeaveRequestSegments({
					organizationId: input.organizationId,
					requestId: request.data.id,
				});
				entries.push({
					request: request.data,
					segments: segments.ok ? segments.data : [],
				});
			}
			return ok({
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
			if (!request.ok) return request;
			if (
				request.data === null ||
				request.data.status !== "approved" ||
				request.data.approvedAt === null
			) {
				return ok(null);
			}

			const policy = await this.getLeavePolicyById({
				organizationId: input.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return ok(null);
			}

			const segments = await this.listLeaveRequestSegments({
				organizationId: input.organizationId,
				requestId: request.data.id,
			});
			if (!segments.ok) return segments;

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
			return ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved leave handoff",
			);
		}
	},
};

async function transitionLeavePolicyStatus(
	this: LeaveHost,
	input: {
		organizationId: string;
		policyId: HumanResourcesLeavePolicyId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: LeavePolicyStatus;
		ports: MutationPorts;
		meta: { correlationId: string };
	},
): Promise<Result<LeavePolicy>> {
	const existing = await this.getLeavePolicyById({
		organizationId: input.organizationId,
		policyId: input.policyId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Leave policy not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeavePolicyStatusTransition(
		existing.data.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	try {
		const updated = await db
			.update(hrLeavePolicy)
			.set({
				status: input.nextStatus,
				version: nextVersion,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrLeavePolicy.id, input.policyId),
					eq(hrLeavePolicy.organizationId, input.organizationId),
					eq(hrLeavePolicy.version, input.expectedVersion),
				),
			)
			.returning();
		if (updated.length === 0) {
			return notFound("Leave policy not found or stale version");
		}
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to transition leave policy status",
		);
	}

	const audit = await recordAudit(input.ports, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_policy",
		entityId: input.policyId,
		action: "UPDATE",
	});
	if (!audit.ok) return audit;

	return this.getLeavePolicyById({
		organizationId: input.organizationId,
		policyId: input.policyId,
	}).then((result) => {
		if (!result.ok) return result;
		if (result.data === null) return notFound("Leave policy not found");
		return ok(result.data);
	});
}

async function transitionLeaveEntitlementStatus(
	this: LeaveHost,
	input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: LeaveEntitlement["status"];
		ports: MutationPorts;
		meta: { correlationId: string };
	},
): Promise<Result<LeaveEntitlement>> {
	const existing = await this.getLeaveEntitlementById({
		organizationId: input.organizationId,
		entitlementId: input.entitlementId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Leave entitlement not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeaveEntitlementStatusTransition(
		existing.data.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	try {
		const updated = await db
			.update(hrLeaveEntitlement)
			.set({
				status: input.nextStatus,
				version: nextVersion,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrLeaveEntitlement.id, input.entitlementId),
					eq(hrLeaveEntitlement.organizationId, input.organizationId),
					eq(hrLeaveEntitlement.version, input.expectedVersion),
				),
			)
			.returning();
		if (updated.length === 0) {
			return notFound("Leave entitlement not found or stale version");
		}
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to transition leave entitlement status",
		);
	}

	const audit = await recordAudit(input.ports, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_entitlement",
		entityId: input.entitlementId,
		action: "UPDATE",
	});
	if (!audit.ok) return audit;

	if (input.nextStatus === "expired") {
		const balance = await this.getLeaveBalance({
			organizationId: input.organizationId,
			entitlementId: input.entitlementId,
		});
		if (!balance.ok) return balance;
		if (balance.data !== null && balance.data.balance !== "0") {
			const expiry = await this.adjustLeaveEntitlement(
				{
					organizationId: input.organizationId,
					entitlementId: input.entitlementId,
					sourceRequestId: null,
					kind: "expiry",
					delta: negateLeaveQuantity(balance.data.balance),
					reason: "Entitlement expired",
					source: "system",
					createIdempotencyKey: `${input.entitlementId}:expiry`,
					createRequestFingerprint: existing.data.fingerprint,
					createdBy: input.actorUserId,
				},
				input.ports,
				input.meta,
			);
			if (!expiry.ok) return expiry;
		}
	}

	return this.getLeaveEntitlementById({
		organizationId: input.organizationId,
		entitlementId: input.entitlementId,
	}).then((result) => {
		if (!result.ok) return result;
		if (result.data === null) return notFound("Leave entitlement not found");
		return ok(result.data);
	});
}

async function transitionLeaveRequestStatus(
	this: LeaveHost,
	input: {
		organizationId: string;
		requestId: HumanResourcesLeaveRequestId;
		expectedVersion: number;
		actorUserId: string;
		nextStatus: LeaveRequestStatus;
		note?: string | null;
		decision?: "approved" | "rejected" | "returned" | "cancelled";
		ports: MutationPorts;
		meta: { correlationId: string };
		emitEvent?: OutboxFactInput["type"];
		approvedAt?: Date;
	},
): Promise<Result<LeaveRequest>> {
	const existing = await this.getLeaveRequestById({
		organizationId: input.organizationId,
		requestId: input.requestId,
	});
	if (!existing.ok) return existing;
	if (existing.data === null) return notFound("Leave request not found");
	const versionCheck = assertExpectedVersion(
		existing.data.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeaveRequestStatusTransition(
		existing.data.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const nextVersion = input.expectedVersion + 1;
	try {
		const updated = await db
			.update(hrLeaveRequest)
			.set({
				status: input.nextStatus,
				approvedAt:
					input.approvedAt !== undefined
						? input.approvedAt
						: existing.data.approvedAt,
				version: nextVersion,
				updatedBy: input.actorUserId,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(hrLeaveRequest.id, input.requestId),
					eq(hrLeaveRequest.organizationId, input.organizationId),
					eq(hrLeaveRequest.version, input.expectedVersion),
				),
			)
			.returning();
		if (updated.length === 0) {
			return notFound("Leave request not found or stale version");
		}

		if (input.decision !== undefined) {
			const decisionId = parseHumanResourcesLeaveApprovalDecisionId(
				randomUUID(),
			);
			if (!decisionId.ok) return decisionId;
			const decision = approvalDecisionSchema.safeParse(input.decision);
			if (!decision.success) return invalidState("Invalid approval decision");
			await db.insert(hrLeaveApprovalDecision).values({
				id: decisionId.data,
				organizationId: input.organizationId,
				requestId: input.requestId,
				decision: decision.data,
				decidedBy: input.actorUserId,
				decidedAt: new Date(),
				note: input.note ?? null,
			});
		}
	} catch (error) {
		return mapPersistenceFailure(
			error,
			"Failed to transition leave request status",
		);
	}

	const audit = await recordAudit(input.ports, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_request",
		entityId: input.requestId,
		action: "UPDATE",
	});
	if (!audit.ok) return audit;

	if (input.emitEvent !== undefined) {
		const event = await emitOutbox(input.ports, {
			organizationId: input.organizationId,
			eventType: input.emitEvent,
			entityType: "hr_leave_request",
			entityId: input.requestId,
			actorId: input.actorUserId,
			correlationId: input.meta.correlationId,
		});
		if (!event.ok) return event;
	}

	return this.getLeaveRequestById({
		organizationId: input.organizationId,
		requestId: input.requestId,
	}).then((result) => {
		if (!result.ok) return result;
		if (result.data === null) return notFound("Leave request not found");
		return ok(result.data);
	});
}

export function attachDrizzleLeave(target: LeaveHost): void {
	Object.assign(target, drizzleLeaveMethods);
}
