import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function parseReceivablesInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	_message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? errorResult.ok(parsed.data)
		: errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
}
