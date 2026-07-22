import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
	HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST,
} from "../module-ids";
import {
	createLearningAssignmentInputSchema,
	enrolLearningAssignmentInputSchema,
	getLearningAssignmentInputSchema,
	listLearningAssignmentsInputSchema,
	waiveLearningAssignmentInputSchema,
} from "../schemas/learning";
import { fingerprintLearningAssignmentCreate } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import type { LearningAssignment, LearningAssignmentListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_LEARNING_ASSIGNMENT =
	"learning_assignment" as const;
export type HumanResourcesLearningAssignmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEARNING_ASSIGNMENT;

export async function assignLearning(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCommand(input, options, {
		schema: createLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment create input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
		execute: async (data, { store, ports }) => {
			const assignedAt = new Date();
			const sessionId = data.sessionId ?? null;
			const dueOn = data.dueOn ?? null;
			const requestFingerprint = fingerprintLearningAssignmentCreate({
				employeeId: data.employeeId,
				courseId: data.courseId,
				sessionId,
				assignedBy: data.actorUserId,
				assignedAt: assignedAt.toISOString(),
				dueOn,
			});
			const idempotencyKey = data.idempotencyKey ?? data.correlationId;

			const existingByKey = await store.findLearningAssignmentByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey,
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
				return ok(existingByKey.data.assignment);
			}

			return await store.createLearningAssignment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					courseId: data.courseId,
					sessionId,
					assignedBy: data.actorUserId,
					assignedAt,
					dueOn,
					createIdempotencyKey: idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function enrolAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCommand(input, options, {
		schema: enrolLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment enrol input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
		execute: async (data, { store, ports }) => {
			return await store.enrollLearningAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					sessionId: data.sessionId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function waiveAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCommand(input, options, {
		schema: waiveLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment waive input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
		execute: async (data, { store, ports }) => {
			return await store.waiveLearningAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getLearningAssignmentByAssignmentId(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment | null>> {
	return runLearningQuery(input, options, {
		schema: getLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment get input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET,
		execute: async (data, { store }) => {
			return await store.getLearningAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
		},
	});
}

export async function getLearningAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment | null>> {
	return getLearningAssignmentByAssignmentId(input, options);
}

export async function listAssignments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignmentListPage>> {
	return runLearningQuery(input, options, {
		schema: listLearningAssignmentsInputSchema,
		invalidMessage: "Invalid learning assignment list input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST,
		execute: async (data, { store }) => {
			return await store.listLearningAssignments({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				employeeId: data.employeeId,
				courseId: data.courseId,
			});
		},
	});
}

export async function listLearningAssignments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignmentListPage>> {
	return listAssignments(input, options);
}
