import { errorResult, type Result } from "@afenda/errors";

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
import { resolveActiveTimeEmployment } from "../../shared/time-employment";
import type { AttendanceSession } from "../../types";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "../run-operation";

export async function resolveAttendanceSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<AttendanceSession>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: resolveAttendanceSessionInputSchema,
		invalidMessage: "Invalid attendance session resolve input",
		command: HUMAN_RESOURCES_COMMAND_ATTENDANCE_SESSION_RESOLVE,
		storeMethods: [
			"findAttendanceSessionByIdempotencyKey",
			"findEmploymentByEmployeeAsOf",
			"getEmploymentById",
			"resolveAttendanceSession",
			"resolveTimePolicy",
		],
		execute: async (data, { store, ports }) => {
			const employment = await resolveActiveTimeEmployment(store, {
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId: null,
				workDate: data.localWorkDate,
			});
			if (!employment.ok) {
				return employment;
			}
			const policy = await store.resolveTimePolicy({
				organizationId: data.organizationId,
				employmentId: employment.data.id,
				asOf: data.localWorkDate,
			});
			if (!policy.ok) {
				return policy;
			}
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				localWorkDate: data.localWorkDate,
				timezone: data.timezone,
			});
			const existing = await store.findAttendanceSessionByIdempotencyKey({
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
				return errorResult.ok(existing.data.session);
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
	return await runTimeCapabilityQuery(input, options, {
		schema: getAttendanceSessionInputSchema,
		invalidMessage: "Invalid attendance session get input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_GET,
		storeMethods: ["getAttendanceSession"],
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
	return await runTimeCapabilityQuery(input, options, {
		schema: listAttendanceSessionsInputSchema,
		invalidMessage: "Invalid attendance session list input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_SESSION_LIST,
		storeMethods: ["listAttendanceSessions"],
		execute: async (data, { store }) => store.listAttendanceSessions(data),
	});
}
