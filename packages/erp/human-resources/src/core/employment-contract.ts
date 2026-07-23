import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
} from "../module-ids";
import {
	createEmploymentContractInputSchema,
	getEmploymentContractInputSchema,
} from "../schemas/core";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { EmploymentContract } from "../types";

export async function createEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreCommand(input, options, {
		schema: createEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
		execute: async (data, { store, ports }) => {
			const employment = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			return store.createEmploymentContract(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					employeeId: employment.data.employeeId,
					referenceCode: data.referenceCode,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
				}),
			);
		},
	});
}

export async function getEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentContractInputSchema,
		invalidMessage: "Invalid employment contract get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
		execute: async (data, { store }) => {
			const contract = await store.getEmploymentContractById({
				organizationId: data.organizationId,
				employmentContractId: data.employmentContractId,
			});
			if (!contract.ok) {
				return contract;
			}
			if (contract.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment contract not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(contract.data);
		},
	});
}
