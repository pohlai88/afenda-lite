import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST,
} from "../../module-ids";
import {
	correctAttendanceEventInputSchema,
	getAttendanceEventInputSchema,
	listAttendanceAdjustmentsInputSchema,
	listAttendanceEventsInputSchema,
	recordAttendanceEventInputSchema,
	recordBreakEndInputSchema,
	recordBreakStartInputSchema,
	recordClockInInputSchema,
	recordClockOutInputSchema,
	recordManualAttendanceInputSchema,
	voidAttendanceEventInputSchema,
} from "../../schemas/time";
import { runTimeCommand, runTimeQuery } from "../../shared/time-command";
import { resolveActiveTimeEmployment } from "../../shared/time-employment";
import type {
	AttendanceAdjustment,
	AttendanceEvent,
	AttendanceEventType,
} from "../../types";

async function recordTypedAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		schema:
			| typeof recordClockInInputSchema
			| typeof recordClockOutInputSchema
			| typeof recordBreakStartInputSchema
			| typeof recordBreakEndInputSchema;
		invalidMessage: string;
		eventType: AttendanceEventType;
	},
): Promise<Result<AttendanceEvent>> {
	return runTimeCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) return employment;
			const occurredAt = new Date(data.occurredAt);
			const source = data.source ?? "self";
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				shiftAssignmentId: data.shiftAssignmentId ?? null,
				eventType: config.eventType,
				occurredAt: occurredAt.toISOString(),
				sourceTimezone: data.sourceTimezone,
				localWorkDate: data.localWorkDate,
				source,
			});
			const existing = await store.findAttendanceEventByIdempotencyKey({
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
				return ok(existing.data.event);
			}
			return store.recordAttendanceEvent(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					shiftAssignmentId: data.shiftAssignmentId ?? null,
					eventType: config.eventType,
					occurredAt,
					sourceTimezone: data.sourceTimezone,
					localWorkDate: data.localWorkDate,
					source,
					sourceReference: data.sourceReference ?? null,
					locationKey: data.locationKey ?? null,
					notes: data.notes ?? null,
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

export async function recordAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return runTimeCommand(input, options, {
		schema: recordAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event record input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) return employment;
			const occurredAt = new Date(data.occurredAt);
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				shiftAssignmentId: data.shiftAssignmentId ?? null,
				eventType: data.eventType,
				occurredAt: occurredAt.toISOString(),
				sourceTimezone: data.sourceTimezone,
				localWorkDate: data.localWorkDate,
				source: data.source ?? "self",
			});
			const existing = await store.findAttendanceEventByIdempotencyKey({
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
				return ok(existing.data.event);
			}
			return store.recordAttendanceEvent(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					shiftAssignmentId: data.shiftAssignmentId ?? null,
					eventType: data.eventType,
					occurredAt,
					sourceTimezone: data.sourceTimezone,
					localWorkDate: data.localWorkDate,
					source: data.source ?? "self",
					sourceReference: data.sourceReference ?? null,
					locationKey: data.locationKey ?? null,
					notes: data.notes ?? null,
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

/** Convenience wrapper that forces eventType=clock_in. */
export async function recordClockIn(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return recordTypedAttendanceEvent(input, options, {
		schema: recordClockInInputSchema,
		invalidMessage: "Invalid clock-in input",
		eventType: "clock_in",
	});
}

/** Convenience wrapper that forces eventType=clock_out. */
export async function recordClockOut(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return recordTypedAttendanceEvent(input, options, {
		schema: recordClockOutInputSchema,
		invalidMessage: "Invalid clock-out input",
		eventType: "clock_out",
	});
}

/** Convenience wrapper that forces eventType=break_start. */
export async function recordBreakStart(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return recordTypedAttendanceEvent(input, options, {
		schema: recordBreakStartInputSchema,
		invalidMessage: "Invalid break-start input",
		eventType: "break_start",
	});
}

/** Convenience wrapper that forces eventType=break_end. */
export async function recordBreakEnd(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return recordTypedAttendanceEvent(input, options, {
		schema: recordBreakEndInputSchema,
		invalidMessage: "Invalid break-end input",
		eventType: "break_end",
	});
}

/** Records attendance with forced source=manual. */
export async function recordManualAttendance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return runTimeCommand(input, options, {
		schema: recordManualAttendanceInputSchema,
		invalidMessage: "Invalid manual attendance input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) return employment;
			const occurredAt = new Date(data.occurredAt);
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: employment.data.id,
				shiftAssignmentId: data.shiftAssignmentId ?? null,
				eventType: data.eventType,
				occurredAt: occurredAt.toISOString(),
				sourceTimezone: data.sourceTimezone,
				localWorkDate: data.localWorkDate,
				source: "manual",
			});
			const existing = await store.findAttendanceEventByIdempotencyKey({
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
				return ok(existing.data.event);
			}
			return store.recordAttendanceEvent(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					shiftAssignmentId: data.shiftAssignmentId ?? null,
					eventType: data.eventType,
					occurredAt,
					sourceTimezone: data.sourceTimezone,
					localWorkDate: data.localWorkDate,
					source: "manual",
					sourceReference: data.sourceReference ?? null,
					locationKey: data.locationKey ?? null,
					notes: data.notes ?? null,
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

export async function correctAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return runTimeCommand(input, options, {
		schema: correctAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event correct input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
		execute: async (data, { store, ports }) =>
			store.correctAttendanceEvent(
				{
					organizationId: data.organizationId,
					eventId: data.eventId,
					occurredAt: new Date(data.occurredAt),
					notes: data.notes,
					adjustmentReason: data.adjustmentReason,
					evidenceReference: data.evidenceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function voidAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return runTimeCommand(input, options, {
		schema: voidAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event void input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
		execute: async (data, { store, ports }) =>
			store.voidAttendanceEvent(data, ports),
	});
}

export async function getAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent | null>> {
	return runTimeQuery(input, options, {
		schema: getAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET,
		execute: async (data, { store }) =>
			store.getAttendanceEvent({
				organizationId: data.organizationId,
				eventId: data.eventId,
			}),
	});
}

export async function listAttendanceEvents(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent[]>> {
	return runTimeQuery(input, options, {
		schema: listAttendanceEventsInputSchema,
		invalidMessage: "Invalid attendance event list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST,
		execute: async (data, { store }) => store.listAttendanceEvents(data),
	});
}

export async function listAttendanceAdjustments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceAdjustment[]>> {
	return runTimeQuery(input, options, {
		schema: listAttendanceAdjustmentsInputSchema,
		invalidMessage: "Invalid attendance adjustment list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST,
		execute: async (data, { store }) =>
			store.listAttendanceAdjustments({
				organizationId: data.organizationId,
				eventId: data.eventId,
			}),
	});
}
