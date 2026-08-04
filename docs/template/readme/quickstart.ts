/**
 * Kit embed for AUTO:CODE markers only.
 * Replace with the target package's public exports before shipping a README.
 */
import { errorResult } from "@afenda/errors";
import type { Result } from "@afenda/errors";

export type QuickstartInput = {
	readonly value: string;
};

export const quickstart = (
	input: QuickstartInput,
): Result<{ readonly value: string }> => {
	if (input.value.trim().length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a value.",
		});
	}
	return errorResult.ok({ value: input.value });
};
