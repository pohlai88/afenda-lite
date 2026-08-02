import { errorResult, type Result } from "@afenda/errors";

const DELIVERY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;

export function normalizeDeliveryCode(
	value: string,
): Result<{ code: string; normalizedCode: string }> {
	const code = value.trim();
	const normalizedCode = code.toUpperCase();
	if (!DELIVERY_CODE_PATTERN.test(normalizedCode)) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage:
				"Delivery code may contain letters, numbers, dots, slashes, underscores, and hyphens",
		});
	}
	return errorResult.ok({ code, normalizedCode });
}
