import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

export function parseReceivablesInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	return parsed.success
		? ok(parsed.data)
		: fail("BAD_REQUEST", message, {
				fieldErrors: parsed.error.flatten().fieldErrors,
			});
}
