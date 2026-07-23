import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED,
} from "../../module-ids";
import {
	createAttendanceExceptionInputSchema,
	excuseAttendanceExceptionInputSchema,
	getAttendanceExceptionInputSchema,
	listAttendanceExceptionsInputSchema,
	listUnresolvedAttendanceExceptionsInputSchema,
	rejectAttendanceExceptionInputSchema,
	resolveAttendanceExceptionInputSchema,
	reviewAttendanceExceptionInputSchema,
} from "../../schemas/time";
import { runTimeCommand, runTimeQuery } from "../../shared/time-command";
import type { AttendanceException } from "../../types";

export async function createAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return runTimeCommand(input, options, {
		schema: createAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception create input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
		execute: async (data, { store, ports }) =>
			store.createAttendanceException(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					sessionId: data.sessionId ?? null,
					eventId: data.eventId ?? null,
					shiftAssignmentId: data.shiftAssignmentId ?? null,
					exceptionType: data.exceptionType,
					severity: data.severity,
					remarks: data.remarks ?? null,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function reviewAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return runTimeCommand(input, options, {
		schema: reviewAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception review input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
		execute: async (data, { store, ports }) =>
			store.reviewAttendanceException(data, ports),
	});
}

export async function excuseAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return runTimeCommand(input, options, {
		schema: excuseAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception excuse input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
		execute: async (data, { store, ports }) =>
			store.excuseAttendanceException(
				{
					organizationId: data.organizationId,
					exceptionId: data.exceptionId,
					resolution: data.resolution,
					evidenceReference: data.evidenceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function rejectAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return runTimeCommand(input, options, {
		schema: rejectAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception reject input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
		execute: async (data, { store, ports }) =>
			store.rejectAttendanceException(data, ports),
	});
}

export async function resolveAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return runTimeCommand(input, options, {
		schema: resolveAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception resolve input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
		execute: async (data, { store, ports }) =>
			store.resolveAttendanceException(data, ports),
	});
}

export async function getAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException | null>> {
	return runTimeQuery(input, options, {
		schema: getAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET,
		execute: async (data, { store }) =>
			store.getAttendanceException({
				organizationId: data.organizationId,
				exceptionId: data.exceptionId,
			}),
	});
}

export async function listAttendanceExceptions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException[]>> {
	return runTimeQuery(input, options, {
		schema: listAttendanceExceptionsInputSchema,
		invalidMessage: "Invalid attendance exception list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST,
		execute: async (data, { store }) => store.listAttendanceExceptions(data),
	});
}

export async function listUnresolvedAttendanceExceptions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException[]>> {
	return runTimeQuery(input, options, {
		schema: listUnresolvedAttendanceExceptionsInputSchema,
		invalidMessage: "Invalid unresolved attendance exception list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED,
		execute: async (data, { store }) =>
			store.listUnresolvedAttendanceExceptions(data),
	});
}
