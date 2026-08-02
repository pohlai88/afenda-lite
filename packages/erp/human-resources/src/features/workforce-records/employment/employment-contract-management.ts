import type { Result } from "@afenda/errors";
import type { EmploymentContract } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_RENEW,
} from "../../../kernel/operations/module-ids";
import {
	correctEmploymentContractForOperation,
	supersedeEmploymentContractForOperation,
} from "./employment-contract";
import type {
	CorrectEmploymentContractInput,
	SupersedeEmploymentContractInput,
} from "./schema";

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
