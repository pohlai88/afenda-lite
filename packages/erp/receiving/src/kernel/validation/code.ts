import { errorResult, type Result } from "@afenda/errors";

const MAX_RECEIPT_CODE_LENGTH = 64;

export function normalizeReceiptCode(
	input: string,
): Result<{ code: string; normalizedCode: string }> {
	const code = input.trim();
	if (code.length === 0 || code.length > MAX_RECEIPT_CODE_LENGTH) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}
	return errorResult.ok({ code, normalizedCode: code.toUpperCase() });
}
