import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
	type HumanResourcesEventType,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesLeaveAdjustmentId,
	parseHumanResourcesLeaveApprovalDecisionId,
	parseHumanResourcesLeaveEntitlementId,
	parseHumanResourcesLeavePolicyId,
	parseHumanResourcesLeaveRequestId,
	parseHumanResourcesLeaveRequestSegmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesLeaveEntitlementId,
	type HumanResourcesLeavePolicyId,
	type HumanResourcesLeaveRequestId,
} from "../brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../error-codes";
import type { MutationPorts } from "../ports";
import { assertExpectedVersion } from "../shared/concurrency";
import {
	conflict,
	invalidState,
	notFound,
} from "../shared/domain-guards";
import {
	computeLeaveBalance,
	negateLeaveQuantity,
} from "../shared/leave-balance";
import {
	assertLeaveEntitlementActive,
	assertLeaveEntitlementStatusTransition,
	assertLeavePolicyEditable,
	assertLeavePolicyStatusTransition,
	assertLeaveRequestAmendable,
	assertLeaveRequestStatusTransition,
} from "../shared/leave-guards";
import type { EmploymentStatus } from "../shared/employment-status";
import type {
	LeavePolicyStatus,
	LeaveRequestStatus,
} from "../shared/leave-status";
import type {
	HumanResourcesStore,
	IdempotentLeaveEntitlementRecord,
	IdempotentLeaveRequestRecord,
	LeaveAdjustmentCreateRecord,
	LeaveEntitlementGrantRecord,
	LeavePolicyCreateRecord,
	LeaveRequestAmendRecord,
	LeaveRequestCreateRecord,
} from "../store";
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
} from "../types";

export type LeaveMemoryState = {
	leavePolicies: Map<string, LeavePolicy>;
	leavePolicyEligibility: Map<string, LeavePolicyEligibility>;
	leaveEntitlements: Map<string, LeaveEntitlement>;
	leaveEntitlementIdempotency: Map<string, IdempotentLeaveEntitlementRecord>;
	leaveAdjustments: Map<string, LeaveAdjustment>;
	leaveRequests: Map<string, LeaveRequest>;
	leaveRequestIdempotency: Map<string, IdempotentLeaveRequestRecord>;
	leaveRequestSegments: Map<string, LeaveRequestSegment>;
	leaveApprovalDecisions: Map<string, { requestId: string; decision: string }>;
};

export function createLeaveMemoryState(): LeaveMemoryState {
	return {
		leavePolicies: new Map(),
		leavePolicyEligibility: new Map(),
		leaveEntitlements: new Map(),
		leaveEntitlementIdempotency: new Map(),
		leaveAdjustments: new Map(),
		leaveRequests: new Map(),
		leaveRequestIdempotency: new Map(),
		leaveRequestSegments: new Map(),
		leaveApprovalDecisions: new Map(),
	};
}

type LeaveMemoryAttachmentTarget = LeaveMemoryState & {
	resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>>;
	getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<import("../types").Employment | null>>;
	listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>>;
};

type LeaveMemoryHost = LeaveMemoryAttachmentTarget &
	Pick<
		HumanResourcesStore,
		| "findLeavePolicyByCode"
		| "createLeavePolicy"
		| "grantLeaveEntitlement"
		| "adjustLeaveEntitlement"
		| "listLeaveRequestSegments"
	>;

function idempotencyKey(organizationId: string, key: string): string {
	return `${organizationId}:${key}`;
}

function activeOverlapStatuses(): LeaveRequestStatus[] {
	return ["draft", "submitted", "returned", "approved"];
}

function postedAdjustmentsForEntitlement(
	state: LeaveMemoryState,
	entitlementId: HumanResourcesLeaveEntitlementId,
): LeaveAdjustment[] {
	return Array.from(state.leaveAdjustments.values()).filter(
		(adjustment) =>
			adjustment.entitlementId === entitlementId &&
			adjustment.status === "posted",
	);
}

