import { errorResult, type Result } from "@afenda/errors";
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
import { buildMutationMeta } from "../shared/mutation-meta";
import type { CompletionListPage, LearningCompletion } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPLETION = "completion" as const;
export type HumanResourcesCompletionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPLETION;

export function recordCompletion(
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
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				});
			}

			const employeeId = data.employeeId ?? assignment.data.employeeId;
			const courseId = data.courseId ?? assignment.data.courseId;
			const sessionId =
				data.sessionId === undefined
					? assignment.data.sessionId
					: data.sessionId;
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.completion);
			}

			return store.recordCompletion(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
				}),
			);
		},
	});
}

export function getCompletion(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningCompletion | null>> {
	return runLearningQuery(input, options, {
		schema: getCompletionByAssignmentInputSchema,
		invalidMessage: "Invalid completion get input",
		query: HUMAN_RESOURCES_QUERY_COMPLETION_GET_BY_ASSIGNMENT,
		execute: async (data, { store }) =>
			await store.findCompletionByAssignmentId({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}

export function listCompletions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompletionListPage>> {
	return runLearningQuery(input, options, {
		schema: listCompletionsInputSchema,
		invalidMessage: "Invalid completion list input",
		query: HUMAN_RESOURCES_QUERY_COMPLETION_LIST,
		execute: async (data, { store }) =>
			await store.listCompletions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				employeeId: data.employeeId,
				courseId: data.courseId,
			}),
	});
}
