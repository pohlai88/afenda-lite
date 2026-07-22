import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
} from "../module-ids";
import { runEmployeeRelationsCommand } from "../shared/employee-relations-command";
import { fingerprintEmployeeCaseActionRecommend } from "../shared/fingerprint";
import {
	approveEmployeeCaseActionInputSchema,
	recommendEmployeeCaseActionInputSchema,
} from "./schemas";
import type { EmployeeCaseAction } from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_ACTION =
	"employee_case_action" as const;
export type HumanResourcesEmployeeCaseActionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_ACTION;

export async function recommendEmployeeCaseAction(
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.action);
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function approveEmployeeCaseAction(
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
				{ correlationId: data.correlationId },
			),
	});
}
