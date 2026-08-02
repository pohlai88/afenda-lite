import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_RENEW,
} from "../module-ids";
import type {
	CorrectEmploymentContractInput,
	SupersedeEmploymentContractInput,
} from "../schemas/core";
import type { EmploymentContract } from "../types";
import {
	correctEmploymentContractForOperation,
	supersedeEmploymentContractForOperation,
} from "./employment-contract";

export type AmendEmploymentContractInput = CorrectEmploymentContractInput;
export type RenewEmploymentContractInput = SupersedeEmploymentContractInput;

/** Amends an employment contract in place with a reason and source. */
export function amendEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return correctEmploymentContractForOperation(
		input,
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_AMEND,
	);
}

/** Renews an employment contract by creating a successor with lineage. */
export function renewEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
> {
	return supersedeEmploymentContractForOperation(
		input,
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_RENEW,
	);
}

export {
	createEmploymentContract,
	endEmploymentContract,
	getCurrentEmploymentContract,
	getEmploymentContract,
	getEmploymentContractAsOf,
	listEmploymentContracts,
	supersedeEmploymentContract,
} from "./employment-contract";
