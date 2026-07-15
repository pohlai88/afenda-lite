import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Shared HTTP error vocabulary (API-002 · API-003 · OPEN-001).
 * Route Handler failures use bare `APIErrorBody` — never nested under `{ data }`.
 */

export const API_ERROR_CODES = [
	"BAD_REQUEST",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"VALIDATION_ERROR",
	"INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Closed error-code brand — construct only via `asApiErrorCode` / known literals. */
export type ApiErrorCodeBrand = ApiErrorCode & {
	readonly __brand: "ApiErrorCode";
};

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const API_ERROR_HTTP_STATUS = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	VALIDATION_ERROR: 422,
	INTERNAL_ERROR: 500,
} as const satisfies Record<ApiErrorCode, number>;

export const apiErrorBodySchema = z.object({
	error: z.object({
		code: apiErrorCodeSchema,
		message: z.string().min(1),
		details: z.unknown().optional(),
	}),
});

export type APIErrorBody = z.infer<typeof apiErrorBodySchema>;

export function isApiErrorCode(value: string): value is ApiErrorCode {
	return (API_ERROR_CODES as readonly string[]).includes(value);
}

export function asApiErrorCode(code: ApiErrorCode): ApiErrorCodeBrand {
	return code as ApiErrorCodeBrand;
}

export function apiErrorBody(
	code: ApiErrorCode,
	message: string,
	details?: unknown,
): APIErrorBody {
	return details === undefined
		? { error: { code, message } }
		: { error: { code, message, details } };
}

/** Route Handler success envelope (API-001) — helpers named `apiData` / `healthJson`. */
export function apiData<T>(data: T): { data: T } {
	return { data };
}

export const healthJson = apiData;
