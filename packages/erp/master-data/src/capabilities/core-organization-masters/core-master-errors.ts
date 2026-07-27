import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { MasterDependency } from "../../types";

export function coreMasterNotFound(
	entityType: string,
	entityId: string,
): Result<never> {
	return fail("NOT_FOUND", `${entityType} not found`, {
		reason: "MASTER_NOT_FOUND",
		entityType,
		entityId,
	} satisfies MasterFailureDetails);
}

export function coreMasterDependencyBlocked(
	entityType: string,
	entityId: string,
	dependencies: readonly MasterDependency[],
): Result<never> {
	return fail("CONFLICT", `${entityType} has active dependencies`, {
		reason: "MASTER_DEPENDENCY_BLOCKED",
		entityType,
		entityId,
		dependencies,
	} satisfies MasterFailureDetails);
}
