import {
	type ResultFailure as ActionFailure,
	type Result as ActionResult,
	fail as actionFail,
	ok as actionOk,
} from "@afenda/errors/result";

/**
 * Shared Server Action result contract (API-002 · API-003).
 * Core Result helpers: `@afenda/errors/result`.
 * Expected failures return `{ ok: false, … }`; throw only for unexpected bugs.
 * Error codes: import `ApiErrorCode` from `@afenda/errors` (or schemas/api-error).
 */

export type { ActionFailure, ActionResult };

export { actionFail, actionOk };

/**
 * API-007 — unexpected Action failure with safe client correlation reference.
 * `details` is always `{ correlationId }` only (no stacks / secrets).
 */
export function actionFailInternal(
	message: string,
	correlationId: string,
): ActionFailure {
	return actionFail("INTERNAL_ERROR", message, { correlationId });
}

function firstFieldError(details: unknown, field: string): string | undefined {
	if (typeof details !== "object" || details === null) {
		return undefined;
	}
	if (!("fieldErrors" in details)) {
		return undefined;
	}
	const fieldErrors = Reflect.get(details, "fieldErrors");
	if (typeof fieldErrors !== "object" || fieldErrors === null) {
		return undefined;
	}
	const messages = Reflect.get(fieldErrors, field);
	if (!Array.isArray(messages)) {
		return undefined;
	}
	const first = messages[0];
	return typeof first === "string" ? first : undefined;
}

/**
 * First Zod/`parseSchema` field error from an ActionResult failure.
 * Forms use this for FormField `error`; prefer over duplicating casts.
 */
export function actionFieldMessage(
	state: ActionResult<unknown> | null | undefined,
	field: string,
): string | undefined {
	if (!state || state.ok || state.details === undefined) {
		return undefined;
	}
	return firstFieldError(state.details, field);
}
