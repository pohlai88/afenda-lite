import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import type {
	AmendEmploymentInput,
	CreateEmploymentInput,
} from "../schemas/core";
import type { Employment } from "../types";
import { amendEmployment, createEmployment } from "./employment";

export type HireEmploymentInput = CreateEmploymentInput;
export type RehireEmploymentInput = CreateEmploymentInput;

export type SuspendEmploymentInput = Omit<AmendEmploymentInput, "status">;
export type ReactivateEmploymentInput = Omit<AmendEmploymentInput, "status">;
export type TerminateEmploymentInput = Omit<AmendEmploymentInput, "status">;

function amendWithStatus(
	input: unknown,
	status: AmendEmploymentInput["status"],
	options: HumanResourcesCommandOptions,
): Promise<Result<Employment>> {
	const payload =
		typeof input === "object" && input !== null
			? { ...input, status }
			: { status };
	return amendEmployment(payload, options);
}

/** Hire — alias for `createEmployment` (first tenure or explicit hire). */
export function hireEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return createEmployment(input, options);
}

/** Rehire — alias for `hireEmployment` after prior tenure ended. */
export function rehireEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return hireEmployment(input, options);
}

/** Suspend — `active → notice` via `amendEmployment`. */
export function suspendEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(input, "notice", options);
}

/** Reactivate — `notice → active` via `amendEmployment`. */
export function reactivateEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(input, "active", options);
}

/** Terminate — `active|notice → terminated` via `amendEmployment`. */
export function terminateEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return amendWithStatus(input, "terminated", options);
}
