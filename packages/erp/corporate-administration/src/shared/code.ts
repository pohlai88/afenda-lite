import { fail, ok, type Result } from "@afenda/errors/result";

export function normalizeCompanyCode(
	code: string,
): Result<{ code: string; normalizedCode: string }> {
	const trimmed = code.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Company code is required");
	}
	return ok({
		code: trimmed,
		normalizedCode: trimmed.normalize("NFC").trim().toUpperCase(),
	});
}

export function normalizeDisplayName(
	name: string,
): Result<{ displayName: string; normalizedName: string }> {
	const trimmed = name.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Display name is required");
	}
	return ok({
		displayName: trimmed,
		normalizedName: trimmed.normalize("NFC").trim().toUpperCase(),
	});
}

export function normalizeIdentifierValue(
	value: string,
): Result<{ value: string; normalizedValue: string }> {
	const trimmed = value.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Identifier value is required");
	}
	return ok({
		value: trimmed,
		normalizedValue: trimmed.normalize("NFC").trim().toUpperCase(),
	});
}
