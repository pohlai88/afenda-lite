// biome-ignore-all lint/style/useDestructuring: Explicit first-issue access keeps optional validation state visible.
import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import { corporateAdministrationErrorDetails } from "./error-codes";
import { normalizeSafeFieldPath } from "./internal/safe-field-path";

function omitUndefinedObjectFields<TValue>(value: TValue): TValue {
	if (Array.isArray(value)) {
		return value.map(omitUndefinedObjectFields) as TValue;
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		return value;
	}

	const canonical: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry !== undefined) {
			canonical[key] = omitUndefinedObjectFields(entry);
		}
	}
	return canonical as TValue;
}

/**
 * Ordinary Zod validation failures become a governed `Result` failure.
 * Exceptions thrown by transforms, preprocessors, refinements, or getters are
 * programming failures and intentionally propagate — they must not be
 * disguised as invalid user input.
 */
export function parseCorporateAdministrationInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
): Result<z.output<TSchema>> {
	const parsed = schema.safeParse(input);

	if (parsed.success) {
		return ok(omitUndefinedObjectFields(parsed.data));
	}

	const firstIssue = parsed.error.issues[0];
	const field =
		firstIssue === undefined
			? undefined
			: normalizeSafeFieldPath(firstIssue.path);

	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration input is invalid",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			field === undefined ? {} : { field },
		),
	);
}
