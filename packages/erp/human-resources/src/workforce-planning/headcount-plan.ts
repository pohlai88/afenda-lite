import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
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
	type HumanResourcesCommandId,
} from "../module-ids";
import {
	createHeadcountPlanInputSchema,
	getApprovedHeadcountPlanInputSchema,
	getHeadcountPlanByIdInputSchema,
	getWorkforcePlanVarianceInputSchema,
	headcountPlanStatusTransitionInputSchema,
	listHeadcountPlansInputSchema,
	supersedeHeadcountPlanInputSchema,
	updateHeadcountPlanInputSchema,
} from "../schemas";
import { fingerprintHeadcountPlanCreate } from "../shared/fingerprint";
import type { HeadcountPlanStatus } from "../shared/workforce-planning-status";
import {
	runWorkforcePlanningCommand,
	runWorkforcePlanningQuery,
} from "../shared/workforce-planning-command";
import type {
	HeadcountPlan,
	HeadcountPlanListPage,
	WorkforcePlanVariance,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN =
	"headcount-plan" as const;
export type HumanResourcesHeadcountPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN;

export async function createHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: createHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan create input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.plan);
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: updateHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan update input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
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
				{ correlationId: data.correlationId },
			),
	});
}

async function transitionHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: HumanResourcesCommandId;
		status: Exclude<HeadcountPlanStatus, "draft">;
	},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: headcountPlanStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
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
				{ correlationId: data.correlationId },
			),
	});
}

export async function submitHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan submit input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
		status: "submitted",
	});
}

export async function approveHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan approve input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
		status: "approved",
	});
}

export async function rejectHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan reject input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
		status: "rejected",
	});
}

export async function closeHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return transitionHeadcountPlan(input, options, {
		invalidMessage: "Invalid headcount plan close input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
		status: "closed",
	});
}

export async function supersedeHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: supersedeHeadcountPlanInputSchema,
		invalidMessage: "Invalid headcount plan supersede input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const source = await store.getHeadcountPlanById({
				organizationId: data.organizationId,
				planId: data.planId,
			});
			if (!source.ok) {
				return source;
			}
			if (source.data === null) {
				return fail(
					"NOT_FOUND",
					"Headcount plan not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.plan);
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getHeadcountPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: getHeadcountPlanByIdInputSchema,
		invalidMessage: "Invalid headcount plan get input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET,
		execute: async (data, { store }) => {
			const plan = await store.getHeadcountPlanById({
				organizationId: data.organizationId,
				planId: data.planId,
			});
			if (!plan.ok) {
				return plan;
			}
			if (plan.data === null) {
				return fail(
					"NOT_FOUND",
					"Headcount plan not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(plan.data);
		},
	});
}

export async function listHeadcountPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlanListPage>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: listHeadcountPlansInputSchema,
		invalidMessage: "Invalid headcount plan list input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST,
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

export async function getApprovedHeadcountPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlan>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: getApprovedHeadcountPlanInputSchema,
		invalidMessage: "Invalid approved headcount plan get input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
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
				return fail(
					"NOT_FOUND",
					"Approved headcount plan not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(plan.data);
		},
	});
}

export async function getWorkforcePlanVariance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkforcePlanVariance>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: getWorkforcePlanVarianceInputSchema,
		invalidMessage: "Invalid workforce plan variance get input",
		query: HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET,
		execute: (data, { store }) =>
			store.getWorkforcePlanVariance({
				organizationId: data.organizationId,
				planId: data.planId,
			}),
	});
}
