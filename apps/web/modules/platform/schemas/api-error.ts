import { API_ERROR_CODES } from "@afenda/errors";
import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Shared HTTP error vocabulary (API-002 · API-003 · OPEN-001).
 * Codes / HTTP body builders: `@afenda/errors` (+ `/http`).
 * Route Handler failures use bare `APIErrorBody` — never nested under `{ data }`.
 * Deprecated compatibility helpers stay on `@afenda/errors` — do not re-export unused types.
 */

export {
	API_ERROR_CODES,
	type ApiErrorCode,
	asApiErrorCode,
	isApiErrorCode,
} from "@afenda/errors";
export {
	API_ERROR_HTTP_STATUS,
	type APIErrorBody,
	apiErrorBody,
} from "@afenda/errors/http";

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const apiErrorBodySchema = z.object({
	error: z.object({
		code: apiErrorCodeSchema,
		message: z.string().min(1),
		details: z.unknown().optional(),
	}),
});

/** Route Handler success envelope (API-001) — helpers named `apiData` / `healthJson`. */
export function apiData<T>(data: T): { data: T } {
	return { data };
}

export const healthJson = apiData;
