import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

export function normalize(value: string): string {
	return value
		.trim()
		.normalize("NFC")
		.replace(/[\s._-]+/g, "")
		.toUpperCase();
}

export function failInvalidCorporateAdministrationInput(
	_error: z.ZodError,
): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Invalid corporate administration input",
	});
}
