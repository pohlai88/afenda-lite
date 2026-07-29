import { fail, ok, type Result } from "@afenda/errors/result";

const DELIVERY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]*$/;

export function normalizeDeliveryCode(
	value: string,
): Result<{ code: string; normalizedCode: string }> {
	const code = value.trim();
	const normalizedCode = code.toUpperCase();
	if (!DELIVERY_CODE_PATTERN.test(normalizedCode)) {
		return fail(
			"BAD_REQUEST",
			"Delivery code may contain letters, numbers, dots, slashes, underscores, and hyphens",
		);
	}
	return ok({ code, normalizedCode });
}
