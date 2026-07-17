import type { ApiErrorCode } from "@/modules/platform/schemas/api-error";

/**
 * Shared Server Action result contract (API-002 · API-003).
 * Expected failures return `{ ok: false, … }`; throw only for unexpected bugs.
 */

export type ActionSuccess<T> = {
	ok: true;
	data: T;
};

export type ActionFailure = {
	ok: false;
	code: ApiErrorCode;
	message: string;
	details?: unknown;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function actionOk<T>(data: T): ActionSuccess<T> {
	return { ok: true, data };
}

export function actionFail(
	code: ApiErrorCode,
	message: string,
	details?: unknown,
): ActionFailure {
	return details === undefined
		? { ok: false, code, message }
		: { ok: false, code, message, details };
}

export function isActionSuccess<T>(
	result: ActionResult<T>,
): result is ActionSuccess<T> {
	return result.ok;
}

export function isActionFailure<T>(
	result: ActionResult<T>,
): result is ActionFailure {
	return !result.ok;
}

type ActionFieldErrorDetails = {
	fieldErrors?: Record<string, string[] | undefined>;
};

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
	if (typeof state.details !== "object" || state.details === null) {
		return undefined;
	}
	const messages = (state.details as ActionFieldErrorDetails).fieldErrors?.[
		field
	];
	return messages?.[0];
}
