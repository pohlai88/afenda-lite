import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
} from "../module-ids";
import {
	createPerformanceGoalInputSchema,
	getPerformanceGoalByIdInputSchema,
	listEmployeeGoalsInputSchema,
	performanceGoalStatusTransitionInputSchema,
	recordGoalProgressInputSchema,
	updatePerformanceGoalInputSchema,
} from "../schemas";
import { fingerprintPerformanceGoalCreate } from "../shared/fingerprint";
import {
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import type {
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_GOAL = "goal" as const;
export type HumanResourcesGoalAggregate = typeof HUMAN_RESOURCES_AGGREGATE_GOAL;

export async function createPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: createPerformanceGoalInputSchema,
		invalidMessage: "Invalid performance goal create input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPerformanceGoalCreate({
				cycleId: data.cycleId,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				title: data.title,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
			});

			const existingByKey = await store.findPerformanceGoalByIdempotencyKey({
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
				return ok(existingByKey.data.goal);
			}

			return store.createPerformanceGoal(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					title: data.title,
					description: data.description ?? null,
					weight:
						data.weight !== undefined && data.weight !== null
							? String(data.weight)
							: null,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					exceptionOutsideCycle: data.exceptionOutsideCycle ?? false,
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

export async function updatePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: updatePerformanceGoalInputSchema,
		invalidMessage: "Invalid performance goal update input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
		execute: (data, { store, ports }) =>
			store.updatePerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					title: data.title,
					description: data.description,
					weight:
						data.weight !== undefined
							? data.weight === null
								? null
								: String(data.weight)
							: undefined,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function submitPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal submit input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
		execute: (data, { store, ports }) =>
			store.submitPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function approvePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal approve input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
		execute: (data, { store, ports }) =>
			store.approvePerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function rejectPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal reject input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
		execute: (data, { store, ports }) =>
			store.rejectPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function recordGoalProgress(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalProgress>> {
	return runPerformanceCommand(input, options, {
		schema: recordGoalProgressInputSchema,
		invalidMessage: "Invalid goal progress record input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
		execute: (data, { store, ports }) =>
			store.recordGoalProgress(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					progressNote: data.progressNote,
					progressValue:
						data.progressValue !== undefined && data.progressValue !== null
							? String(data.progressValue)
							: null,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function closePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal close input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
		execute: (data, { store, ports }) =>
			store.closePerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal cancel input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getPerformanceGoalById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal | null>> {
	return runPerformanceQuery(input, options, {
		schema: getPerformanceGoalByIdInputSchema,
		invalidMessage: "Invalid performance goal get input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET,
		execute: (data, { store }) =>
			store.getPerformanceGoalById({
				organizationId: data.organizationId,
				goalId: data.goalId,
			}),
	});
}

export async function listEmployeeGoals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listEmployeeGoalsInputSchema,
		invalidMessage: "Invalid employee goals list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
		execute: (data, { store }) =>
			store.listEmployeeGoals({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
