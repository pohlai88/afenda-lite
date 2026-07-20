import type { ErrorCode } from "../core/codes";

export {
	clampRetryAfterSeconds,
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
} as const satisfies Record<ErrorCode, number>;

/** Historical alias used by web Route Handlers. */
export const API_ERROR_HTTP_STATUS = ERROR_HTTP_STATUS;

export type HttpErrorBody = {
	error: {
		code: ErrorCode;
		message: string;
		details?: unknown;
	};
};

/** Historical alias — same wire shape as OpenAPI `APIErrorBody`. */
export type APIErrorBody = HttpErrorBody;

export function httpErrorBody(
	code: ErrorCode,
	message: string,
	details?: unknown,
): HttpErrorBody {
	return details === undefined
		? { error: { code, message } }
		: { error: { code, message, details } };
}

/** Historical alias. */
export const apiErrorBody = httpErrorBody;
