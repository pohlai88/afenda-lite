import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";

/**
 * Honest `Result` → `ActionResult` map for Rank-1 package calls
 * (`@afenda/admin` · `@afenda/auth` adapter outcomes).
 * Preserves code, message, and details (fieldErrors · disposition · org).
 */
export function mapPackageResult<T>(result: Result<T>): ActionResult<T> {
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(result.data);
}
