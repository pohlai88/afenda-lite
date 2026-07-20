import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import type { MasterFailureDetails } from "./contracts/reasons";

export function parseMasterInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", message, {
			reason: "MASTER_VALIDATION_FAILED",
			fieldErrors: parsed.error.flatten().fieldErrors,
		} satisfies MasterFailureDetails);
	}
	return { ok: true, data: parsed.data };
}
