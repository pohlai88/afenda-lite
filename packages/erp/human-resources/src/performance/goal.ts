import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
} from "../module-ids";
import {
	alignPerformanceGoalInputSchema,
	closePerformanceGoalInputSchema,
	createPerformanceGoalInputSchema,
	getPerformanceGoalByIdInputSchema,
	listEmployeeGoalsInputSchema,
	listGoalProgressInputSchema,
	performanceGoalStatusTransitionInputSchema,
	recordGoalProgressInputSchema,
	updatePerformanceGoalInputSchema,
} from "../schemas/performance";
import { fingerprintPerformanceGoalCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	requirePerformanceGoalByIdOwnScope,
	requirePerformanceGoalManagerScope,
	requirePerformanceGoalOwnScope,
	runPerformanceCommand,
	runPerformanceEmployeeScopedQuery,
	runPerformanceResourceScopedQuery,
} from "../shared/performance-command";
import type {
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceGoalProgressListPage,
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
		authorize: async (opts, data, deps) => {
			if (data.goalKind === "manager") {
				return requirePerformanceGoalManagerScope(opts, deps, {
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					targetEmployeeId: data.employeeId,
				});
			}
			return requirePerformanceGoalOwnScope(opts, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				targetEmployeeId: data.employeeId,
			});
		},
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPerformanceGoalCreate({
				cycleId: data.cycleId,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				goalKind: data.goalKind,
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
					goalKind: data.goalKind,
					title: data.title,
					description: data.description ?? null,
					weight:
						data.weight !== undefined && data.weight !== null
							? String(data.weight)
							: null,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					exceptionOutsideCycle: data.exceptionOutsideCycle ?? false,
					alignedToGoalId: data.alignedToGoalId ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
				}),
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
		authorize: async (opts, data, deps) =>
			requirePerformanceGoalByIdOwnScope(opts, deps, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				goalId: data.goalId,
			}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
				}),
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
		authorize: async (opts, data, deps) =>
			requirePerformanceGoalByIdOwnScope(opts, deps, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				goalId: data.goalId,
			}),
		execute: (data, { store, ports }) =>
			store.submitPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
				}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
				}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
				}),
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
		authorize: async (opts, data, deps) =>
			requirePerformanceGoalByIdOwnScope(opts, deps, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				goalId: data.goalId,
			}),
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
					evidenceReference: data.evidenceReference ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
				}),
			),
	});
}

export async function activatePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal activate input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
		execute: (data, { store, ports }) =>
			store.activatePerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
				}),
			),
	});
}

export async function alignPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: alignPerformanceGoalInputSchema,
		invalidMessage: "Invalid performance goal align input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN,
		execute: (data, { store, ports }) =>
			store.alignPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					alignedToGoalId: data.alignedToGoalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN,
				}),
			),
	});
}

export async function closePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCommand(input, options, {
		schema: closePerformanceGoalInputSchema,
		invalidMessage: "Invalid performance goal close input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
		execute: (data, { store, ports }) =>
			store.closePerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					completionNote: data.completionNote ?? null,
					completionEvidenceReference: data.completionEvidenceReference ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE,
				}),
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
		authorize: async (opts, data, deps) => {
			const goalResult = await deps.store.getPerformanceGoalById({
				organizationId: data.organizationId,
				goalId: data.goalId,
			});
			if (!goalResult.ok) return goalResult;
			if (goalResult.data === null) {
				return fail("NOT_FOUND", "Performance goal not found");
			}
			if (goalResult.data.goalKind === "manager") {
				return requirePerformanceGoalManagerScope(opts, deps, {
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					targetEmployeeId: goalResult.data.employeeId,
				});
			}
			return requirePerformanceGoalOwnScope(opts, {
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				targetEmployeeId: goalResult.data.employeeId,
			});
		},
		execute: (data, { store, ports }) =>
			store.cancelPerformanceGoal(
				{
					organizationId: data.organizationId,
					goalId: data.goalId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
				}),
			),
	});
}

export async function getPerformanceGoalById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal | null>> {
	return runPerformanceResourceScopedQuery(input, options, {
		schema: getPerformanceGoalByIdInputSchema,
		invalidMessage: "Invalid performance goal get input",
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
	return runPerformanceEmployeeScopedQuery(input, options, {
		schema: listEmployeeGoalsInputSchema,
		invalidMessage: "Invalid employee goals list input",
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

export async function listGoalProgress(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalProgressListPage>> {
	return runPerformanceResourceScopedQuery(input, options, {
		schema: listGoalProgressInputSchema,
		invalidMessage: "Invalid goal progress list input",
		execute: (data, { store }) =>
			store.listGoalProgress({
				organizationId: data.organizationId,
				goalId: data.goalId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}
