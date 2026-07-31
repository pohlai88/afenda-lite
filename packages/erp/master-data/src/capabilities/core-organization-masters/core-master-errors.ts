import { errorResult, type Result } from "@afenda/errors";
import type { MasterDependency } from "../../types";

export function coreMasterNotFound(
	_entityType: string,
	_entityId: string,
): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
	});
}

export function coreMasterDependencyBlocked(
	_entityType: string,
	_entityId: string,
	_dependencies: readonly MasterDependency[],
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}
