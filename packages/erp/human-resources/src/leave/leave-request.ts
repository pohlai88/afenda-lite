import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
	HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR,
} from "../module-ids";
import {
	amendLeaveRequestInputSchema,
	approveLeaveRequestInputSchema,
	cancelApprovedLeaveRequestInputSchema,
	createDraftLeaveRequestInputSchema,
	getApprovedLeaveHandoffInputSchema,
	getLeaveRequestInputSchema,
	listLeaveRequestsInputSchema,
	listPendingApprovalLeaveRequestsInputSchema,
	listTeamCalendarLeaveRequestsInputSchema,
	rejectLeaveRequestInputSchema,
	returnLeaveRequestInputSchema,
	submitLeaveRequestInputSchema,
	withdrawLeaveRequestInputSchema,
} from "../schemas";
import { fingerprintLeaveRequestCreate } from "../shared/fingerprint";
import {
	assertLeaveRequestSensitiveReadAllowed,
	requireLeaveCancelApprovedPermission,
	requireLeaveRequestBackdatePermission,
	runLeaveCommand,
	runLeaveQuery,
} from "../shared/leave-command";
import {
	assertApprovalDecisionMatchesRequestTransition,
	assertApproverIsPrimaryManager,
	assertEmploymentActiveForLeave,
	assertLeaveEntitlementActive,
	assertLeavePolicyPublished,
	assertLeaveRequestAmendable,
	assertNoLeaveOverlap,
	assertNoSelfApproval,
	assertSufficientLeaveBalance,
} from "../shared/leave-guards";
import type { HumanResourcesStore } from "../store";
import type {
	ApprovedLeaveHandoff,
	LeaveRequest,
	LeaveRequestListPage,
	TeamCalendarLeavePage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST = "leave_request" as const;
export type HumanResourcesLeaveRequestAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEAVE_REQUEST;

async function assertPrimaryManagerWhenAssigned(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		managerEmployeeId?: HumanResourcesEmployeeId;
		asOf: string;
	},
): Promise<Result<void>> {
	const primary = await store.getPrimaryManagerForEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		asOf: input.asOf,
	});
	if (!primary.ok) return primary;
	if (primary.data === null) {
		return ok(undefined);
	}
	if (input.managerEmployeeId === undefined) {
		return fail(
			"FORBIDDEN",
			"Primary manager employee id is required",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}
	const managerCheck = assertApproverIsPrimaryManager({
		approverEmployeeId: input.managerEmployeeId,
		primaryManagerEmployeeId: primary.data,
	});
	if (!managerCheck.ok) {
		return fail(
			"FORBIDDEN",
			managerCheck.message,
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
		);
	}
	return ok(undefined);
}

