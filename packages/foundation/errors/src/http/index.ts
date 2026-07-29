/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { ErrorCode } from "../core/codes";
import { type SafeDetails, sanitizeErrorDetails } from "../core/safe-details";

export {
	clampRetryAfterSeconds,
	MAX_RETRY_AFTER_SECONDS,
	MIN_RETRY_AFTER_SECONDS,
	retryAfterSeconds,
} from "../core/retry-after";

export const ERROR_HTTP_STATUS = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	VALIDATION_ERROR: 422,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
} as const satisfies Readonly<Record<ErrorCode, number>>;

/** Historical alias used by web Route Handlers. */
export const API_ERROR_HTTP_STATUS = ERROR_HTTP_STATUS;

export type HttpErrorBody = Readonly<{
	error: Readonly<{
		code: ErrorCode;
		message: string;
		details?: SafeDetails;
	}>;
}>;

/** Historical alias — same wire shape as OpenAPI `APIErrorBody`. */
export type APIErrorBody = HttpErrorBody;

export function httpErrorBody(
	code: ErrorCode,
	message: string,
	details?: unknown,
): HttpErrorBody {
	const safeDetails = sanitizeErrorDetails(details);
	return safeDetails === undefined
		? { error: { code, message } }
		: { error: { code, message, details: safeDetails } };
}

/** Historical alias. */
export const apiErrorBody = httpErrorBody;
