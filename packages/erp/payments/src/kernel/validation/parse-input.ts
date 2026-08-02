import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function parsePaymentsInput<T>(
	schema: z.ZodType<T>,
	input: unknown,
): Result<T> {
	const result = schema.safeParse(input);
	return result.success
		? errorResult.ok(result.data)
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
}

export const normalizedCode = (value: string): string =>
	value.trim().toUpperCase();
