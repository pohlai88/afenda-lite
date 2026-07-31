import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function parseMasterInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	_message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	return { ok: true, data: parsed.data };
}
