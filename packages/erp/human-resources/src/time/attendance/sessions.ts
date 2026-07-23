import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET,
	HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST,
} from "../../module-ids";
import {
	getAttendanceSessionInputSchema,
	listAttendanceSessionsInputSchema,
	resolveAttendanceSessionInputSchema,
} from "../../schemas/time";
import { runTimeCommand, runTimeQuery } from "../../shared/time-command";
import { resolveActiveTimeEmployment } from "../../shared/time-employment";
import type { AttendanceSession } from "../../types";

export async function resolveAttendanceSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceSession>> {
	return runTimeCommand(input, options, {
		schema: resolveAttendanceSessionInputSchema,
		invalidMessage: "Invalid attendance session resolve input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) return employment;
			const policy = await store.resolveTimePolicy({
				organizationId: data.organizationId,
				employmentId: employment.data.id,
				asOf: data.localWorkDate,
			});
			if (!policy.ok) return policy;
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				localWorkDate: data.localWorkDate,
				timezone: data.timezone,
			});
			const existing = await store.findAttendanceSessionByIdempotencyKey({
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
				return ok(existing.data.session);
			}
			return store.resolveAttendanceSession(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: employment.data.id,
					localWorkDate: data.localWorkDate,
					timezone: data.timezone,
					automaticBreakPolicy:
						policy.data?.automaticBreakAfterMinutes !== null &&
						policy.data?.automaticBreakAfterMinutes !== undefined &&
						policy.data.automaticBreakMinutes > 0
							? {
									policyId: policy.data.id,
									afterMinutes: policy.data.automaticBreakAfterMinutes,
									deductionMinutes: policy.data.automaticBreakMinutes,
								}
							: null,
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

export async function getAttendanceSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceSession | null>> {
	return runTimeQuery(input, options, {
		schema: getAttendanceSessionInputSchema,
		invalidMessage: "Invalid attendance session get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET,
		execute: async (data, { store }) =>
			store.getAttendanceSession({
				organizationId: data.organizationId,
				sessionId: data.sessionId,
			}),
	});
}

export async function listAttendanceSessions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceSession[]>> {
	return runTimeQuery(input, options, {
		schema: listAttendanceSessionsInputSchema,
		invalidMessage: "Invalid attendance session list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST,
		execute: async (data, { store }) => store.listAttendanceSessions(data),
	});
}
