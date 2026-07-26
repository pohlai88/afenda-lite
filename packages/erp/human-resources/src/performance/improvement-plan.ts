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
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE,
	HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_CHECKPOINTS,
} from "../module-ids";
import {
	amendImprovementPlanInputSchema,
	closeImprovementPlanUnsuccessfulInputSchema,
	completeImprovementPlanInputSchema,
	createImprovementPlanInputSchema,
	getImprovementPlanByIdInputSchema,
	improvementPlanStatusTransitionInputSchema,
	listActiveImprovementPlansInputSchema,
	listImprovementPlanCheckpointsInputSchema,
	recordImprovementCheckpointInputSchema,
} from "../schemas/performance";
import { fingerprintImprovementPlanCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import { assertImprovementPlanMilestones } from "../shared/performance-guards";
import type {
	PerformanceImprovementCheckpoint,
	PerformanceImprovementCheckpointListPage,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_IMPROVEMENT_PLAN =
	"improvement-plan" as const;
export type HumanResourcesImprovementPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_IMPROVEMENT_PLAN;

function resolveImprovementPlanMilestones(input: {
	dueDate: string;
	milestones?: Array<{ dueDate: string }>;
}): Result<Array<{ dueDate: string }>> {
	const milestones = input.milestones ?? [{ dueDate: input.dueDate }];
	const validation = assertImprovementPlanMilestones({
		planDueDate: input.dueDate,
		milestones,
	});
	if (!validation.ok) {
		return validation;
	}
	return ok(milestones);
}

export async function createImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: createImprovementPlanInputSchema,
		invalidMessage: "Invalid improvement plan create input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
		execute: async (data, { store, ports }) => {
			const milestones = resolveImprovementPlanMilestones({
				dueDate: data.dueDate,
				milestones: data.milestones,
			});
			if (!milestones.ok) {
				return milestones;
			}

			const requestFingerprint = fingerprintImprovementPlanCreate({
				reviewId: data.reviewId,
				employeeId: data.employeeId,
				employmentId: data.employmentId,
				dueDate: data.dueDate,
				milestones: milestones.data,
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
					milestones: milestones.data,
					accountableManagerEmployeeId: data.accountableManagerEmployeeId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
				}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN,
				}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
				}),
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
					evidenceReference: data.evidenceReference ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
				}),
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
					performanceGap: data.performanceGap,
					expectedOutcome: data.expectedOutcome,
					measurableActions: data.measurableActions,
					supportResources: data.supportResources,
					dueDate: data.dueDate,
					extensionReason: data.extensionReason,
					extensionEvidenceReference: data.extensionEvidenceReference ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND,
				}),
			),
	});
}

export async function completeImprovementPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: completeImprovementPlanInputSchema,
		invalidMessage: "Invalid improvement plan complete input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
		execute: (data, { store, ports }) =>
			store.completeImprovementPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					outcomeReason: data.outcomeReason,
					outcomeEvidenceReference: data.outcomeEvidenceReference ?? null,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
				}),
			),
	});
}

export async function closeImprovementPlanUnsuccessful(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementPlan>> {
	return runPerformanceCommand(input, options, {
		schema: closeImprovementPlanUnsuccessfulInputSchema,
		invalidMessage: "Invalid improvement plan close unsuccessful input",
		command: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
		execute: (data, { store, ports }) =>
			store.closeImprovementPlanUnsuccessful(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					outcomeReason: data.outcomeReason,
					outcomeEvidenceReference: data.outcomeEvidenceReference ?? null,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
				}),
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
				}),
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

export async function listImprovementPlanCheckpoints(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceImprovementCheckpointListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listImprovementPlanCheckpointsInputSchema,
		invalidMessage: "Invalid improvement plan checkpoints list input",
		query: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_CHECKPOINTS,
		execute: (data, { store }) =>
			store.listImprovementPlanCheckpoints({
				organizationId: data.organizationId,
				planId: data.planId,
			}),
	});
}

// Re-export from review module to avoid duplication
export { getEmployeePerformanceHistory } from "./review";
