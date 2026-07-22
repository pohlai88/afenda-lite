import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_QUERY_TERMINATION_GET,
} from "../module-ids";
import {
	finalizeTerminationInputSchema,
	getTerminationInputSchema,
} from "../schemas/lifecycle";
import { fingerprintTermination } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import type { Termination } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_TERMINATION = "termination" as const;
export type HumanResourcesTerminationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TERMINATION;

export async function finalizeTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination>> {
	return runLifecycleCommand(input, options, {
		schema: finalizeTerminationInputSchema,
		invalidMessage: "Invalid finalize termination input",
		command: HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintTermination({
				employmentId: data.employmentId,
				effectiveOn: data.effectiveOn,
			});
			return store.finalizeTermination(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					reasonCode: data.reasonCode.trim(),
					reasonDetail: data.reasonDetail.trim(),
					effectiveOn: data.effectiveOn,
					idempotencyKey: data.idempotencyKey,
					terminationRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getTermination(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Termination | null>> {
	return runLifecycleQuery(input, options, {
		schema: getTerminationInputSchema,
		invalidMessage: "Invalid get termination input",
		query: HUMAN_RESOURCES_QUERY_TERMINATION_GET,
		execute: (data, { store }) =>
			store.getTermination({
				organizationId: data.organizationId,
				terminationId: data.terminationId,
			}),
	});
}
