import { errorResult, type Result } from "@afenda/errors";

import type {
	ActorSegregationRule,
	ChangeRequestActorField,
} from "./change-request-types";
import { governanceActorSegregationViolation } from "./governance-errors";

export function assertActorSegregation(input: {
	actors: Partial<Record<ChangeRequestActorField, string | null>>;
	rules: readonly ActorSegregationRule[];
}): Result<true> {
	for (const rule of input.rules) {
		const left = input.actors[rule.left];
		const right = input.actors[rule.right];
		if (left !== null && left !== undefined && left === right) {
			return governanceActorSegregationViolation({
				operation: rule.operation,
				fields: [...new Set([rule.left, rule.right])],
			});
		}
	}
	return errorResult.ok(true);
}
