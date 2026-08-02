import { errorResult, type Result } from "@afenda/errors";
import type { LearningSession, SessionListPage } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintSessionCreate } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
	HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
	HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
	HUMAN_RESOURCES_COMMAND_SESSION_START,
	HUMAN_RESOURCES_QUERY_SESSION_GET,
	HUMAN_RESOURCES_QUERY_SESSION_LIST,
} from "../../kernel/operations/module-ids";
import {
	runLearningCapabilityCommand,
	runLearningCapabilityQuery,
} from "./run-operation";
import {
	assignSessionInstructorInputSchema,
	createSessionInputSchema,
	getSessionInputSchema,
	listSessionsInputSchema,
	sessionStatusTransitionInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_SESSION = "session" as const;
export type HumanResourcesSessionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SESSION;

export function createSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCapabilityCommand(input, options, {
		schema: createSessionInputSchema,
		invalidMessage: "Invalid session create input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
		storeMethods: ["findSessionByIdempotencyKey", "createSession"],
		execute: async (data, { store, ports }) => {
			const scheduledStartsAt = new Date(data.scheduledStartsAt);
			const scheduledEndsAt = new Date(data.scheduledEndsAt);
			const capacity = data.capacity ?? null;
			const primaryInstructorUserId = data.primaryInstructorUserId ?? null;
			const requestFingerprint = fingerprintSessionCreate({
				courseId: data.courseId,
				code: data.code,
				title: data.title,
				scheduledStartsAt: data.scheduledStartsAt,
				scheduledEndsAt: data.scheduledEndsAt,
				capacity,
				primaryInstructorUserId,
			});

			const existingByKey = await store.findSessionByIdempotencyKey({
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.session);
			}

			return store.createSession(
				{
					organizationId: data.organizationId,
					courseId: data.courseId,
					code: data.code,
					title: data.title,
					scheduledStartsAt,
					scheduledEndsAt,
					capacity,
					primaryInstructorUserId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
				}),
			);
		},
	});
}

export function startSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCapabilityCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session start input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_START,
		storeMethods: ["startSession"],
		execute: async (data, { store, ports }) =>
			await store.startSession(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					actualStartsAt: data.actualStartsAt
						? new Date(data.actualStartsAt)
						: new Date(),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SESSION_START,
				}),
			),
	});
}

export function completeSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCapabilityCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session complete input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
		storeMethods: ["completeSession"],
		execute: async (data, { store, ports }) =>
			await store.completeSession(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					actualEndsAt: data.actualEndsAt
						? new Date(data.actualEndsAt)
						: new Date(),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
				}),
			),
	});
}

export function assignSessionInstructor(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCapabilityCommand(input, options, {
		schema: assignSessionInstructorInputSchema,
		invalidMessage: "Invalid session instructor assignment input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
		storeMethods: ["assignSessionInstructor"],
		execute: async (data, { store, ports }) =>
			await store.assignSessionInstructor(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					primaryInstructorUserId: data.primaryInstructorUserId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
				}),
			),
	});
}

export function cancelSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCapabilityCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session cancel input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
		storeMethods: ["cancelSession"],
		execute: async (data, { store, ports }) =>
			await store.cancelSession(
				{
					organizationId: data.organizationId,
					sessionId: data.sessionId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
				}),
			),
	});
}

export function getSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession | null>> {
	return runLearningCapabilityQuery(input, options, {
		schema: getSessionInputSchema,
		invalidMessage: "Invalid session get input",
		query: HUMAN_RESOURCES_QUERY_SESSION_GET,
		storeMethods: ["getSessionById"],
		execute: async (data, { store }) =>
			await store.getSessionById({
				organizationId: data.organizationId,
				sessionId: data.sessionId,
			}),
	});
}

export function listSessions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SessionListPage>> {
	return runLearningCapabilityQuery(input, options, {
		schema: listSessionsInputSchema,
		invalidMessage: "Invalid session list input",
		query: HUMAN_RESOURCES_QUERY_SESSION_LIST,
		storeMethods: ["listSessions"],
		execute: async (data, { store }) =>
			await store.listSessions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				courseId: data.courseId,
			}),
	});
}
