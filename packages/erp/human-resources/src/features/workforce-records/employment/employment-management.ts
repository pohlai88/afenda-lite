import type { Result } from "@afenda/errors";
import type { Employment } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_HIRE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REACTIVATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REHIRE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_SUSPEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_TERMINATE,
} from "../../../kernel/operations/module-ids";
import {
	amendEmploymentForOperation,
	createEmploymentForOperation,
} from "./employment";
import type { AmendEmploymentInput, CreateEmploymentInput } from "./schema";

export type HireEmploymentInput = CreateEmploymentInput;
export type RehireEmploymentInput = CreateEmploymentInput;

export type SuspendEmploymentInput = Omit<AmendEmploymentInput, "status">;
export type ReactivateEmploymentInput = Omit<AmendEmploymentInput, "status">;
export type TerminateEmploymentInput = Omit<AmendEmploymentInput, "status">;

function amendWithStatus(
	input: unknown,
	status: AmendEmploymentInput["status"],
	options: HumanResourcesCommandOptions,
	command:
		| typeof HUMAN_RESOURCES_COMMAND_EMPLOYMENT_SUSPEND
		| typeof HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REACTIVATE
		| typeof HUMAN_RESOURCES_COMMAND_EMPLOYMENT_TERMINATE,
): Promise<Result<Employment>> {
	const payload =
		typeof input === "object" && input !== null
			? { ...input, status }
			: { status };
	return amendEmploymentForOperation(payload, options, command);
}

/** Starts a first or explicitly hired employment tenure. */
export function hireEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return createEmploymentForOperation(
		input,
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_HIRE,
	);
}

/** Starts a new employment tenure after a prior tenure ended. */
export function rehireEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return createEmploymentForOperation(
		input,
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REHIRE,
	);
}

/** Suspend — `active → notice` via `amendEmployment`. */
export function suspendEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(
		input,
		"notice",
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_SUSPEND,
	);
}

/** Reactivate — `notice → active` via `amendEmployment`. */
export function reactivateEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(
		input,
		"active",
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REACTIVATE,
	);
}

/** Terminate — `active|notice → terminated` via `amendEmployment`. */
export function terminateEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(
		input,
		"terminated",
		options,
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_TERMINATE,
	);
}
