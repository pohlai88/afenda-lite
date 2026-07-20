import { fail, type Result } from "@afenda/errors/result";

export const MAX_MOVEMENT_CODE_LENGTH = 64 as const;
const NORMALIZED_CODE_RE = /^[A-Z0-9._-]+$/;

export function normalizeMovementCode(raw: string): Result<{
	code: string;
	normalizedCode: string;
}> {
	const code = raw.normalize("NFC").trim();
	if (code.length === 0 || code.length > MAX_MOVEMENT_CODE_LENGTH) {
		return fail("BAD_REQUEST", "Invalid stock movement code length");
	}
	const normalizedCode = code.toUpperCase();
	if (!NORMALIZED_CODE_RE.test(normalizedCode)) {
		return fail(
			"BAD_REQUEST",
			"Movement code must be A-Z, 0-9, '.', '_' or '-' after normalize",
		);
	}
	return { ok: true, data: { code, normalizedCode } };
}
