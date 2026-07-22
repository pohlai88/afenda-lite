import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
	HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
	HUMAN_RESOURCES_COMMAND_SESSION_START,
	HUMAN_RESOURCES_QUERY_SESSION_GET,
	HUMAN_RESOURCES_QUERY_SESSION_LIST,
} from "../module-ids";
import {
	createSessionInputSchema,
	getSessionInputSchema,
	listSessionsInputSchema,
	sessionStatusTransitionInputSchema,
} from "../schemas";
import { fingerprintSessionCreate } from "../shared/fingerprint";
import {
	runLearningCommand,
	runLearningQuery,
} from "../shared/learning-command";
import type { LearningSession, SessionListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_SESSION = "session" as const;
export type HumanResourcesSessionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SESSION;

export async function createSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCommand(input, options, {
		schema: createSessionInputSchema,
		invalidMessage: "Invalid session create input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
		execute: async (data, { store, ports }) => {
			const scheduledStartsAt = new Date(data.scheduledStartsAt);
			const scheduledEndsAt = new Date(data.scheduledEndsAt);
			const capacity = data.capacity ?? null;
			const requestFingerprint = fingerprintSessionCreate({
				courseId: data.courseId,
				code: data.code,
				title: data.title,
				scheduledStartsAt: data.scheduledStartsAt,
				scheduledEndsAt: data.scheduledEndsAt,
				capacity,
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.session);
			}

			return await store.createSession(
				{
					organizationId: data.organizationId,
					courseId: data.courseId,
					code: data.code,
					title: data.title,
					scheduledStartsAt,
					scheduledEndsAt,
					capacity,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function startSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session start input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_START,
		execute: async (data, { store, ports }) => {
			return await store.startSession(
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function completeSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session complete input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
		execute: async (data, { store, ports }) => {
			return await store.completeSession(
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function cancelSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession>> {
	return runLearningCommand(input, options, {
		schema: sessionStatusTransitionInputSchema,
		invalidMessage: "Invalid session cancel input",
		command: HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
		execute: async (data, { store, ports }) => {
			return await store.cancelSession(
				{
					organizationId: data.organizationId,
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

export async function getSession(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningSession | null>> {
	return runLearningQuery(input, options, {
		schema: getSessionInputSchema,
		invalidMessage: "Invalid session get input",
		query: HUMAN_RESOURCES_QUERY_SESSION_GET,
		execute: async (data, { store }) => {
			return await store.getSessionById({
				organizationId: data.organizationId,
				sessionId: data.sessionId,
			});
		},
	});
}

export async function listSessions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SessionListPage>> {
	return runLearningQuery(input, options, {
		schema: listSessionsInputSchema,
		invalidMessage: "Invalid session list input",
		query: HUMAN_RESOURCES_QUERY_SESSION_LIST,
		execute: async (data, { store }) => {
			return await store.listSessions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				courseId: data.courseId,
			});
		},
	});
}
