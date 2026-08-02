import type { Result } from "@afenda/errors";
import type { EmploymentConfirmation } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { fingerprintConfirmation } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET,
} from "../../kernel/operations/module-ids";
import {
	runEmploymentLifecycleCommand,
	runEmploymentLifecycleQuery,
} from "./run-operation";
import {
	confirmEmploymentInputSchema,
	getEmploymentConfirmationInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_CONFIRMATION = "confirmation" as const;
export type HumanResourcesConfirmationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CONFIRMATION;

export function confirmEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentConfirmation>> {
	return runEmploymentLifecycleCommand(input, options, {
		schema: confirmEmploymentInputSchema,
		invalidMessage: "Invalid confirm employment input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
		storeMethods: ["confirmEmployment"],
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintConfirmation({
				employmentId: data.employmentId,
				confirmedOn: data.confirmedOn,
			});
			return store.confirmEmployment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					confirmedOn: data.confirmedOn,
					evidenceNote: data.evidenceNote.trim(),
					idempotencyKey: data.idempotencyKey,
					confirmRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
				}),
			);
		},
	});
}

export function getEmploymentConfirmation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentConfirmation | null>> {
	return runEmploymentLifecycleQuery(input, options, {
		schema: getEmploymentConfirmationInputSchema,
		invalidMessage: "Invalid get employment confirmation input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET,
		storeMethods: ["getEmploymentConfirmation"],
		execute: (data, { store }) =>
			store.getEmploymentConfirmation({
				organizationId: data.organizationId,
				employmentConfirmationId: data.employmentConfirmationId,
			}),
	});
}
