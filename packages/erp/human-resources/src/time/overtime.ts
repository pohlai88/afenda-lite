import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
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
} from "../module-ids";
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
} from "../schemas/time";
import { runTimeCommand, runTimeQuery } from "../shared/time-command";
import { resolveActiveTimeEmployment } from "../shared/time-employment";
import type { OvertimeRequest } from "../types";

export async function createOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return runTimeCommand(input, options, {
		schema: createOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request create input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CREATE,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.requestedStartsAt.slice(0, 10),
			});
			if (!employment.ok) return employment;
			const requestedStartsAt = new Date(data.requestedStartsAt);
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
	return runTimeCommand(input, options, {
		schema: approveOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request approve input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_APPROVE,
		execute: async (data, { store, ports }) =>
			store.approveOvertimeRequest(data, ports),
	});
}

export async function rejectOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return runTimeCommand(input, options, {
		schema: rejectOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request reject input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_REJECT,
		execute: async (data, { store, ports }) =>
			store.rejectOvertimeRequest(data, ports),
	});
}

export async function cancelOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return runTimeCommand(input, options, {
		schema: cancelOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request cancel input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_CANCEL,
		execute: async (data, { store, ports }) =>
			store.cancelOvertimeRequest(data, ports),
	});
}

export async function recordOvertimeActual(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return runTimeCommand(input, options, {
		schema: recordOvertimeActualInputSchema,
		invalidMessage: "Invalid overtime actual record input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_RECORD_ACTUAL,
		execute: async (data, { store, ports }) =>
			store.recordOvertimeActual(data, ports),
	});
}

export async function verifyOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest>> {
	return runTimeCommand(input, options, {
		schema: verifyOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request verify input",
		command: HUMAN_RESOURCES_COMMAND_OVERTIME_REQUEST_VERIFY,
		execute: async (data, { store, ports }) =>
			store.verifyOvertimeRequest(data, ports),
	});
}

export async function getOvertimeRequest(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest | null>> {
	return runTimeQuery(input, options, {
		schema: getOvertimeRequestInputSchema,
		invalidMessage: "Invalid overtime request get input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_GET,
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
	return runTimeQuery(input, options, {
		schema: listOvertimeRequestsInputSchema,
		invalidMessage: "Invalid overtime request list input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST,
		execute: async (data, { store }) => store.listOvertimeRequests(data),
	});
}

export async function listPendingOvertimeApprovals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OvertimeRequest[]>> {
	return runTimeQuery(input, options, {
		schema: listPendingOvertimeApprovalsInputSchema,
		invalidMessage: "Invalid pending overtime approvals list input",
		query: HUMAN_RESOURCES_QUERY_OVERTIME_REQUEST_LIST_PENDING_APPROVAL,
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
