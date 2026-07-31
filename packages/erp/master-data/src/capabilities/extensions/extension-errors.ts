import { errorResult, type Result } from "@afenda/errors";
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
	_message: string,
	_field: string,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

export function extensionParentNotFound(
	_parentType: ExtensionParentType,
): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
	});
}

export function extensionParentStateFailure(
	_parentType: ExtensionParentType,
	_status: ExtensionParentStatus,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}
