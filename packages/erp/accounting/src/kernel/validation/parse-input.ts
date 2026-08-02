import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function normalize(code: string): string {
	return code.toUpperCase().replace(/[\s-]+/g, "");
}

export function failInvalidAccountingInput(_error: z.ZodError): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Invalid accounting input",
	});
}
