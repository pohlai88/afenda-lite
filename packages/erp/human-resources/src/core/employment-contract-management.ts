import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import type {
	CorrectEmploymentContractInput,
	SupersedeEmploymentContractInput,
} from "../schemas/core";
import type { EmploymentContract } from "../types";
import {
	correctEmploymentContract,
	createEmploymentContract,
	endEmploymentContract,
	getCurrentEmploymentContract,
	getEmploymentContract,
	getEmploymentContractAsOf,
	listEmploymentContracts,
	supersedeEmploymentContract,
} from "./employment-contract";

export type AmendEmploymentContractInput = CorrectEmploymentContractInput;
export type RenewEmploymentContractInput = SupersedeEmploymentContractInput;

/** Amend — alias for `correctEmploymentContract` (in-place correction with reason + source). */
export async function amendEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return correctEmploymentContract(input, options);
}

/** Renew — alias for `supersedeEmploymentContract` (successor term with lineage). */
export async function renewEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
> {
	return supersedeEmploymentContract(input, options);
}

export {
	createEmploymentContract,
	supersedeEmploymentContract,
	endEmploymentContract,
	getCurrentEmploymentContract,
	listEmploymentContracts,
	getEmploymentContract,
	getEmploymentContractAsOf,
};
