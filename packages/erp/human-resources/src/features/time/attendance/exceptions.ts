import type { Result } from "@afenda/errors";
import type { AttendanceException } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED,
} from "../../../kernel/operations/module-ids";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "../run-operation";
import {
	createAttendanceExceptionInputSchema,
	excuseAttendanceExceptionInputSchema,
	getAttendanceExceptionInputSchema,
	listAttendanceExceptionsInputSchema,
	listUnresolvedAttendanceExceptionsInputSchema,
	rejectAttendanceExceptionInputSchema,
	resolveAttendanceExceptionInputSchema,
	reviewAttendanceExceptionInputSchema,
} from "../schema";

export async function createAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: createAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception create input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_CREATE,
		storeMethods: ["createAttendanceException"],
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
	return await runTimeCapabilityCommand(input, options, {
		schema: reviewAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception review input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REVIEW,
		storeMethods: ["reviewAttendanceException"],
		execute: async (data, { store, ports }) =>
			store.reviewAttendanceException(data, ports),
	});
}

export async function excuseAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: excuseAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception excuse input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_EXCUSE,
		storeMethods: ["excuseAttendanceException"],
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
	return await runTimeCapabilityCommand(input, options, {
		schema: rejectAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception reject input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_REJECT,
		storeMethods: ["rejectAttendanceException"],
		execute: async (data, { store, ports }) =>
			store.rejectAttendanceException(data, ports),
	});
}

export async function resolveAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: resolveAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception resolve input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EXCEPTION_RESOLVE,
		storeMethods: ["resolveAttendanceException"],
		execute: async (data, { store, ports }) =>
			store.resolveAttendanceException(data, ports),
	});
}

export async function getAttendanceException(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getAttendanceExceptionInputSchema,
		invalidMessage: "Invalid attendance exception get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_GET,
		storeMethods: ["getAttendanceException"],
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
	return await runTimeCapabilityQuery(input, options, {
		schema: listAttendanceExceptionsInputSchema,
		invalidMessage: "Invalid attendance exception list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST,
		storeMethods: ["listAttendanceExceptions"],
		execute: async (data, { store }) => store.listAttendanceExceptions(data),
	});
}

export async function listUnresolvedAttendanceExceptions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceException[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listUnresolvedAttendanceExceptionsInputSchema,
		invalidMessage: "Invalid unresolved attendance exception list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EXCEPTION_LIST_UNRESOLVED,
		storeMethods: ["listUnresolvedAttendanceExceptions"],
		execute: async (data, { store }) =>
			store.listUnresolvedAttendanceExceptions(data),
	});
}