export async function createDraftLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: createDraftLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request create input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		execute: async (data, { store, ports, workCalendar, authorization }) => {
			if (data.isBackdated === true) {
				const backdate = await requireLeaveRequestBackdatePermission(
					authorization,
					{
						organizationId: data.organizationId,
						actorUserId: data.actorUserId,
					},
				);
				if (!backdate.ok) return backdate;
			}

			const fingerprint = fingerprintLeaveRequestCreate({
				employeeId: data.employeeId,
				entitlementId: data.entitlementId,
				startDate: data.startDate,
				endDate: data.endDate,
				requestedQuantity: data.requestedQuantity,
			});

			const existing = await store.findLeaveRequestByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.request);
			}

			const entitlement = await store.getLeaveEntitlementById({
				organizationId: data.organizationId,
				entitlementId: data.entitlementId,
			});
			if (!entitlement.ok) return entitlement;
			if (entitlement.data === null) {
				return fail("NOT_FOUND", "Leave entitlement not found");
			}
			const activeEntitlement = assertLeaveEntitlementActive(
				entitlement.data.status,
			);
			if (!activeEntitlement.ok) return activeEntitlement;

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: entitlement.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}
			const published = assertLeavePolicyPublished(policy.data.status);
			if (!published.ok) return published;

			const employment = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: entitlement.data.employmentId,
			});
			if (!employment.ok) return employment;
			if (employment.data === null) {
				return fail("NOT_FOUND", "Employment not found");
			}
			const employmentActive = assertEmploymentActiveForLeave({
				employmentStatus: employment.data.status,
				endsOn: employment.data.endsOn,
				asOfDate: data.startDate,
			});
			if (!employmentActive.ok) return employmentActive;

			const expanded = await workCalendar.expandLeaveSegments({
				organizationId: data.organizationId,
				startDate: data.startDate,
				endDate: data.endDate,
				unit: policy.data.unit,
				partialDay: data.dayPortion,
			});
			if (!expanded.ok) return expanded;

			return store.createDraftLeaveRequest(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: entitlement.data.employmentId,
					entitlementId: data.entitlementId,
					policyId: entitlement.data.policyId,
					startDate: data.startDate,
					endDate: data.endDate,
					requestedQuantity: data.requestedQuantity,
					unit: policy.data.unit,
					isBackdated: data.isBackdated ?? false,
					backdateJustification: data.backdateJustification ?? null,
					segments: expanded.data.map((segment) => ({
						segmentDate: segment.date,
						quantity: segment.quantity,
						dayPortion: segment.dayPortion,
					})),
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function amendLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: amendLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request amend input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_AMEND,
		execute: async (data, { store, ports, workCalendar, authorization }) => {
			if (data.isBackdated === true) {
				const backdate = await requireLeaveRequestBackdatePermission(
					authorization,
					{
						organizationId: data.organizationId,
						actorUserId: data.actorUserId,
					},
				);
				if (!backdate.ok) return backdate;
			}

			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return fail("NOT_FOUND", "Leave request not found");
			}

			const amendable = assertLeaveRequestAmendable(request.data.status);
			if (!amendable.ok) return amendable;

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}

			const expanded = await workCalendar.expandLeaveSegments({
				organizationId: data.organizationId,
				startDate: data.startDate,
				endDate: data.endDate,
				unit: policy.data.unit,
				partialDay: data.dayPortion,
			});
			if (!expanded.ok) return expanded;

			return store.amendLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					startDate: data.startDate,
					endDate: data.endDate,
					requestedQuantity: data.requestedQuantity,
					isBackdated: data.isBackdated ?? request.data.isBackdated,
					backdateJustification:
						data.backdateJustification !== undefined
							? data.backdateJustification
							: request.data.backdateJustification,
					segments: expanded.data.map((segment) => ({
						segmentDate: segment.date,
						quantity: segment.quantity,
						dayPortion: segment.dayPortion,
					})),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function submitLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: submitLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request submit input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_SUBMIT,
		execute: async (data, { store, ports }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return fail("NOT_FOUND", "Leave request not found");
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}

			const balance = await store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: request.data.entitlementId,
			});
			if (!balance.ok) return balance;
			if (balance.data === null) {
				return fail("NOT_FOUND", "Leave entitlement not found");
			}

			const sufficient = assertSufficientLeaveBalance({
				balance: balance.data.balance,
				requestedQuantity: request.data.requestedQuantity,
				allowsNegativeBalance: policy.data.allowsNegativeBalance,
			});
			if (!sufficient.ok) return sufficient;

			const candidateSegments = await store.listLeaveRequestSegments({
				organizationId: data.organizationId,
				requestId: request.data.id,
			});
			if (!candidateSegments.ok) return candidateSegments;

			const existingSegments = await store.listOverlappingLeaveSegments({
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				excludeRequestId: request.data.id,
			});
			if (!existingSegments.ok) return existingSegments;

			const overlap = assertNoLeaveOverlap(
				candidateSegments.data,
				existingSegments.data,
			);
			if (!overlap.ok) return overlap;

			return store.submitLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function approveLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: approveLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request approve input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_APPROVE,
		execute: async (data, { store, ports }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return fail("NOT_FOUND", "Leave request not found");
			}

			const managerCheck = await assertPrimaryManagerWhenAssigned(store, {
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				managerEmployeeId: data.managerEmployeeId,
				asOf: request.data.startDate,
			});
			if (!managerCheck.ok) return managerCheck;

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}

			const selfApproval = assertNoSelfApproval({
				employeeUserId: request.data.createdBy,
				approverUserId: data.actorUserId,
				allowSelfApproval: policy.data.allowSelfApproval,
			});
			if (!selfApproval.ok) {
				return fail(
					"FORBIDDEN",
					selfApproval.message,
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				);
			}

			const decision = assertApprovalDecisionMatchesRequestTransition({
				decision: "approved",
				nextStatus: "approved",
			});
			if (!decision.ok) return decision;

			const balance = await store.getLeaveBalance({
				organizationId: data.organizationId,
				entitlementId: request.data.entitlementId,
			});
			if (!balance.ok) return balance;
			if (balance.data === null) {
				return fail("NOT_FOUND", "Leave entitlement not found");
			}

			const sufficient = assertSufficientLeaveBalance({
				balance: balance.data.balance,
				requestedQuantity: request.data.requestedQuantity,
				allowsNegativeBalance: policy.data.allowsNegativeBalance,
			});
			if (!sufficient.ok) return sufficient;

			return store.approveLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function rejectLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: rejectLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request reject input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_REJECT,
		execute: async (data, { store, ports }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return fail("NOT_FOUND", "Leave request not found");
			}

			const managerCheck = await assertPrimaryManagerWhenAssigned(store, {
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				managerEmployeeId: data.managerEmployeeId,
				asOf: request.data.startDate,
			});
			if (!managerCheck.ok) return managerCheck;

			return store.rejectLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function returnLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: returnLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request return input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_RETURN,
		execute: async (data, { store, ports }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return fail("NOT_FOUND", "Leave request not found");
			}

			const managerCheck = await assertPrimaryManagerWhenAssigned(store, {
				organizationId: data.organizationId,
				employeeId: request.data.employeeId,
				managerEmployeeId: data.managerEmployeeId,
				asOf: request.data.startDate,
			});
			if (!managerCheck.ok) return managerCheck;

			return store.returnLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function withdrawLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: withdrawLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request withdraw input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_WITHDRAW,
		execute: (data, { store, ports }) =>
			store.withdrawLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelApprovedLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest>> {
	return runLeaveCommand(input, options, {
		schema: cancelApprovedLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request cancel input",
		command: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CANCEL_APPROVED,
		authorize: (authorization, data) =>
			requireLeaveCancelApprovedPermission(authorization, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			}),
		execute: (data, { store, ports }) =>
			store.cancelApprovedLeaveRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					note: data.note ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getLeaveRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequest | null>> {
	return runLeaveQuery(input, options, {
		schema: getLeaveRequestInputSchema,
		invalidMessage: "Invalid leave request get input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
		execute: async (data, { store, authorization }) => {
			const request = await store.getLeaveRequestById({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!request.ok) return request;
			if (request.data === null) {
				return ok(null);
			}

			const policy = await store.getLeavePolicyById({
				organizationId: data.organizationId,
				policyId: request.data.policyId,
			});
			if (!policy.ok) return policy;
			if (policy.data === null) {
				return fail("NOT_FOUND", "Leave policy not found");
			}

			const sensitive = await assertLeaveRequestSensitiveReadAllowed(
				authorization,
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					request: request.data,
					policy: policy.data,
				},
			);
			if (!sensitive.ok) return sensitive;

			return ok(request.data);
		},
	});
}

export async function listLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequestListPage>> {
	return runLeaveQuery(input, options, {
		schema: listLeaveRequestsInputSchema,
		invalidMessage: "Invalid leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST,
		execute: async (data, { store, authorization }) => {
			const page = await store.listLeaveRequests({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId: data.employeeId,
				status: data.status,
			});
			if (!page.ok) return page;

			const filtered: LeaveRequest[] = [];
			for (const request of page.data.requests) {
				const policy = await store.getLeavePolicyById({
					organizationId: data.organizationId,
					policyId: request.policyId,
				});
				if (!policy.ok) return policy;
				if (policy.data === null) {
					return fail("NOT_FOUND", "Leave policy not found");
				}
				const sensitive = await assertLeaveRequestSensitiveReadAllowed(
					authorization,
					{
						organizationId: data.organizationId,
						actorUserId: data.actorUserId,
						request,
						policy: policy.data,
					},
				);
				if (!sensitive.ok) {
					continue;
				}
				filtered.push(request);
			}

			return ok({
				...page.data,
				requests: filtered,
				totalCount: filtered.length,
			});
		},
	});
}

export async function listPendingApprovalLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LeaveRequestListPage>> {
	return runLeaveQuery(input, options, {
		schema: listPendingApprovalLeaveRequestsInputSchema,
		invalidMessage: "Invalid pending approval leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_LIST_PENDING_APPROVAL,
		execute: (data, { store }) =>
			store.listPendingApprovalLeaveRequests({
				organizationId: data.organizationId,
				managerEmployeeId: data.managerEmployeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}

export async function listTeamCalendarLeaveRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TeamCalendarLeavePage>> {
	return runLeaveQuery(input, options, {
		schema: listTeamCalendarLeaveRequestsInputSchema,
		invalidMessage: "Invalid team calendar leave request list input",
		query: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_TEAM_CALENDAR,
		execute: (data, { store }) =>
			store.listTeamCalendarLeaveRequests({
				organizationId: data.organizationId,
				managerEmployeeId: data.managerEmployeeId,
				rangeStart: data.rangeStart,
				rangeEnd: data.rangeEnd,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}

export async function getApprovedLeaveHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedLeaveHandoff | null>> {
	return runLeaveQuery(input, options, {
		schema: getApprovedLeaveHandoffInputSchema,
		invalidMessage: "Invalid approved leave handoff input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_LEAVE_HANDOFF_GET,
		execute: (data, { store }) =>
			store.getApprovedLeaveHandoff({
				organizationId: data.organizationId,
				requestId: data.requestId,
				correlationId: data.correlationId,
			}),
	});
}
