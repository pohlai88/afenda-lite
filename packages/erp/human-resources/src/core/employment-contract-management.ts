import type { Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import type {
	CorrectEmploymentContractInput,
	SupersedeEmploymentContractInput,
} from "../schemas/core";
import type { EmploymentContract } from "../types";
import {
	correctEmploymentContract,
	supersedeEmploymentContract,
} from "./employment-contract";

export type AmendEmploymentContractInput = CorrectEmploymentContractInput;
export type RenewEmploymentContractInput = SupersedeEmploymentContractInput;

/** Amend — alias for `correctEmploymentContract` (in-place correction with reason + source). */
export function amendEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmploymentContract>> {
	return correctEmploymentContract(input, options);
}

/** Renew — alias for `supersedeEmploymentContract` (successor term with lineage). */
export function renewEmploymentContract(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{ superseded: EmploymentContract; successor: EmploymentContract }>
> {
	return supersedeEmploymentContract(input, options);
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
