import { errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST,
	HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SCHEDULED_FOR_DATE,
} from "../module-ids";
import {
	assignShiftInputSchema,
	cancelShiftAssignmentInputSchema,
	changeShiftAssignmentInputSchema,
	completeShiftAssignmentInputSchema,
	getScheduledShiftForEmployeeDateInputSchema,
	getShiftAssignmentInputSchema,
	listLocationScheduleInputSchema,
	listShiftAssignmentsInputSchema,
	publishShiftAssignmentInputSchema,
} from "../schemas/time";
import { invalidInput } from "../shared/domain-guards";
import { runTimeCommand, runTimeQuery } from "../shared/time-command";
import { resolveActiveTimeEmployment } from "../shared/time-employment";
import type { ShiftAssignment, ShiftAssignmentSegment } from "../types";

type PreparedShiftSegment = Pick<
	ShiftAssignmentSegment,
	"segmentOrder" | "startsAt" | "endsAt"
>;

function prepareShiftAssignmentSegments(input: {
	startsAt: string;
	endsAt: string;
	segments?:
		| readonly { segmentOrder: number; startsAt: string; endsAt: string }[]
		| undefined;
}): Result<PreparedShiftSegment[]> {
	const assignmentStartsAt = new Date(input.startsAt);
	const assignmentEndsAt = new Date(input.endsAt);
	const segments = (
		input.segments ?? [
			{ segmentOrder: 1, startsAt: input.startsAt, endsAt: input.endsAt },
		]
	)
		.map((segment) => ({
			segmentOrder: segment.segmentOrder,
			startsAt: new Date(segment.startsAt),
			endsAt: new Date(segment.endsAt),
		}))
		.sort((a, b) => a.segmentOrder - b.segmentOrder);
	if (
		new Set(segments.map((segment) => segment.segmentOrder)).size !==
		segments.length
	) {
		return invalidInput("Shift assignment segment orders must be unique");
	}
	for (const [index, segment] of segments.entries()) {
		if (
			segment.endsAt <= segment.startsAt ||
			segment.startsAt < assignmentStartsAt ||
			segment.endsAt > assignmentEndsAt
		) {
			return invalidInput(
				"Shift assignment segments must be valid and within the assignment",
			);
		}
		const previous = segments[index - 1];
		if (previous !== undefined && segment.startsAt < previous.endsAt) {
			return invalidInput("Shift assignment segments must not overlap");
		}
	}
	return errorResult.ok(segments);
}

export async function assignShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return await runTimeCommand(input, options, {
		schema: assignShiftInputSchema,
		invalidMessage: "Invalid shift assign input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
		execute: async (data, { store, ports }) => {
			const startsAt = new Date(data.startsAt);
			const endsAt = new Date(data.endsAt);
			const preparedSegments = prepareShiftAssignmentSegments({
				startsAt: data.startsAt,
				endsAt: data.endsAt,
				segments: data.segments,
			});
			if (!preparedSegments.ok) {
				return preparedSegments;
			}
			const segments = preparedSegments.data;
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.scheduledDate,
			});
			if (!employment.ok) {
				return employment;
			}
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				shiftId: data.shiftId,
				scheduledDate: data.scheduledDate,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
				timezone: data.timezone,
				segments: segments.map((segment) => ({
					segmentOrder: segment.segmentOrder,
					startsAt: segment.startsAt.toISOString(),
					endsAt: segment.endsAt.toISOString(),
				})),
			});
			const existing = await store.findShiftAssignmentByIdempotencyKey({
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
				return errorResult.ok(existing.data.assignment);
			}

			const overlaps = await store.findOverlappingShiftAssignments({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				startsAt,
				endsAt,
			});
			if (!overlaps.ok) {
				return overlaps;
			}
			if (overlaps.data.length > 0) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			return store.assignShift(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					shiftId: data.shiftId,
					scheduledDate: data.scheduledDate,
					startsAt,
					endsAt,
					locationKey: data.locationKey ?? null,
					timezone: data.timezone,
					assignmentSource: data.assignmentSource ?? "manual",
					segments,
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

export async function publishShiftAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return await runTimeCommand(input, options, {
		schema: publishShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment publish input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_PUBLISH,
		execute: async (data, { store, ports }) =>
			store.publishShiftAssignment(data, ports),
	});
}

export async function cancelShiftAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return await runTimeCommand(input, options, {
		schema: cancelShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment cancel input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CANCEL,
		execute: async (data, { store, ports }) =>
			store.cancelShiftAssignment(data, ports),
	});
}

export async function changeShiftAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return await runTimeCommand(input, options, {
		schema: changeShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment change input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_CHANGE,
		execute: async (data, { store, ports }) =>
			store.changeShiftAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					shiftId: data.shiftId,
					scheduledDate: data.scheduledDate,
					startsAt:
						data.startsAt === undefined ? undefined : new Date(data.startsAt),
					endsAt: data.endsAt === undefined ? undefined : new Date(data.endsAt),
					locationKey: data.locationKey,
					timezone: data.timezone,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function completeShiftAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return await runTimeCommand(input, options, {
		schema: completeShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment complete input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGNMENT_COMPLETE,
		execute: async (data, { store, ports }) =>
			store.completeShiftAssignment(data, ports),
	});
}

export async function getShiftAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment | null>> {
	return await runTimeQuery(input, options, {
		schema: getShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment get input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET,
		execute: async (data, { store }) =>
			store.getShiftAssignment({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}

export async function listShiftAssignmentSegments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignmentSegment[]>> {
	return await runTimeQuery(input, options, {
		schema: getShiftAssignmentInputSchema,
		invalidMessage: "Invalid shift assignment segment list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_GET,
		execute: async (data, { store }) =>
			store.listShiftAssignmentSegments({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}

export async function listShiftAssignments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment[]>> {
	return await runTimeQuery(input, options, {
		schema: listShiftAssignmentsInputSchema,
		invalidMessage: "Invalid shift assignment list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LIST,
		execute: async (data, { store }) => store.listShiftAssignments(data),
	});
}

export async function getScheduledShiftForEmployeeDate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment | null>> {
	return await runTimeQuery(input, options, {
		schema: getScheduledShiftForEmployeeDateInputSchema,
		invalidMessage: "Invalid scheduled shift for employee date input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SCHEDULED_FOR_DATE,
		execute: async (data, { store }) =>
			store.getScheduledShiftForEmployeeDate({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				scheduledDate: data.scheduledDate,
			}),
	});
}

export async function listLocationSchedule(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment[]>> {
	return await runTimeQuery(input, options, {
		schema: listLocationScheduleInputSchema,
		invalidMessage: "Invalid location schedule list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST,
		execute: async (data, { store }) => store.listLocationSchedule(data),
	});
}
