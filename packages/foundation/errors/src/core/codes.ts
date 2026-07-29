/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
/**
 * Shared transport-neutral application error codes.
 *
 * Keep this vocabulary closed. Domain-specific reasons remain owned by domain
 * packages and are mapped to these codes at adapter boundaries.
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

/** Historical aliases retained for web and OpenAPI compatibility. */
export const API_ERROR_CODES = ERROR_CODES;
export type ApiErrorCode = ErrorCode;

const ERROR_CODE_SET: ReadonlySet<string> = new Set(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
	return typeof value === "string" && ERROR_CODE_SET.has(value);
}

/** Historical alias retained for compatibility. */
export const isApiErrorCode = isErrorCode;

/** @deprecated Use ErrorCode directly. */
export type ErrorCodeBrand = ErrorCode;

/** @deprecated Use ApiErrorCode directly. */
export type ApiErrorCodeBrand = ApiErrorCode;

/** @deprecated Values typed as ErrorCode require no additional branding. */
export function asErrorCode(code: ErrorCode): ErrorCode {
	return code;
}

/** @deprecated Values typed as ApiErrorCode require no additional branding. */
export function asApiErrorCode(code: ApiErrorCode): ApiErrorCode {
	return code;
}
