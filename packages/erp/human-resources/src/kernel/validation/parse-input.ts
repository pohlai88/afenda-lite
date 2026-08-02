import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../execution/error-codes";

export function parseHumanResourcesInput<TSchema extends z.ZodType>(
	schema: TSchema,
	input: unknown,
	_message: string,
): Result<z.infer<TSchema>> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: {
				...humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				fieldErrors: parsed.error.flatten().fieldErrors,
			},
		});
	}
	return { ok: true, data: parsed.data };
}
