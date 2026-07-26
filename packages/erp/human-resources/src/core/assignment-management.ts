import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import type { WorkAssignment } from "../types";
import { getAssignmentAsOf } from "./assignment";

export { transferAssignment } from "../lifecycle/transfer";
export {
	createAssignment,
	endAssignment,
	getAssignment,
	getAssignmentAsOf,
} from "./assignment";

/** Primary assignment at as-of — alias for unique effective work assignment resolution. */
export async function resolvePrimaryAssignmentAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkAssignment | null>> {
	return getAssignmentAsOf(input, options);
}
