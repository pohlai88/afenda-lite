import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
	HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE,
} from "../module-ids";
import {
	amendImprovementPlanInputSchema,
	createImprovementPlanInputSchema,
	getEmployeePerformanceHistoryInputSchema,
	getImprovementPlanByIdInputSchema,
	improvementPlanStatusTransitionInputSchema,
	listActiveImprovementPlansInputSchema,
	recordImprovementCheckpointInputSchema,
} from "../schemas";
import { fingerprintImprovementPlanCreate } from "../shared/fingerprint";
import {
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import type {
	EmployeePerformanceHistory,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_IMPROVEMENT_PLAN =
	"improvement-plan" as const;
export type HumanResourcesImprovementPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_IMPROVEMENT_PLAN;

export async function createImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: createImprovementPlanInputSchema,
		invalidMessage: "Invalid improvement plan create input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintImprovementPlanCreate({
				reviewId: data.reviewId,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				dueDate: data.dueDate,
			});

			const existingByKey = await store.findImprovementPlanByIdempotencyKey({
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
				return ok(existingByKey.data.plan);
			}

			return store.createImprovementPlan(
				{
					organizationId: data.organizationId,
					reviewId: data.reviewId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					performanceGap: data.performanceGap,
					expectedOutcome: data.expectedOutcome,
					measurableActions: data.measurableActions,
					supportResources: data.supportResources,
					dueDate: data.dueDate,
					accountableManagerEmployeeId: data.accountableManagerEmployeeId,
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

export async function openImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: improvementPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid improvement plan open input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
		execute: (data, { store, ports }) =>
			store.openImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function acknowledgeImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: improvementPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid improvement plan acknowledge input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
		execute: (data, { store, ports }) =>
			store.acknowledgeImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function recordImprovementCheckpoint(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementCheckpoint>> {
	return runPerformanceCommand(input, options, {
		schema: recordImprovementCheckpointInputSchema,
		invalidMessage: "Invalid improvement checkpoint record input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
		execute: (data, { store, ports }) =>
			store.recordImprovementCheckpoint(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					sequenceNumber: data.sequenceNumber,
					outcome: data.outcome,
					notes: data.notes ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function amendImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: amendImprovementPlanInputSchema,
		invalidMessage: "Invalid improvement plan amend input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND,
		execute: (data, { store, ports }) =>
			store.amendImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					measurableActions: data.measurableActions,
					supportResources: data.supportResources,
					dueDate: data.dueDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function completeImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: improvementPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid improvement plan complete input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
		execute: (data, { store, ports }) =>
			store.completeImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function closeImprovementPlanUnsuccessful(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: improvementPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid improvement plan close unsuccessful input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
		execute: (data, { store, ports }) =>
			store.closeImprovementPlanUnsuccessful(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: improvementPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid improvement plan cancel input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getImprovementPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan | null>> {
	return runPerformanceQuery(input, options, {
		schema: getImprovementPlanByIdInputSchema,
		invalidMessage: "Invalid improvement plan get input",
		query: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET,
		execute: (data, { store }) =>
			store.getImprovementPlanById({
				organizationId: data.organizationId,
				planId: data.planId,
			}),
	});
}

export async function listActiveImprovementPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlanListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listActiveImprovementPlansInputSchema,
		invalidMessage: "Invalid active improvement plans list input",
		query: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE,
		execute: (data, { store }) =>
			store.listActiveImprovementPlans({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
			}),
	});
}

export async function getEmployeePerformanceHistory(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeePerformanceHistory>> {
	return runPerformanceQuery(input, options, {
		schema: getEmployeePerformanceHistoryInputSchema,
		invalidMessage: "Invalid employee performance history get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
		execute: (data, { store }) =>
			store.getEmployeePerformanceHistory({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				includeConfidential: data.includeConfidential,
			}),
	});
}
