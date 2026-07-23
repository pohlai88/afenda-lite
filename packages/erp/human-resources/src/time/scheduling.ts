import { fail, ok, type Result } from "@afenda/errors/result";

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

export async function assignShift(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ShiftAssignment>> {
	return runTimeCommand(input, options, {
		schema: assignShiftInputSchema,
		invalidMessage: "Invalid shift assign input",
		command: HUMAN_RESOURCES_COMMAND_SHIFT_ASSIGN,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.scheduledDate,
			});
			if (!employment.ok) return employment;
			const startsAt = new Date(data.startsAt);
			const endsAt = new Date(data.endsAt);
			const segments = (
				data.segments ?? [
					{ segmentOrder: 1, startsAt: data.startsAt, endsAt: data.endsAt },
				]
			)
				.map((segment) => ({
					segmentOrder: segment.segmentOrder,
					startsAt: new Date(segment.startsAt),
					endsAt: new Date(segment.endsAt),
				}))
				.sort((a, b) => a.segmentOrder - b.segmentOrder);
			const segmentOrders = new Set(
				segments.map((segment) => segment.segmentOrder),
			);
			if (segmentOrders.size !== segments.length) {
				return invalidInput("Shift assignment segment orders must be unique");
			}
			for (const [index, segment] of segments.entries()) {
				if (
					segment.endsAt <= segment.startsAt ||
					segment.startsAt < startsAt ||
					segment.endsAt > endsAt
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
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.assignment);
			}

			const overlaps = await store.findOverlappingShiftAssignments({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				startsAt,
				endsAt,
			});
			if (!overlaps.ok) return overlaps;
			if (overlaps.data.length > 0) {
				return fail(
					"CONFLICT",
					"Shift assignment overlaps an existing assignment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
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
	return runTimeCommand(input, options, {
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
	return runTimeCommand(input, options, {
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
	return runTimeCommand(input, options, {
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
						data.startsAt !== undefined ? new Date(data.startsAt) : undefined,
					endsAt: data.endsAt !== undefined ? new Date(data.endsAt) : undefined,
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
	return runTimeCommand(input, options, {
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
	return runTimeQuery(input, options, {
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
	return runTimeQuery(input, options, {
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
	return runTimeQuery(input, options, {
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
	return runTimeQuery(input, options, {
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
	return runTimeQuery(input, options, {
		schema: listLocationScheduleInputSchema,
		invalidMessage: "Invalid location schedule list input",
		query: HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_LOCATION_SCHEDULE_LIST,
		execute: async (data, { store }) => store.listLocationSchedule(data),
	});
}
