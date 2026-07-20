import { fail, ok, type Result } from "@afenda/errors/result";

export function normalizeDeliveryCode(
	value: string,
): Result<{ code: string; normalizedCode: string }> {
	const code = value.trim();
	const normalizedCode = code.toUpperCase();
	if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(normalizedCode)) {
		return fail(
			"BAD_REQUEST",
			"Delivery code may contain letters, numbers, dots, slashes, underscores, and hyphens",
		);
	}
	return ok({ code, normalizedCode });
}
