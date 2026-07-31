import type { CanonicalErrorCode, errorProject } from "@afenda/errors";
import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Web validation mirror for the canonical HTTP projection.
 * Status, retry, wording, and OpenAPI semantics remain owned by @afenda/errors.
 */
export const WEB_API_ERROR_CODES = [
	"BAD_REQUEST",
	"UNAUTHORIZED",
	"FORBIDDEN",
	"NOT_FOUND",
	"CONFLICT",
	"CONCURRENCY_CONFLICT",
	"VALIDATION_ERROR",
	"RATE_LIMITED",
	"INTERNAL_ERROR",
	"SERVICE_UNAVAILABLE",
] as const satisfies readonly CanonicalErrorCode[];

export type ApiErrorCode = (typeof WEB_API_ERROR_CODES)[number];
export type APIErrorBody = ReturnType<typeof errorProject.http>["body"];

export const apiErrorCodeSchema = z.enum(WEB_API_ERROR_CODES);

export const apiErrorBodySchema = z.object({
	error: z.object({
		code: apiErrorCodeSchema,
		messageKey: z.string().min(1),
		message: z.string().min(1),
		details: z.unknown().optional(),
	}),
});

/** Route Handler success envelope (API-001) — helpers named `apiData` / `healthJson`. */
export function apiData<T>(data: T): { data: T } {
	return { data };
}

export const healthJson = apiData;
