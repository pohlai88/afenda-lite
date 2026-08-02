import { errorResult, type Result } from "@afenda/errors";
import type {
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceGoalProgressListPage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintPerformanceGoalCreate } from "../../kernel/identity/fingerprint";
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
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_PROGRESS,
} from "../../kernel/operations/module-ids";
import {
	requirePerformanceGoalByIdOwnScope,
	requirePerformanceGoalManagerScope,
	requirePerformanceGoalOwnScope,
	runPerformanceCapabilityCommand,
	runPerformanceEmployeeScopedCapabilityQuery,
	runPerformanceResourceScopedCapabilityQuery,
} from "./run-operation";
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
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_GOAL = "goal" as const;
export type HumanResourcesGoalAggregate = typeof HUMAN_RESOURCES_AGGREGATE_GOAL;

function serializeGoalWeight(
	weight: string | number | null | undefined,
): string | null | undefined {
	if (weight === undefined) {
		return;
	}
	return weight === null ? null : String(weight);
}

export function createPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: [
			"createPerformanceGoal",
			"findPerformanceGoalByIdempotencyKey",
		],
		schema: createPerformanceGoalInputSchema,
		invalidMessage: "Invalid performance goal create input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
		authorize: (opts, data, deps) => {
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.goal);
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

export function updatePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["updatePerformanceGoal"],
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
					weight: serializeGoalWeight(data.weight),
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

export function submitPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["submitPerformanceGoal"],
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

export function approvePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["approvePerformanceGoal"],
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

export function rejectPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["rejectPerformanceGoal"],
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

export function recordGoalProgress(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalProgress>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["recordGoalProgress"],
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

export function activatePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["activatePerformanceGoal"],
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

export function alignPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["alignPerformanceGoal"],
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

export function closePerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["closePerformanceGoal"],
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

export function cancelPerformanceGoal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["cancelPerformanceGoal"],
		schema: performanceGoalStatusTransitionInputSchema,
		invalidMessage: "Invalid performance goal cancel input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
		authorize: async (opts, data, deps) => {
			const goalResult = await deps.store.getPerformanceGoalById({
				organizationId: data.organizationId,
				goalId: data.goalId,
			});
			if (!goalResult.ok) {
				return goalResult;
			}
			if (goalResult.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
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

export function getPerformanceGoalById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoal | null>> {
	return runPerformanceResourceScopedCapabilityQuery(input, options, {
		storeMethods: ["getPerformanceGoalById"],
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET,
		schema: getPerformanceGoalByIdInputSchema,
		invalidMessage: "Invalid performance goal get input",
		execute: (data, { store }) =>
			store.getPerformanceGoalById({
				organizationId: data.organizationId,
				goalId: data.goalId,
			}),
	});
}

export function listEmployeeGoals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalListPage>> {
	return runPerformanceEmployeeScopedCapabilityQuery(input, options, {
		storeMethods: ["listEmployeeGoals"],
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
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

export function listGoalProgress(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceGoalProgressListPage>> {
	return runPerformanceResourceScopedCapabilityQuery(input, options, {
		storeMethods: ["listGoalProgress"],
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_PROGRESS,
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
