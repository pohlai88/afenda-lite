import {
	type ResultFailure as ActionFailure,
	type Result as ActionResult,
	fail as actionFail,
	failFromAppError as actionFailFromAppError,
	ok as actionOk,
	failFromUnknown,
} from "@afenda/errors/result";

/**
 * Shared Server Action result contract (API-002 · API-003).
 * Core Result helpers: `@afenda/errors/result`.
 * Expected failures return `{ ok: false, … }`; throw only for unexpected bugs.
 * Error codes: import `ApiErrorCode` from `@afenda/errors` (or schemas/api-error).
 */

export type { ActionFailure, ActionResult };

export { actionFail, actionFailFromAppError, actionOk };

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

/**
 * API-007 — normalize an unexpected Action failure before projecting it to the
 * public ActionResult shape. The raw error is never exposed to clients.
 */
export function actionFailFromUnknown(
	error: unknown,
	message: string,
	correlationId: string,
): ActionFailure {
	const failure = failFromUnknown(error, message);
	return actionFail(failure.code, failure.message, { correlationId });
}

function firstFieldError(details: unknown, field: string): string | undefined {
	if (typeof details !== "object" || details === null) {
		return undefined;
	}
	if (!("fieldErrors" in details)) {
		return undefined;
	}
	const fieldErrors = readProperty(details, "fieldErrors");
	if (typeof fieldErrors !== "object" || fieldErrors === null) {
		return undefined;
	}
	const messages = readProperty(fieldErrors, field);
	if (!Array.isArray(messages)) {
		return undefined;
	}
	const first = messages[0];
	return typeof first === "string" ? first : undefined;
}

function readProperty(value: object, key: PropertyKey): unknown {
	try {
		return Reflect.get(value, key);
	} catch {
		return undefined;
	}
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
