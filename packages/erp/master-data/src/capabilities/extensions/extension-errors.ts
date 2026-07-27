import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { MasterStatus } from "../../types";

export type ExtensionParentType =
	| "party"
	| "related_party"
	| "item"
	| "warehouse"
	| "item_template"
	| "item_template_attribute"
	| "item_variant";

export type ExtensionParentStatus = MasterStatus | "merged";

/** Produces the package-standard typed validation failure for an extension field. */
export function extensionValidationFailure(
	message: string,
	field: string,
): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
		field,
	} satisfies MasterFailureDetails);
}

export function extensionParentNotFound(
	parentType: ExtensionParentType,
): Result<never> {
	return fail("NOT_FOUND", `${parentType} not found`, {
		reason: "MASTER_NOT_FOUND",
		parentType,
	} satisfies MasterFailureDetails);
}

export function extensionParentStateFailure(
	parentType: ExtensionParentType,
	status: ExtensionParentStatus,
): Result<never> {
	return fail("CONFLICT", `${parentType} cannot accept new extensions`, {
		reason: "MASTER_INVALID_STATE",
		parentType,
		status,
	} satisfies MasterFailureDetails);
}
