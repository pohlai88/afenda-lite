import { errorResult, type Result } from "@afenda/errors";
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
import { buildMutationMeta } from "../shared/mutation-meta";
import type { LearningAssignment, LearningAssignmentListPage } from "../types";
import {
	runLearningCapabilityCommand,
	runLearningCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_LEARNING_ASSIGNMENT =
	"learning_assignment" as const;
export type HumanResourcesLearningAssignmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_LEARNING_ASSIGNMENT;

export function assignLearning(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCapabilityCommand(input, options, {
		schema: createLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment create input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
		storeMethods: [
			"findLearningAssignmentByIdempotencyKey",
			"createLearningAssignment",
		],
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.assignment);
			}

			return store.createLearningAssignment(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
				}),
			);
		},
	});
}

export function enrolAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCapabilityCommand(input, options, {
		schema: enrolLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment enrol input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
		storeMethods: ["enrollLearningAssignment"],
		execute: async (data, { store, ports }) =>
			await store.enrollLearningAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					sessionId: data.sessionId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
				}),
			),
	});
}

export function waiveAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment>> {
	return runLearningCapabilityCommand(input, options, {
		schema: waiveLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment waive input",
		command: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
		storeMethods: ["waiveLearningAssignment"],
		execute: async (data, { store, ports }) =>
			await store.waiveLearningAssignment(
				{
					organizationId: data.organizationId,
					assignmentId: data.assignmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
				}),
			),
	});
}

export function getLearningAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignment | null>> {
	return runLearningCapabilityQuery(input, options, {
		schema: getLearningAssignmentInputSchema,
		invalidMessage: "Invalid learning assignment get input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_GET,
		storeMethods: ["getLearningAssignmentById"],
		execute: async (data, { store }) =>
			await store.getLearningAssignmentById({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}

export function listLearningAssignments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<LearningAssignmentListPage>> {
	return runLearningCapabilityQuery(input, options, {
		schema: listLearningAssignmentsInputSchema,
		invalidMessage: "Invalid learning assignment list input",
		query: HUMAN_RESOURCES_QUERY_LEARNING_ASSIGNMENT_LIST,
		storeMethods: ["listLearningAssignments"],
		execute: async (data, { store }) =>
			await store.listLearningAssignments({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				employeeId: data.employeeId,
				courseId: data.courseId,
			}),
	});
}
