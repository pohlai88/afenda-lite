import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT,
	HUMAN_RESOURCES_QUERY_COMPLETION_LIST,
} from "../module-ids";
import {
	getCompletionByAssignmentInputSchema,
	listCompletionsInputSchema,
	recordCompletionInputSchema,
} from "../schemas/learning";
import { fingerprintCompletionRecord } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import type { CompletionListPage, LearningCompletion } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPLETION = "completion" as const;
export type HumanResourcesCompletionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPLETION;

export async function recordCompletion(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCompletion>> {
	return runLearningCommand(input, options, {
		schema: recordCompletionInputSchema,
		invalidMessage: "Invalid completion record input",
		command: HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
		execute: async (data, { store, ports }) => {
			const assignment = await store.getLearningAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) return assignment;
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
			const courseId = data.courseId ?? assignment.data.courseId;
			const sessionId =
				data.sessionId !== undefined
					? data.sessionId
					: assignment.data.sessionId;
			const completedAt = new Date(data.completedAt);
			const assessorUserId = data.assessorUserId ?? data.actorUserId;
			const notes = data.notes ?? null;
			const requestFingerprint = fingerprintCompletionRecord({
				assignmentId: data.assignmentId,
				employeeId,
				courseId,
				sessionId,
				completedAt: data.completedAt,
				outcome: data.outcome,
				assessorUserId,
				notes,
			});
			const idempotencyKey = data.idempotencyKey ?? data.correlationId;

			const existingByKey = await store.findCompletionByIdempotencyKey({
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
				return ok(existingByKey.data.completion);
			}

			return await store.recordCompletion(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					employeeId,
					courseId,
					sessionId,
					completedAt,
					outcome: data.outcome,
					assessorUserId,
					notes,
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

export async function getCompletion(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCompletion | null>> {
	return runLearningQuery(input, options, {
		schema: getCompletionByAssignmentInputSchema,
		invalidMessage: "Invalid completion get input",
		query: HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT,
		execute: async (data, { store }) => {
			return await store.findCompletionByAssignmentId({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
		},
	});
}

export async function listCompletions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompletionListPage>> {
	return runLearningQuery(input, options, {
		schema: listCompletionsInputSchema,
		invalidMessage: "Invalid completion list input",
		query: HUMAN_RESOURCES_QUERY_COMPLETION_LIST,
		execute: async (data, { store }) => {
			return await store.listCompletions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId: data.employeeId,
				courseId: data.courseId,
			});
		},
	});
}
