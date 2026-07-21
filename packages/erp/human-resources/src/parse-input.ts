import { fail, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "./error-codes";

export function parseHumanResourcesInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", message, {
			...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}
	return { ok: true, data: parsed.data };
}
