import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

export function parsePurchasingInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", message, {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return { ok: true, data: parsed.data };
}
