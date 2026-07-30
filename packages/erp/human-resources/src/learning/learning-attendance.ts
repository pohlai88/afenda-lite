import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
	HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_GET,
	HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_LIST,
} from "../module-ids";
import {
	getLearningAttendanceInputSchema,
	listLearningAttendanceInputSchema,
	recordLearningAttendanceInputSchema,
} from "../schemas/learning";
import { fingerprintLearningAttendanceRecord } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { LearningAttendance, LearningAttendanceListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_LEARNING_ATTENDANCE =
	"learning_attendance" as const;
export type HumanResourcesLearningAttendanceAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEARNING_ATTENDANCE;

export function recordLearningAttendance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAttendance>> {
	return runLearningCommand(input, options, {
		schema: recordLearningAttendanceInputSchema,
		invalidMessage: "Invalid learning attendance record input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
		execute: async (data, { store, ports }) => {
			const assignment = await store.getLearningAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return fail(
					"NOT_FOUND",
					"Assignment not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}

			const employeeId = data.employeeId ?? assignment.data.employeeId;
			const recordedAt = new Date(data.recordedAt);
			const requestFingerprint = fingerprintLearningAttendanceRecord({
				sessionId: data.sessionId,
				assignmentId: data.assignmentId,
				employeeId,
				status: data.status,
				recordedAt: data.recordedAt,
			});

			const existingByKey = await store.findLearningAttendanceByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.attendance);
			}

			return store.recordLearningAttendance(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					assignmentId: data.assignmentId,
					employeeId,
					status: data.status,
					recordedAt,
					recordedBy: data.actorUserId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
				}),
			);
		},
	});
}

export function getLearningAttendance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAttendance | null>> {
	return runLearningQuery(input, options, {
		schema: getLearningAttendanceInputSchema,
		invalidMessage: "Invalid learning attendance get input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_GET,
		execute: async (data, { store }) =>
			await store.getLearningAttendanceById({
				organizationId: data.organizationId,
				attendanceId: data.attendanceId,
			}),
	});
}

export function listLearningAttendance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAttendanceListPage>> {
	return runLearningQuery(input, options, {
		schema: listLearningAttendanceInputSchema,
		invalidMessage: "Invalid learning attendance list input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ATTENDANCE_LIST,
		execute: async (data, { store }) =>
			await store.listLearningAttendance({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				sessionId: data.sessionId,
				employeeId: data.employeeId,
			}),
	});
}
