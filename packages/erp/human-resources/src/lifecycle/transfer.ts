import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import { HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER } from "../module-ids";
import { transferAssignmentInputSchema } from "../schemas/lifecycle";
import { runLifecycleCommand } from "../shared/lifecycle-command";
import type { EmploymentMovement } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_TRANSFER = "transfer" as const;
export type HumanResourcesTransferAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TRANSFER;

export async function transferAssignment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentMovement>> {
	return runLifecycleCommand(input, options, {
		schema: transferAssignmentInputSchema,
		invalidMessage: "Invalid transfer assignment input",
		command: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
		execute: (data, { store, ports }) =>
			store.transferAssignment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					toPositionId: data.toPositionId,
					effectiveOn: data.effectiveOn,
					reason: data.reason,
					idempotencyKey: data.idempotencyKey,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}
