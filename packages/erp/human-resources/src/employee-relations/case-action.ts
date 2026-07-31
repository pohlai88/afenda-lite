import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
} from "../module-ids";
import {
	approveEmployeeCaseActionInputSchema,
	recommendEmployeeCaseActionInputSchema,
} from "../schemas/employee-relations";
import { runEmployeeRelationsCommand } from "../shared/employee-relations-command";
import { fingerprintEmployeeCaseActionRecommend } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { EmployeeCaseAction } from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_ACTION =
	"employee_case_action" as const;
export type HumanResourcesEmployeeCaseActionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_ACTION;

export function recommendEmployeeCaseAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAction>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: recommendEmployeeCaseActionInputSchema,
		invalidMessage: "Invalid employee case action recommend input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
		execute: async (data, { store, ports }) => {
			const fingerprint = fingerprintEmployeeCaseActionRecommend({
				caseId: data.caseId,
				actionType: data.actionType,
			});
			const existing = await store.findEmployeeCaseActionByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existing.data.action);
			}
			return store.recommendEmployeeCaseAction(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					actionType: data.actionType,
					recommendationNote: data.recommendationNote ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					expectedVersion: data.expectedVersion,
					recommendedBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
				}),
			);
		},
	});
}

export function approveEmployeeCaseAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAction>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: approveEmployeeCaseActionInputSchema,
		invalidMessage: "Invalid employee case action approve input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
		execute: (data, { store, ports }) =>
			store.approveEmployeeCaseAction(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					actionId: data.actionId,
					policyValidationRecorded: data.policyValidationRecorded,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
				}),
			),
	});
}
