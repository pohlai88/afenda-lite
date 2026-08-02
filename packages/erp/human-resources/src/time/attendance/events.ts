import { errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_END,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_START,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_IN,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_OUT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_MANUAL_RECORD,
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
import { resolveActiveTimeEmployment } from "../../shared/time-employment";
import type {
	AttendanceAdjustment,
	AttendanceEvent,
	AttendanceEventType,
} from "../../types";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "../run-operation";

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
		command:
			| typeof HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_IN
			| typeof HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_OUT
			| typeof HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_START
			| typeof HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_END;
	},
): Promise<Result<AttendanceEvent>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: config.schema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		storeMethods: [
			"findAttendanceEventByIdempotencyKey",
			"findEmploymentByEmployeeAsOf",
			"getEmploymentById",
			"recordAttendanceEvent",
		],
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) {
				return employment;
			}
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
				return errorResult.ok(existing.data.event);
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
	return await runTimeCapabilityCommand(input, options, {
		schema: recordAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event record input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_RECORD,
		storeMethods: [
			"findAttendanceEventByIdempotencyKey",
			"findEmploymentByEmployeeAsOf",
			"getEmploymentById",
			"recordAttendanceEvent",
		],
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) {
				return employment;
			}
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
				return errorResult.ok(existing.data.event);
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
	return await recordTypedAttendanceEvent(input, options, {
		schema: recordClockInInputSchema,
		invalidMessage: "Invalid clock-in input",
		eventType: "clock_in",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_IN,
	});
}

/** Convenience wrapper that forces eventType=clock_out. */
export async function recordClockOut(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return await recordTypedAttendanceEvent(input, options, {
		schema: recordClockOutInputSchema,
		invalidMessage: "Invalid clock-out input",
		eventType: "clock_out",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_OUT,
	});
}

/** Convenience wrapper that forces eventType=break_start. */
export async function recordBreakStart(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return await recordTypedAttendanceEvent(input, options, {
		schema: recordBreakStartInputSchema,
		invalidMessage: "Invalid break-start input",
		eventType: "break_start",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_START,
	});
}

/** Convenience wrapper that forces eventType=break_end. */
export async function recordBreakEnd(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return await recordTypedAttendanceEvent(input, options, {
		schema: recordBreakEndInputSchema,
		invalidMessage: "Invalid break-end input",
		eventType: "break_end",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_END,
	});
}

/** Records attendance with forced source=manual. */
export async function recordManualAttendance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: recordManualAttendanceInputSchema,
		invalidMessage: "Invalid manual attendance input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_MANUAL_RECORD,
		storeMethods: [
			"findAttendanceEventByIdempotencyKey",
			"findEmploymentByEmployeeAsOf",
			"getEmploymentById",
			"recordAttendanceEvent",
		],
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) {
				return employment;
			}
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
				return errorResult.ok(existing.data.event);
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
	return await runTimeCapabilityCommand(input, options, {
		schema: correctAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event correct input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_CORRECT,
		storeMethods: ["correctAttendanceEvent"],
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
	return await runTimeCapabilityCommand(input, options, {
		schema: voidAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event void input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_EVENT_VOID,
		storeMethods: ["voidAttendanceEvent"],
		execute: async (data, { store, ports }) =>
			store.voidAttendanceEvent(data, ports),
	});
}

export async function getAttendanceEvent(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceEvent | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getAttendanceEventInputSchema,
		invalidMessage: "Invalid attendance event get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_GET,
		storeMethods: ["getAttendanceEvent"],
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
	return await runTimeCapabilityQuery(input, options, {
		schema: listAttendanceEventsInputSchema,
		invalidMessage: "Invalid attendance event list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_EVENT_LIST,
		storeMethods: ["listAttendanceEvents"],
		execute: async (data, { store }) => store.listAttendanceEvents(data),
	});
}

export async function listAttendanceAdjustments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceAdjustment[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listAttendanceAdjustmentsInputSchema,
		invalidMessage: "Invalid attendance adjustment list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_ADJUSTMENT_LIST,
		storeMethods: ["listAttendanceAdjustments"],
		execute: async (data, { store }) =>
			store.listAttendanceAdjustments({
				organizationId: data.organizationId,
				eventId: data.eventId,
			}),
	});
}
