import type { Result } from "@afenda/errors/result";
import {
	type HumanResourcesCommandOptions,
	requireOrganizationDimensionDirectory,
} from "../command-options";
import { HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER } from "../module-ids";
import { transferAssignmentInputSchema } from "../schemas/lifecycle";
import { runLifecycleCommand } from "../shared/lifecycle-command";
import { buildMutationMeta } from "../shared/mutation-meta";
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
		execute: async (data, { store, ports }) => {
			const directory = requireOrganizationDimensionDirectory(options);
			if (!directory.ok) return directory;
			const dimensions = await directory.data.resolveRequiredAsOf({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				asOf: data.effectiveOn,
				keys: {
					legal_entity: data.legalEntityKey,
					business_unit: data.businessUnitKey,
					location: data.locationKey,
					cost_centre: data.costCentreKey,
					project: data.projectKey,
				},
			});
			if (!dimensions.ok) return dimensions;
			return store.transferAssignment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					toPositionId: data.toPositionId,
					organizationDimensions: dimensions.data,
					effectiveOn: data.effectiveOn,
					reason: data.reason,
					idempotencyKey: data.idempotencyKey,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
				}),
			);
		},
	});
}
