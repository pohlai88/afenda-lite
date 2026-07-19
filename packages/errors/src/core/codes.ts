/**
 * Shared transport-neutral error codes (relocated from web API-002 vocabulary).
 */

export const ERROR_CODES = [
	"BAD_REQUEST",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"VALIDATION_ERROR",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
	"SERVICE_UNAVAILABLE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Wire alias — same brand surface as historical `ApiErrorCode`. */
export type ApiErrorCode = ErrorCode;

/** Wire alias — same const array as historical `API_ERROR_CODES`. */
export const API_ERROR_CODES = ERROR_CODES;

/** Closed error-code brand — construct only via `asErrorCode` / known literals. */
export type ErrorCodeBrand = ErrorCode & {
	readonly __brand: "ErrorCode";
};

/** Historical brand alias kept for web OpenAPI re-exports. */
export type ApiErrorCodeBrand = ErrorCode & {
	readonly __brand: "ApiErrorCode";
};

export function isErrorCode(value: string): value is ErrorCode {
	return (ERROR_CODES as readonly string[]).includes(value);
}

export const isApiErrorCode = isErrorCode;

export function asErrorCode(code: ErrorCode): ErrorCodeBrand {
	return code as ErrorCodeBrand;
}

export function asApiErrorCode(code: ErrorCode): ApiErrorCodeBrand {
	return code as ApiErrorCodeBrand;
}
