import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET,
} from "../module-ids";
import {
	confirmEmploymentInputSchema,
	getEmploymentConfirmationInputSchema,
} from "../schemas/lifecycle";
import { fingerprintConfirmation } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import type { EmploymentConfirmation } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_CONFIRMATION = "confirmation" as const;
export type HumanResourcesConfirmationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CONFIRMATION;

export async function confirmEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentConfirmation>> {
	return runLifecycleCommand(input, options, {
		schema: confirmEmploymentInputSchema,
		invalidMessage: "Invalid confirm employment input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getEmploymentConfirmation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentConfirmation | null>> {
	return runLifecycleQuery(input, options, {
		schema: getEmploymentConfirmationInputSchema,
		invalidMessage: "Invalid get employment confirmation input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET,
		execute: (data, { store }) =>
			store.getEmploymentConfirmation({
				organizationId: data.organizationId,
				employmentConfirmationId: data.employmentConfirmationId,
			}),
	});
}
