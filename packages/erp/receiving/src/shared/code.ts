import { fail, ok, type Result } from "@afenda/errors/result";

const MAX_RECEIPT_CODE_LENGTH = 64;

export function normalizeReceiptCode(
	input: string,
): Result<{ code: string; normalizedCode: string }> {
	const code = input.trim();
	if (code.length === 0 || code.length > MAX_RECEIPT_CODE_LENGTH) {
		return fail(
			"BAD_REQUEST",
			`Receipt code must be 1-${MAX_RECEIPT_CODE_LENGTH} characters`,
		);
	}
	return ok({ code, normalizedCode: code.toUpperCase() });
}
