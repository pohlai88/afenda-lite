import type { Result as ActionResult } from "@afenda/errors";

/**
 * Shared Server Action result contract (API-002 · API-003).
 * Core Result capability: `errorResult` from `@afenda/errors`.
 * Expected failures return `{ ok: false, … }`; throw only for unexpected bugs.
 * Error codes: import `ApiErrorCode` from `@afenda/errors` (or schemas/api-error).
 */

function firstFieldError(details: unknown, field: string): string | undefined {
	if (typeof details !== "object" || details === null) {
		return;
	}
	if (!("fieldErrors" in details)) {
		return;
	}
	const fieldErrors = readProperty(details, "fieldErrors");
	if (typeof fieldErrors !== "object" || fieldErrors === null) {
		return;
	}
	const messages = readProperty(fieldErrors, field);
	if (!Array.isArray(messages)) {
		return;
	}
	const [first] = messages;
	return typeof first === "string" ? first : undefined;
}

function readProperty(value: object, key: PropertyKey): unknown {
	let property: unknown;
	try {
		property = Reflect.get(value, key);
	} catch {
		property = undefined;
	}
	return property;
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
		return;
	}
	return firstFieldError(state.details, field);
}
