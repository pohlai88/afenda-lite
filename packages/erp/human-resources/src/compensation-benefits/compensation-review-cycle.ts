import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_GET,
	HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_LIST,
} from "../module-ids";
import {
	compensationReviewCycleStatusTransitionInputSchema,
	createCompensationReviewCycleInputSchema,
	getCompensationReviewCycleInputSchema,
	listCompensationReviewCyclesInputSchema,
} from "../schemas/compensation";
import {
	assertCurrencyExists,
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { fingerprintCompensationReviewCycleCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	CompensationReviewCycle,
	CompensationReviewCycleListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_COMPENSATION_REVIEW_CYCLE =
	"compensation_review_cycle" as const;
export type HumanResourcesCompensationReviewCycleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_COMPENSATION_REVIEW_CYCLE;

export async function createCompensationReviewCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycle>> {
	return runCompensationCommand(input, options, {
		schema: createCompensationReviewCycleInputSchema,
		invalidMessage: "Invalid compensation review cycle create input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.budgetCurrencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}

			const requestFingerprint = fingerprintCompensationReviewCycleCreate({
				code: data.code,
				name: data.name,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				budgetTotalAmount: data.budgetTotalAmount,
				budgetCurrencyCode: data.budgetCurrencyCode,
			});

			const existingByKey =
				await store.findCompensationReviewCycleByIdempotencyKey({
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
				return ok(existingByKey.data.cycle);
			}

			return store.createCompensationReviewCycle(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					budgetTotalAmount: data.budgetTotalAmount,
					budgetCurrencyCode: data.budgetCurrencyCode,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
				}),
			);
		},
	});
}

export async function openCompensationReviewCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycle>> {
	return runCompensationCommand(input, options, {
		schema: compensationReviewCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid compensation review cycle open input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
		execute: (data, { store, ports }) =>
			store.openCompensationReviewCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
				}),
			),
	});
}

export async function closeCompensationReviewCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycle>> {
	return runCompensationCommand(input, options, {
		schema: compensationReviewCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid compensation review cycle close input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
		execute: (data, { store, ports }) =>
			store.closeCompensationReviewCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
				}),
			),
	});
}

export async function cancelCompensationReviewCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycle>> {
	return runCompensationCommand(input, options, {
		schema: compensationReviewCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid compensation review cycle cancel input",
		command: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelCompensationReviewCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
				}),
			),
	});
}

export async function getCompensationReviewCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycle | null>> {
	return runCompensationQuery(input, options, {
		schema: getCompensationReviewCycleInputSchema,
		invalidMessage: "Invalid compensation review cycle get input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_GET,
		execute: (data, { store }) =>
			store.getCompensationReviewCycle({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}

export async function listCompensationReviewCycles(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CompensationReviewCycleListPage>> {
	return runCompensationQuery(input, options, {
		schema: listCompensationReviewCyclesInputSchema,
		invalidMessage: "Invalid compensation review cycle list input",
		query: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_LIST,
		execute: (data, { store }) =>
			store.listCompensationReviewCycles({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
