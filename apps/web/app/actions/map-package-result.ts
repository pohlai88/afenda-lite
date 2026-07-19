import type { Result } from "@afenda/errors/result";

import {
	type ActionResult,
	actionFail,
	actionOk,
} from "@/modules/platform/schemas/action-result";

/**
 * Honest `Result` → `ActionResult` map for Rank-1 package calls
 * (`@afenda/admin` · `@afenda/auth` adapter outcomes).
 * Preserves code, message, and details (fieldErrors · disposition · org).
 */
export function mapPackageResult<T>(result: Result<T>): ActionResult<T> {
	if (!result.ok) {
		return actionFail(result.code, result.message, result.details);
	}
	return actionOk(result.data);
}
