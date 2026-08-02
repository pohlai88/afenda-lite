import { errorResult, type Result } from "@afenda/errors";
import type { OvertimeRequest } from "../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { resolveAssignmentContext } from "../../kernel/execution/command-options";
import { notFound } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
	HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST,
	HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL,
} from "../../kernel/operations/module-ids";
import type { EmployeeWorkCalendarStoreSlice } from "./employee-work-calendar-resolution";
import { resolveActiveTimeEmployment } from "./employment";
import { resolveEmploymentOrganizationLocalWorkDate } from "./org-local-work-date";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "./run-operation";
import {
	approveOvertimeRequestInputSchema,
	cancelOvertimeRequestInputSchema,
	createOvertimeRequestInputSchema,
	getOvertimeRequestInputSchema,
	listOvertimeRequestsInputSchema,
	listPendingOvertimeApprovalsInputSchema,
	recordOvertimeActualInputSchema,
	rejectOvertimeRequestInputSchema,
	verifyOvertimeRequestInputSchema,
} from "./schema";

async function resolveOvertimeOrganizationLocalWorkDate(
	input: {
		organizationId: string;
		employeeId: string;
		employmentId: string;
		instant: Date;
	},
	deps: {
		store: EmployeeWorkCalendarStoreSlice;
		options: HumanResourcesCommandOptions;
	},
): Promise<Result<{ workDate: string; timezone: string }>> {
	return await resolveEmploymentOrganizationLocalWorkDate(input, {
		store: deps.store,
		assignmentContext: resolveAssignmentContext(deps.options),
	});
}

export async function createOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: createOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request create input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
		storeMethods: [
			"createOvertimeRequest",
			"findEmploymentByEmployeeAsOf",
			"findOvertimeRequestByIdempotencyKey",
			"getEmploymentById",
			"getWorkCalendar",
			"listWorkCalendarScopeAssignments",
			"listWorkCalendars",
			"resolveEmploymentCalendar",
		],
		execute: async (data, { store, ports }) => {
			const requestedStartsAt = new Date(data.requestedStartsAt);
			const provisionalWorkDate = data.requestedStartsAt.slice(0, 10);
			const provisionalEmployment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: provisionalWorkDate,
			});
			if (!provisionalEmployment.ok) {
				return provisionalEmployment;
			}

			const orgLocal = await resolveOvertimeOrganizationLocalWorkDate(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: provisionalEmployment.data.id,
					instant: requestedStartsAt,
				},
				{ store, options },
			);
			if (!orgLocal.ok) {
				return orgLocal;
			}

			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: provisionalEmployment.data.id,
				workDate: orgLocal.data.workDate,
			});
			if (!employment.ok) {
				return employment;
			}
			const requestedEndsAt = new Date(data.requestedEndsAt);
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				overtimeType: data.overtimeType,
				requestedStartsAt: requestedStartsAt.toISOString(),
				requestedEndsAt: requestedEndsAt.toISOString(),
				requestedMinutes: data.requestedMinutes,
				reason: data.reason,
			});
			const existing = await store.findOvertimeRequestByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existing.data.request);
			}
			return store.createOvertimeRequest(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					overtimeType: data.overtimeType,
					requestedStartsAt,
					requestedEndsAt,
					requestedMinutes: data.requestedMinutes,
					reason: data.reason,
					evidenceReference: data.evidenceReference ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function approveOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: approveOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request approve input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
		storeMethods: [
			"approveOvertimeRequest",
			"getOvertimeRequest",
			"getWorkCalendar",
			"listWorkCalendarScopeAssignments",
			"listWorkCalendars",
			"resolveEmploymentCalendar",
			"resolveTimeApprovalAuthority",
		],
		execute: async (data, { store, ports }) => {
			const existing = await store.getOvertimeRequest({
				organizationId: data.organizationId,
				requestId: data.requestId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return notFound("Overtime request not found");
			}
			if (existing.data.employmentId === null) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}
			const orgLocal = await resolveOvertimeOrganizationLocalWorkDate(
				{
					organizationId: data.organizationId,
					employeeId: existing.data.employeeId,
					employmentId: existing.data.employmentId,
					instant: existing.data.requestedStartsAt,
				},
				{ store, options },
			);
			if (!orgLocal.ok) {
				return orgLocal;
			}
			const asOf = orgLocal.data.workDate;
			const resolvedAssignment = await store.resolveTimeApprovalAuthority({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				authority: data.requestedAuthority,
				asOf,
			});
			if (!resolvedAssignment.ok) {
				return resolvedAssignment;
			}
			if (resolvedAssignment.data === null) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
			}
			return store.approveOvertimeRequest(
				{
					organizationId: data.organizationId,
					requestId: data.requestId,
					authority: resolvedAssignment.data.authority,
					approvedMaximumMinutes: data.approvedMaximumMinutes,
					comment: data.comment ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function rejectOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: rejectOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request reject input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
		storeMethods: ["rejectOvertimeRequest"],
		execute: async (data, { store, ports }) =>
			store.rejectOvertimeRequest(data, ports),
	});
}

export async function cancelOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: cancelOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request cancel input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
		storeMethods: ["cancelOvertimeRequest"],
		execute: async (data, { store, ports }) =>
			store.cancelOvertimeRequest(data, ports),
	});
}

export async function recordOvertimeActual(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: recordOvertimeActualInputSchema,
		invalidMessage: "Invalid overtime actual record input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
		storeMethods: ["recordOvertimeActual"],
		execute: async (data, { store, ports }) =>
			store.recordOvertimeActual(data, ports),
	});
}

export async function verifyOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: verifyOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request verify input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
		storeMethods: ["verifyOvertimeRequest"],
		execute: async (data, { store, ports }) =>
			store.verifyOvertimeRequest(data, ports),
	});
}

export async function getOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request get input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET,
		storeMethods: ["getOvertimeRequest"],
		execute: async (data, { store }) =>
			store.getOvertimeRequest({
				organizationId: data.organizationId,
				requestId: data.requestId,
			}),
	});
}

export async function listOvertimeRequests(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listOvertimeRequestsInputSchema,
		invalidMessage: "Invalid overtime request list input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST,
		storeMethods: ["listOvertimeRequests"],
		execute: async (data, { store }) => store.listOvertimeRequests(data),
	});
}

export async function listPendingOvertimeApprovals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listPendingOvertimeApprovalsInputSchema,
		invalidMessage: "Invalid pending overtime approvals list input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL,
		storeMethods: ["listOvertimeRequests"],
		execute: async (data, { store }) =>
			store.listOvertimeRequests({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				status: "requested",
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}
