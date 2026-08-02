import { errorResult, type Result } from "@afenda/errors";
import type {
	HeadcountPlan,
	HeadcountPlanListPage,
	WorkforcePlanVariance,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintHeadcountPlanCreate } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST,
	HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET,
} from "../../kernel/operations/module-ids";
import type { HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS } from "./operation-registry";
import {
	runWorkforcePlanningCapabilityCommand,
	runWorkforcePlanningCapabilityQuery,
} from "./run-operation";
import {
	createHeadcountPlanInputSchema,
	getApprovedHeadcountPlanInputSchema,
	getHeadcountPlanByIdInputSchema,
	getWorkforcePlanVarianceInputSchema,
	headcountPlanStatusTransitionInputSchema,
	listHeadcountPlansInputSchema,
	supersedeHeadcountPlanInputSchema,
	updateHeadcountPlanInputSchema,
} from "./schema";
import type { HeadcountPlanStatus } from "./status";

export const HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN =
	"headcount-plan" as const;
export type HumanResourcesHeadcountPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN;

export function createHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityCommand(input, options, {
		schema: createHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan create input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
		storeMethods: ["findHeadcountPlanByIdempotencyKey", "createHeadcountPlan"],
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintHeadcountPlanCreate({
				code: data.code,
				title: data.title,
				planningScopeKey: data.planningScopeKey,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
			});

			const existingByKey = await store.findHeadcountPlanByIdempotencyKey({
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
				return errorResult.ok(existingByKey.data.plan);
			}

			return store.createHeadcountPlan(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					title: data.title.trim(),
					planningScopeKey: data.planningScopeKey.trim(),
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					costEnvelopeAmount: data.costEnvelopeAmount ?? null,
					costEnvelopeCurrencyCode: data.costEnvelopeCurrencyCode ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
				}),
			);
		},
	});
}

export function updateHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityCommand(input, options, {
		schema: updateHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan update input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
		storeMethods: ["updateHeadcountPlan"],
		execute: (data, { store, ports }) =>
			store.updateHeadcountPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					title: data.title,
					costEnvelopeAmount: data.costEnvelopeAmount,
					costEnvelopeCurrencyCode: data.costEnvelopeCurrencyCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
				}),
			),
	});
}

function transitionHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: (typeof HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS)[number];
		status: Exclude<HeadcountPlanStatus, "draft">;
	},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityCommand(input, options, {
		schema: headcountPlanStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		storeMethods: ["transitionHeadcountPlanStatus"],
		execute: (data, { store, ports }) =>
			store.transitionHeadcountPlanStatus(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					status: config.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					rejectionReason: data.rejectionReason,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
				}),
			),
	});
}

export function submitHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan submit input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
		status: "submitted",
	});
}

export function approveHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan approve input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
		status: "approved",
	});
}

export function rejectHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan reject input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
		status: "rejected",
	});
}

export function closeHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan close input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
		status: "closed",
	});
}

export function supersedeHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityCommand(input, options, {
		schema: supersedeHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan supersede input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
		storeMethods: [
			"getHeadcountPlanById",
			"findHeadcountPlanByIdempotencyKey",
			"supersedeHeadcountPlan",
		],
		execute: async (data, { store, ports }) => {
			const source = await store.getHeadcountPlanById({
				organizationId: data.organizationId,
				planId: data.planId,
			});
			if (!source.ok) {
				return source;
			}
			if (source.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const requestFingerprint = fingerprintHeadcountPlanCreate({
				code: data.code,
				title: data.title,
				planningScopeKey: source.data.planningScopeKey,
				periodStart: source.data.periodStart,
				periodEnd: source.data.periodEnd,
			});

			const existingByKey = await store.findHeadcountPlanByIdempotencyKey({
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
				return errorResult.ok(existingByKey.data.plan);
			}

			return store.supersedeHeadcountPlan(
				{
					organizationId: data.organizationId,
					sourcePlanId: data.planId,
					code: data.code.trim(),
					title: data.title.trim(),
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
				}),
			);
		},
	});
}

export function getHeadcountPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityQuery(input, options, {
		schema: getHeadcountPlanByIdInputSchema,
		invalidMessage: "Invalid headcount plan get input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
		storeMethods: ["getHeadcountPlanById"],
		execute: async (data, { store }) => {
			const plan = await store.getHeadcountPlanById({
				organizationId: data.organizationId,
				planId: data.planId,
			});
			if (!plan.ok) {
				return plan;
			}
			if (plan.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(plan.data);
		},
	});
}

export function listHeadcountPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlanListPage>> {
	return runWorkforcePlanningCapabilityQuery(input, options, {
		schema: listHeadcountPlansInputSchema,
		invalidMessage: "Invalid headcount plan list input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST,
		storeMethods: ["listHeadcountPlans"],
		execute: (data, { store }) =>
			store.listHeadcountPlans({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				planningScopeKey: data.planningScopeKey,
			}),
	});
}

export function getApprovedHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCapabilityQuery(input, options, {
		schema: getApprovedHeadcountPlanInputSchema,
		invalidMessage: "Invalid approved headcount plan get input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
		storeMethods: ["findApprovedHeadcountPlanForScope"],
		execute: async (data, { store }) => {
			const plan = await store.findApprovedHeadcountPlanForScope({
				organizationId: data.organizationId,
				planningScopeKey: data.planningScopeKey,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
			});
			if (!plan.ok) {
				return plan;
			}
			if (plan.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(plan.data);
		},
	});
}

export function getWorkforcePlanVariance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkforcePlanVariance>> {
	return runWorkforcePlanningCapabilityQuery(input, options, {
		schema: getWorkforcePlanVarianceInputSchema,
		invalidMessage: "Invalid workforce plan variance get input",
		query: HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET,
		storeMethods: ["getWorkforcePlanVariance"],
		execute: (data, { store }) =>
			store.getWorkforcePlanVariance({
				organizationId: data.organizationId,
				planId: data.planId,
				asOf: data.asOf,
			}),
	});
}