function resolveBalance(
	state: LeaveMemoryState,
	entitlement: LeaveEntitlement,
): LeaveBalance {
	const policy = state.leavePolicies.get(entitlement.policyId);
	const adjustments = postedAdjustmentsForEntitlement(state, entitlement.id);
	return {
		entitlementId: entitlement.id,
		employeeId: entitlement.employeeId,
		policyId: entitlement.policyId,
		unit: policy?.unit ?? "days",
		openingQuantity: entitlement.openingQuantity,
		balance: computeLeaveBalance(entitlement.openingQuantity, adjustments),
	};
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
		eventType: HumanResourcesEventType;
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

function tenureDaysOn(startsOn: string, asOfDate: string): number {
	const [startYear, startMonth, startDay] = startsOn.split("-").map(Number);
	const [asOfYear, asOfMonth, asOfDay] = asOfDate.split("-").map(Number);
	const start = Date.UTC(startYear, startMonth - 1, startDay);
	const asOf = Date.UTC(asOfYear, asOfMonth - 1, asOfDay);
	return Math.floor((asOf - start) / (1000 * 60 * 60 * 24));
}

function isPolicyEffectiveOn(
	policy: LeavePolicy,
	asOfDate: string,
): boolean {
	if (policy.effectiveFrom > asOfDate) {
		return false;
	}
	if (policy.effectiveTo !== null && policy.effectiveTo < asOfDate) {
		return false;
	}
	return true;
}

function isEmployeeEligibleForPolicy(input: {
	eligibility: LeavePolicyEligibility;
	employmentStatus: import("../shared/employment-status").EmploymentStatus;
	tenureDays: number;
}): boolean {
	if (
		!input.eligibility.allowedEmploymentStatuses.includes(
			input.employmentStatus,
		)
	) {
		return false;
	}
	if (
		input.eligibility.minTenureDays !== null &&
		input.tenureDays < input.eligibility.minTenureDays
	) {
		return false;
	}
	return true;
}

export const leaveMemoryMethods = {
	async getLeavePolicyById(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
		},
	): Promise<Result<LeavePolicy | null>> {
		const policy = this.leavePolicies.get(input.policyId);
		if (!policy || policy.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...policy });
	},

	async getLeavePolicyEligibility(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
		},
	): Promise<Result<LeavePolicyEligibility | null>> {
		const eligibility = Array.from(this.leavePolicyEligibility.values()).find(
			(row) =>
				row.organizationId === input.organizationId &&
				row.policyId === input.policyId,
		);
		return ok(eligibility ? { ...eligibility } : null);
	},

	async resolveApplicableLeavePolicy(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyCode: string;
			employeeId: HumanResourcesEmployeeId;
			employmentId: HumanResourcesEmploymentId;
			asOfDate: string;
		},
	): Promise<Result<ResolvedLeavePolicy | null>> {
		const employment = await this.getEmploymentById({
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

		const candidates = Array.from(this.leavePolicies.values())
			.filter(
				(policy) =>
					policy.organizationId === input.organizationId &&
					policy.code === input.policyCode &&
					policy.status === "published" &&
					isPolicyEffectiveOn(policy, input.asOfDate),
			)
			.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
		if (candidates.length === 0) {
			return ok(null);
		}

		const policy = candidates[0];
		const eligibility = await this.getLeavePolicyEligibility({
			organizationId: input.organizationId,
			policyId: policy.id,
		});
		if (!eligibility.ok) return eligibility;
		if (eligibility.data === null) {
			return ok(null);
		}

		const eligible = isEmployeeEligibleForPolicy({
			eligibility: eligibility.data,
			employmentStatus: employment.data.status,
			tenureDays: tenureDaysOn(employment.data.startsOn, input.asOfDate),
		});
		if (!eligible) {
			return ok(null);
		}

		return ok({
			policy: { ...policy },
			eligibility: { ...eligibility.data },
		});
	},

	async getPrimaryManagerForEmployee(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			asOf: string;
		},
	): Promise<Result<HumanResourcesEmployeeId | null>> {
		const primary = await this.resolvePrimaryManager({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			asOf: input.asOf,
		});
		if (!primary.ok) return primary;
		return ok(primary.data?.managerEmployeeId ?? null);
	},

	async findLeavePolicyByCode(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			code: string;
			effectiveFrom: string;
		},
	): Promise<Result<LeavePolicy | null>> {
		const policy =
			Array.from(this.leavePolicies.values()).find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.code === input.code &&
					row.effectiveFrom === input.effectiveFrom,
			) ?? null;
		return ok(policy ? { ...policy } : null);
	},

	async createLeavePolicy(
		this: LeaveMemoryHost,
		record: LeavePolicyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>> {
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
		const now = new Date();
		const policy: LeavePolicy = {
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
			supersedesPolicyId: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		const eligibility: LeavePolicyEligibility = {
			id: randomUUID(),
			organizationId: record.organizationId,
			policyId: policy.id,
			minTenureDays: record.minTenureDays,
			allowedEmploymentStatuses: record.allowedEmploymentStatuses,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.leavePolicies.set(policy.id, policy);
		this.leavePolicyEligibility.set(eligibility.id, eligibility);

		const audit = await recordAudit(ports, {
			organizationId: policy.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_policy",
			entityId: policy.id,
			action: "CREATE",
		});
		if (!audit.ok) {
			this.leavePolicies.delete(policy.id);
			this.leavePolicyEligibility.delete(eligibility.id);
			return audit;
		}

		return ok({ ...policy });
	},

	async updateLeavePolicy(
		this: LeaveMemoryHost,
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
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>> {
		const policy = this.leavePolicies.get(input.policyId);
		if (!policy) return notFound("Leave policy not found");
		if (policy.organizationId !== input.organizationId) {
			return notFound(
				"Leave policy not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			policy.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const editable = assertLeavePolicyEditable(policy.status);
		if (!editable.ok) return editable;

		const previous = { ...policy };
		const now = new Date();
		const updated: LeavePolicy = {
			...policy,
			name: input.name ?? policy.name,
			paid: input.paid ?? policy.paid,
			sensitive: input.sensitive ?? policy.sensitive,
			allowsNegativeBalance:
				input.allowsNegativeBalance ?? policy.allowsNegativeBalance,
			allowSelfApproval: input.allowSelfApproval ?? policy.allowSelfApproval,
			allowsPartialDay: input.allowsPartialDay ?? policy.allowsPartialDay,
			effectiveTo:
				input.effectiveTo !== undefined ? input.effectiveTo : policy.effectiveTo,
			version: policy.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.leavePolicies.set(updated.id, updated);

		if (
			input.minTenureDays !== undefined ||
			input.allowedEmploymentStatuses !== undefined
		) {
			const eligibility = Array.from(this.leavePolicyEligibility.values()).find(
				(row) => row.policyId === policy.id,
			);
			if (eligibility) {
				this.leavePolicyEligibility.set(eligibility.id, {
					...eligibility,
					minTenureDays:
						input.minTenureDays !== undefined
							? input.minTenureDays
							: eligibility.minTenureDays,
					allowedEmploymentStatuses:
						input.allowedEmploymentStatuses ??
						eligibility.allowedEmploymentStatuses,
					updatedBy: input.actorUserId,
					updatedAt: now,
				});
			}
		}

		const audit = await recordAudit(ports, {
			organizationId: updated.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_leave_policy",
			entityId: updated.id,
			action: "UPDATE",
		});
		if (!audit.ok) {
			this.leavePolicies.set(updated.id, previous);
			return audit;
		}

		return ok({ ...updated });
	},

	async publishLeavePolicy(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>> {
		return transitionLeavePolicyStatus.call(this, {
			...input,
			nextStatus: "published",
			ports,
			meta,
		});
	},

	async supersedeLeavePolicy(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			code: string;
			name: string;
			leaveType: LeavePolicy["leaveType"];
			unit: LeavePolicy["unit"];
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
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>> {
		const existing = this.leavePolicies.get(input.policyId);
		if (!existing) return notFound("Leave policy not found");
		if (existing.organizationId !== input.organizationId) {
			return notFound(
				"Leave policy not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const superseded = await transitionLeavePolicyStatus.call(this, {
			organizationId: input.organizationId,
			policyId: input.policyId,
			expectedVersion: input.expectedVersion,
			actorUserId: input.actorUserId,
			nextStatus: "superseded",
			ports,
			meta,
		});
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

		const published: LeavePolicy = {
			...created.data,
			status: "published",
			supersedesPolicyId: input.policyId,
			version: 2,
			updatedBy: input.actorUserId,
			updatedAt: new Date(),
		};
		this.leavePolicies.set(published.id, published);
		return ok({ ...published });
	},

	async archiveLeavePolicy(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			policyId: HumanResourcesLeavePolicyId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeavePolicy>> {
		return transitionLeavePolicyStatus.call(this, {
			...input,
			nextStatus: "archived",
			ports,
			meta,
		});
	},

	async listLeavePolicies(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: LeavePolicyStatus;
		},
	): Promise<Result<LeavePolicyListPage>> {
		let policies = Array.from(this.leavePolicies.values()).filter(
			(row) => row.organizationId === input.organizationId,
		);
		if (input.status !== undefined) {
			policies = policies.filter((row) => row.status === input.status);
		}
		policies.sort((a, b) => a.code.localeCompare(b.code));
		const totalCount = policies.length;
		const start = (input.page - 1) * input.pageSize;
		return ok({
			policies: policies.slice(start, start + input.pageSize).map((p) => ({ ...p })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async getLeaveEntitlementById(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
		},
	): Promise<Result<LeaveEntitlement | null>> {
		const entitlement = this.leaveEntitlements.get(input.entitlementId);
		if (!entitlement || entitlement.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...entitlement });
	},

	async findLeaveEntitlementByIdempotencyKey(
		this: LeaveMemoryHost,
		input: { organizationId: string; idempotencyKey: string },
	): Promise<Result<IdempotentLeaveEntitlementRecord | null>> {
		const record =
			this.leaveEntitlementIdempotency.get(
				idempotencyKey(input.organizationId, input.idempotencyKey),
			) ?? null;
		return ok(record ? { ...record, entitlement: { ...record.entitlement } } : null);
	},

	async grantLeaveEntitlement(
		this: LeaveMemoryHost,
		record: LeaveEntitlementGrantRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>> {
		const policy = this.leavePolicies.get(record.policyId);
		if (!policy || policy.organizationId !== record.organizationId) {
			return notFound("Leave policy not found");
		}
		if (policy.status !== "published") {
			return invalidState("Leave policy must be published");
		}

		const entitlementId = parseHumanResourcesLeaveEntitlementId(randomUUID());
		if (!entitlementId.ok) return entitlementId;
		const now = new Date();
		const entitlement: LeaveEntitlement = {
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
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.leaveEntitlements.set(entitlement.id, entitlement);
		this.leaveEntitlementIdempotency.set(
			idempotencyKey(record.organizationId, record.createIdempotencyKey),
			{
				entitlement,
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await recordAudit(ports, {
			organizationId: entitlement.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_entitlement",
			entityId: entitlement.id,
			action: "CREATE",
		});
		if (!audit.ok) {
			this.leaveEntitlements.delete(entitlement.id);
			this.leaveEntitlementIdempotency.delete(
				idempotencyKey(record.organizationId, record.createIdempotencyKey),
			);
			return audit;
		}

		return ok({ ...entitlement });
	},

	async carryForwardLeaveEntitlement(
		this: LeaveMemoryHost,
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
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>> {
		const source = this.leaveEntitlements.get(input.entitlementId);
		if (!source) return notFound("Leave entitlement not found");
		if (source.organizationId !== input.organizationId) {
			return notFound(
				"Leave entitlement not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const transition = assertLeaveEntitlementStatusTransition(
			source.status,
			"carried_forward",
		);
		if (!transition.ok) return transition;

		const versionCheck = assertExpectedVersion(
			source.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const now = new Date();
		const previous = { ...source };
		const updated: LeaveEntitlement = {
			...source,
			status: "carried_forward",
			version: source.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		};
		this.leaveEntitlements.set(updated.id, updated);

		const granted = await this.grantLeaveEntitlement(
			{
				organizationId: input.organizationId,
				employeeId: source.employeeId,
				employmentId: source.employmentId,
				policyId: source.policyId,
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
		if (!granted.ok) {
			this.leaveEntitlements.set(updated.id, previous);
			return granted;
		}

		const carryAdjustment = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: granted.data.id,
				sourceRequestId: null,
				kind: "carry_forward",
				delta: input.carriedQuantity,
				reason: `Carry forward from entitlement ${source.id}`,
				source: "system",
				createIdempotencyKey: `${input.createIdempotencyKey}:carry`,
				createRequestFingerprint: input.createRequestFingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!carryAdjustment.ok) {
			this.leaveEntitlements.set(updated.id, previous);
			this.leaveEntitlements.delete(granted.data.id);
			return carryAdjustment;
		}

		return ok({ ...granted.data });
	},

	async expireLeaveEntitlement(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveEntitlement>> {
		return transitionLeaveEntitlementStatus.call(this, {
			...input,
			nextStatus: "expired",
			ports,
			meta,
		});
	},

	async adjustLeaveEntitlement(
		this: LeaveMemoryHost,
		record: LeaveAdjustmentCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveAdjustment>> {
		const entitlement = this.leaveEntitlements.get(record.entitlementId);
		if (!entitlement) return notFound("Leave entitlement not found");
		if (entitlement.organizationId !== record.organizationId) {
			return notFound(
				"Leave entitlement not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const active = assertLeaveEntitlementActive(entitlement.status);
		if (!active.ok) return active;

		const adjustmentId = parseHumanResourcesLeaveAdjustmentId(randomUUID());
		if (!adjustmentId.ok) return adjustmentId;
		const now = new Date();
		const adjustment: LeaveAdjustment = {
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
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		this.leaveAdjustments.set(adjustment.id, adjustment);

		const audit = await recordAudit(ports, {
			organizationId: adjustment.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_adjustment",
			entityId: adjustment.id,
			action: "CREATE",
		});
		if (!audit.ok) {
			this.leaveAdjustments.delete(adjustment.id);
			return audit;
		}

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
			if (!event.ok) {
				this.leaveAdjustments.delete(adjustment.id);
				return event;
			}
		}

		return ok({ ...adjustment });
	},

	async listLeaveEntitlements(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId;
			employmentId?: HumanResourcesEmploymentId;
			policyId?: HumanResourcesLeavePolicyId;
		},
	): Promise<Result<LeaveEntitlementListPage>> {
		let entitlements = Array.from(this.leaveEntitlements.values()).filter(
			(row) => row.organizationId === input.organizationId,
		);
		if (input.employeeId !== undefined) {
			entitlements = entitlements.filter(
				(row) => row.employeeId === input.employeeId,
			);
		}
		if (input.employmentId !== undefined) {
			entitlements = entitlements.filter(
				(row) => row.employmentId === input.employmentId,
			);
		}
		if (input.policyId !== undefined) {
			entitlements = entitlements.filter(
				(row) => row.policyId === input.policyId,
			);
		}
		entitlements.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
		const totalCount = entitlements.length;
		const start = (input.page - 1) * input.pageSize;
		return ok({
			entitlements: entitlements
				.slice(start, start + input.pageSize)
				.map((row) => ({ ...row })),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async listPostedLeaveAdjustments(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
		},
	): Promise<Result<LeaveAdjustment[]>> {
		const adjustments = postedAdjustmentsForEntitlement(
			this,
			input.entitlementId,
		).filter((row) => row.organizationId === input.organizationId);
		return ok(adjustments.map((row) => ({ ...row })));
	},

	async getLeaveBalance(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			entitlementId: HumanResourcesLeaveEntitlementId;
		},
	): Promise<Result<LeaveBalance | null>> {
		const entitlement = this.leaveEntitlements.get(input.entitlementId);
		if (!entitlement || entitlement.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok(resolveBalance(this, entitlement));
	},

	async getLeaveRequestById(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
		},
	): Promise<Result<LeaveRequest | null>> {
		const request = this.leaveRequests.get(input.requestId);
		if (!request || request.organizationId !== input.organizationId) {
			return ok(null);
		}
		return ok({ ...request });
	},

	async findLeaveRequestByIdempotencyKey(
		this: LeaveMemoryHost,
		input: { organizationId: string; idempotencyKey: string },
	): Promise<Result<IdempotentLeaveRequestRecord | null>> {
		const record =
			this.leaveRequestIdempotency.get(
				idempotencyKey(input.organizationId, input.idempotencyKey),
			) ?? null;
		return ok(record ? { ...record, request: { ...record.request } } : null);
	},

	async listLeaveRequestSegments(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
		},
	): Promise<Result<LeaveRequestSegment[]>> {
		const segments = Array.from(this.leaveRequestSegments.values()).filter(
			(row) =>
				row.organizationId === input.organizationId &&
				row.requestId === input.requestId,
		);
		segments.sort((a, b) => a.segmentDate.localeCompare(b.segmentDate));
		return ok(segments.map((row) => ({ ...row })));
	},

	async listOverlappingLeaveSegments(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			excludeRequestId?: HumanResourcesLeaveRequestId;
		},
	): Promise<Result<LeaveRequestSegment[]>> {
		const activeRequests = Array.from(this.leaveRequests.values()).filter(
			(request) =>
				request.organizationId === input.organizationId &&
				request.employeeId === input.employeeId &&
				activeOverlapStatuses().includes(request.status) &&
				request.id !== input.excludeRequestId,
		);
		const requestIds = new Set(activeRequests.map((request) => request.id));
		const segments = Array.from(this.leaveRequestSegments.values()).filter(
			(segment) =>
				segment.organizationId === input.organizationId &&
				requestIds.has(segment.requestId),
		);
		return ok(segments.map((row) => ({ ...row })));
	},

	async createDraftLeaveRequest(
		this: LeaveMemoryHost,
		record: LeaveRequestCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		const requestId = parseHumanResourcesLeaveRequestId(randomUUID());
		if (!requestId.ok) return requestId;
		const now = new Date();
		const request: LeaveRequest = {
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
			approvedAt: null,
			createIdempotencyKey: record.createIdempotencyKey,
			fingerprint: record.createRequestFingerprint,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};

		const segments: LeaveRequestSegment[] = [];
		for (const segment of record.segments) {
			const segmentId = parseHumanResourcesLeaveRequestSegmentId(randomUUID());
			if (!segmentId.ok) return segmentId;
			segments.push({
				id: segmentId.data,
				organizationId: record.organizationId,
				requestId: request.id,
				segmentDate: segment.segmentDate,
				quantity: segment.quantity,
				dayPortion: segment.dayPortion,
				createdAt: now,
				updatedAt: now,
			});
		}

		this.leaveRequests.set(request.id, request);
		for (const segment of segments) {
			this.leaveRequestSegments.set(segment.id, segment);
		}
		this.leaveRequestIdempotency.set(
			idempotencyKey(record.organizationId, record.createIdempotencyKey),
			{
				request,
				createRequestFingerprint: record.createRequestFingerprint,
			},
		);

		const audit = await recordAudit(ports, {
			organizationId: request.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_leave_request",
			entityId: request.id,
			action: "CREATE",
		});
		if (!audit.ok) {
			this.leaveRequests.delete(request.id);
			for (const segment of segments) {
				this.leaveRequestSegments.delete(segment.id);
			}
			this.leaveRequestIdempotency.delete(
				idempotencyKey(record.organizationId, record.createIdempotencyKey),
			);
			return audit;
		}

		return ok({ ...request });
	},

	async amendLeaveRequest(
		this: LeaveMemoryHost,
		record: LeaveRequestAmendRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		const request = this.leaveRequests.get(record.requestId);
		if (!request) return notFound("Leave request not found");
		if (request.organizationId !== record.organizationId) {
			return notFound(
				"Leave request not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
		const versionCheck = assertExpectedVersion(
			request.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		const amendable = assertLeaveRequestAmendable(request.status);
		if (!amendable.ok) return amendable;

		const previous = { ...request };
		const previousSegments = Array.from(this.leaveRequestSegments.values()).filter(
			(segment) => segment.requestId === request.id,
		);
		const now = new Date();
		const updated: LeaveRequest = {
			...request,
			startDate: record.startDate,
			endDate: record.endDate,
			requestedQuantity: record.requestedQuantity,
			isBackdated: record.isBackdated,
			backdateJustification: record.backdateJustification,
			version: request.version + 1,
			updatedBy: record.actorUserId,
			updatedAt: now,
		};
		this.leaveRequests.set(updated.id, updated);

		for (const segment of previousSegments) {
			this.leaveRequestSegments.delete(segment.id);
		}
		for (const segment of record.segments) {
			const segmentId = parseHumanResourcesLeaveRequestSegmentId(randomUUID());
			if (!segmentId.ok) {
				this.leaveRequests.set(updated.id, previous);
				for (const oldSegment of previousSegments) {
					this.leaveRequestSegments.set(oldSegment.id, oldSegment);
				}
				return segmentId;
			}
			this.leaveRequestSegments.set(segmentId.data, {
				id: segmentId.data,
				organizationId: record.organizationId,
				requestId: updated.id,
				segmentDate: segment.segmentDate,
				quantity: segment.quantity,
				dayPortion: segment.dayPortion,
				createdAt: now,
				updatedAt: now,
			});
		}

		const audit = await recordAudit(ports, {
			organizationId: updated.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_leave_request",
			entityId: updated.id,
			action: "UPDATE",
		});
		if (!audit.ok) {
			this.leaveRequests.set(updated.id, previous);
			for (const segment of Array.from(this.leaveRequestSegments.values()).filter(
				(row) => row.requestId === updated.id,
			)) {
				this.leaveRequestSegments.delete(segment.id);
			}
			for (const oldSegment of previousSegments) {
				this.leaveRequestSegments.set(oldSegment.id, oldSegment);
			}
			return audit;
		}

		return ok({ ...updated });
	},

	async submitLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		const transitioned = await transitionLeaveRequestStatus.call(this, {
			...input,
			nextStatus: "submitted",
			ports,
			meta,
			emitEvent: HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
		});
		return transitioned;
	},

	async approveLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		const request = this.leaveRequests.get(input.requestId);
		if (!request) return notFound("Leave request not found");
		if (request.organizationId !== input.organizationId) {
			return notFound(
				"Leave request not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const consumption = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: request.entitlementId,
				sourceRequestId: request.id,
				kind: "consumption",
				delta: negateLeaveQuantity(request.requestedQuantity),
				reason: `Approved leave request ${request.id}`,
				source: "approval",
				createIdempotencyKey: `${request.id}:consumption`,
				createRequestFingerprint: request.fingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!consumption.ok) return consumption;

		const approved = await transitionLeaveRequestStatus.call(this, {
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
		});
		if (!approved.ok) {
			this.leaveAdjustments.delete(consumption.data.id);
			return approved;
		}

		return approved;
	},

	async rejectLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		return transitionLeaveRequestStatus.call(this, {
			...input,
			nextStatus: "rejected",
			decision: "rejected",
			ports,
			meta,
			emitEvent: HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
		});
	},

	async returnLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		return transitionLeaveRequestStatus.call(this, {
			...input,
			nextStatus: "returned",
			decision: "returned",
			ports,
			meta,
		});
	},

	async withdrawLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		return transitionLeaveRequestStatus.call(this, {
			...input,
			nextStatus: "withdrawn",
			ports,
			meta,
		});
	},

	async cancelApprovedLeaveRequest(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			note: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<LeaveRequest>> {
		const request = this.leaveRequests.get(input.requestId);
		if (!request) return notFound("Leave request not found");
		if (request.organizationId !== input.organizationId) {
			return notFound(
				"Leave request not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}

		const reversal = await this.adjustLeaveEntitlement(
			{
				organizationId: input.organizationId,
				entitlementId: request.entitlementId,
				sourceRequestId: request.id,
				kind: "cancellation_reversal",
				delta: request.requestedQuantity,
				reason: `Cancelled approved leave request ${request.id}`,
				source: "cancellation",
				createIdempotencyKey: `${request.id}:reversal`,
				createRequestFingerprint: request.fingerprint,
				createdBy: input.actorUserId,
			},
			ports,
			meta,
		);
		if (!reversal.ok) return reversal;

		return transitionLeaveRequestStatus.call(this, {
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

	async listLeaveRequests(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			page: number;
			pageSize: number;
			employeeId?: HumanResourcesEmployeeId;
			status?: LeaveRequestStatus;
		},
	): Promise<Result<LeaveRequestListPage>> {
		let requests = Array.from(this.leaveRequests.values()).filter(
			(row) => row.organizationId === input.organizationId,
		);
		if (input.employeeId !== undefined) {
			requests = requests.filter((row) => row.employeeId === input.employeeId);
		}
		if (input.status !== undefined) {
			requests = requests.filter((row) => row.status === input.status);
		}
		requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
		const totalCount = requests.length;
		const start = (input.page - 1) * input.pageSize;
		return ok({
			requests: requests.slice(start, start + input.pageSize).map((row) => ({
				...row,
			})),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async listPendingApprovalLeaveRequests(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
		},
	): Promise<Result<LeaveRequestListPage>> {
		const directReports = await this.listDirectReports({
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

		let requests = Array.from(this.leaveRequests.values()).filter(
			(request) =>
				request.organizationId === input.organizationId &&
				request.status === "submitted" &&
				reportIds.has(request.employeeId),
		);
		requests.sort((a, b) => a.startDate.localeCompare(b.startDate));
		const totalCount = requests.length;
		const start = (input.page - 1) * input.pageSize;
		return ok({
			requests: requests.slice(start, start + input.pageSize).map((row) => ({
				...row,
			})),
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async listTeamCalendarLeaveRequests(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			managerEmployeeId: HumanResourcesEmployeeId;
			rangeStart: string;
			rangeEnd: string;
			page: number;
			pageSize: number;
		},
	): Promise<Result<TeamCalendarLeavePage>> {
		const directReports = await this.listDirectReports({
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

		let requests = Array.from(this.leaveRequests.values()).filter(
			(request) =>
				request.organizationId === input.organizationId &&
				(request.status === "approved" || request.status === "submitted") &&
				reportIds.has(request.employeeId) &&
				request.endDate >= input.rangeStart &&
				request.startDate <= input.rangeEnd,
		);
		requests.sort((a, b) => a.startDate.localeCompare(b.startDate));
		const totalCount = requests.length;
		const start = (input.page - 1) * input.pageSize;
		const pageRequests = requests.slice(start, start + input.pageSize);
		const entries = await Promise.all(
			pageRequests.map(async (request) => {
				const segments = await this.listLeaveRequestSegments({
					organizationId: input.organizationId,
					requestId: request.id,
				});
				return {
					request: { ...request },
					segments: segments.ok ? segments.data : [],
				};
			}),
		);

		return ok({
			entries,
			totalCount,
			page: input.page,
			pageSize: input.pageSize,
		});
	},

	async getApprovedLeaveHandoff(
		this: LeaveMemoryHost,
		input: {
			organizationId: string;
			requestId: HumanResourcesLeaveRequestId;
			correlationId: string;
		},
	): Promise<Result<ApprovedLeaveHandoff | null>> {
		const request = this.leaveRequests.get(input.requestId);
		if (!request || request.organizationId !== input.organizationId) {
			return ok(null);
		}
		if (request.status !== "approved" || request.approvedAt === null) {
			return ok(null);
		}

		const policy = this.leavePolicies.get(request.policyId);
		if (!policy || policy.organizationId !== input.organizationId) {
			return ok(null);
		}

		const segments = await this.listLeaveRequestSegments({
			organizationId: input.organizationId,
			requestId: request.id,
		});
		if (!segments.ok) return segments;

		return ok({
			organizationId: input.organizationId,
			employeeId: request.employeeId,
			employmentId: request.employmentId,
			requestId: request.id,
			policyId: request.policyId,
			policyVersion: policy.version,
			paid: policy.paid,
			unit: request.unit,
			startDate: request.startDate,
			endDate: request.endDate,
			quantity: request.requestedQuantity,
			segments: segments.data.map((segment) => ({
				date: segment.segmentDate,
				quantity: segment.quantity,
				dayPortion: segment.dayPortion,
			})),
			approvedAt: request.approvedAt.toISOString(),
			correlationId: input.correlationId,
		});
	},
} satisfies Partial<HumanResourcesStore>;

export function attachLeaveMemory<T extends LeaveMemoryAttachmentTarget>(
	target: T,
): T & typeof leaveMemoryMethods {
	return Object.assign(target, leaveMemoryMethods);
}

async function transitionLeavePolicyStatus(
	this: LeaveMemoryHost,
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
	const policy = this.leavePolicies.get(input.policyId);
	if (!policy) return notFound("Leave policy not found");
	if (policy.organizationId !== input.organizationId) {
		return notFound(
			"Leave policy not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		policy.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeavePolicyStatusTransition(
		policy.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const previous = { ...policy };
	const now = new Date();
	const updated: LeavePolicy = {
		...policy,
		status: input.nextStatus,
		version: policy.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	this.leavePolicies.set(updated.id, updated);

	const audit = await recordAudit(input.ports, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_policy",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		this.leavePolicies.set(updated.id, previous);
		return audit;
	}

	return ok({ ...updated });
}

async function transitionLeaveEntitlementStatus(
	this: LeaveMemoryHost,
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
	const entitlement = this.leaveEntitlements.get(input.entitlementId);
	if (!entitlement) return notFound("Leave entitlement not found");
	if (entitlement.organizationId !== input.organizationId) {
		return notFound(
			"Leave entitlement not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		entitlement.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeaveEntitlementStatusTransition(
		entitlement.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const previous = { ...entitlement };
	const now = new Date();
	const updated: LeaveEntitlement = {
		...entitlement,
		status: input.nextStatus,
		version: entitlement.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	this.leaveEntitlements.set(updated.id, updated);

	const audit = await recordAudit(input.ports, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_entitlement",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		this.leaveEntitlements.set(updated.id, previous);
		return audit;
	}

	if (input.nextStatus === "expired") {
		const balance = resolveBalance(this, updated);
		if (balance.balance !== "0") {
			const expiry = await this.adjustLeaveEntitlement(
				{
					organizationId: input.organizationId,
					entitlementId: updated.id,
					sourceRequestId: null,
					kind: "expiry",
					delta: negateLeaveQuantity(balance.balance),
					reason: "Entitlement expired",
					source: "system",
					createIdempotencyKey: `${updated.id}:expiry`,
					createRequestFingerprint: updated.fingerprint,
					createdBy: input.actorUserId,
				},
				input.ports,
				input.meta,
			);
			if (!expiry.ok) {
				this.leaveEntitlements.set(updated.id, previous);
				return expiry;
			}
		}
	}

	return ok({ ...updated });
}

async function transitionLeaveRequestStatus(
	this: LeaveMemoryHost,
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
		emitEvent?: HumanResourcesEventType;
		approvedAt?: Date;
	},
): Promise<Result<LeaveRequest>> {
	const request = this.leaveRequests.get(input.requestId);
	if (!request) return notFound("Leave request not found");
	if (request.organizationId !== input.organizationId) {
		return notFound(
			"Leave request not found",
			HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
		);
	}
	const versionCheck = assertExpectedVersion(
		request.version,
		input.expectedVersion,
	);
	if (!versionCheck.ok) return versionCheck;
	const transition = assertLeaveRequestStatusTransition(
		request.status,
		input.nextStatus,
	);
	if (!transition.ok) return transition;

	const previous = { ...request };
	const now = new Date();
	const updated: LeaveRequest = {
		...request,
		status: input.nextStatus,
		approvedAt: input.approvedAt ?? request.approvedAt,
		version: request.version + 1,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	this.leaveRequests.set(updated.id, updated);

	if (input.decision !== undefined) {
		const decisionId = parseHumanResourcesLeaveApprovalDecisionId(randomUUID());
		if (!decisionId.ok) {
			this.leaveRequests.set(updated.id, previous);
			return decisionId;
		}
		this.leaveApprovalDecisions.set(decisionId.data, {
			requestId: updated.id,
			decision: input.decision,
		});
	}

	const audit = await recordAudit(input.ports, {
		organizationId: updated.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.meta.correlationId,
		entity: "hr_leave_request",
		entityId: updated.id,
		action: "UPDATE",
	});
	if (!audit.ok) {
		this.leaveRequests.set(updated.id, previous);
		return audit;
	}

	if (input.emitEvent !== undefined) {
		const event = await emitOutbox(input.ports, {
			organizationId: updated.organizationId,
			eventType: input.emitEvent,
			entityType: "hr_leave_request",
			entityId: updated.id,
			actorId: input.actorUserId,
			correlationId: input.meta.correlationId,
		});
		if (!event.ok) {
			this.leaveRequests.set(updated.id, previous);
			return event;
		}
	}

	return ok({ ...updated });
}
