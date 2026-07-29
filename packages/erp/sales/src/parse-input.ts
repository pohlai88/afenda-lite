import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { SalesFailureDetails } from "./contracts/reasons";

export function parseSalesInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", message, {
			reason: "SALES_VALIDATION_FAILED",
			fieldErrors: parsed.error.flatten().fieldErrors,
		} satisfies SalesFailureDetails);
	}
	return { ok: true, data: parsed.data };
}
