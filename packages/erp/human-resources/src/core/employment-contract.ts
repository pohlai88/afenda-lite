import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	createEmploymentContractInputSchema,
	getEmploymentContractInputSchema,
} from "../schemas/core";
import type { EmploymentContract } from "../types";

export async function createEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	const parsed = parseHumanResourcesInput(
		createEmploymentContractInputSchema,
		input,
		"Invalid employment contract create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const employment = await store.getEmploymentById({
		organizationId: parsed.data.organizationId,
		employmentId: parsed.data.employmentId,
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
			organizationId: parsed.data.organizationId,
			employmentId: parsed.data.employmentId,
			employeeId: employment.data.employeeId,
			referenceCode: parsed.data.referenceCode,
			startsOn: parsed.data.startsOn,
			endsOn: parsed.data.endsOn ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	const parsed = parseHumanResourcesInput(
		getEmploymentContractInputSchema,
		input,
		"Invalid employment contract get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const contract = await store.getEmploymentContractById({
		organizationId: parsed.data.organizationId,
		employmentContractId: parsed.data.employmentContractId,
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
}
