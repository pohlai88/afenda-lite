import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function parsePayablesInput<T>(
	schema: z.ZodType<T>,
	input: unknown,
): Result<T> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? errorResult.ok(parsed.data)
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
}

export const normalizedCode = (code: string): string =>
	code.trim().toUpperCase();
