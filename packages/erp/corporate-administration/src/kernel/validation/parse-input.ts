// biome-ignore-all lint/style/useDestructuring: Explicit first-issue access keeps optional validation state visible.
import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import { normalizeSafeFieldPath } from "../internal/safe-field-path";

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
		return errorResult.ok(omitUndefinedObjectFields(parsed.data));
	}

	const firstIssue = parsed.error.issues[0];
	const _field =
		firstIssue === undefined
			? undefined
			: normalizeSafeFieldPath(firstIssue.path);

	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Corporate Administration input is invalid",
	});
}
