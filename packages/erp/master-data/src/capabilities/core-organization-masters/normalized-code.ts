import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";

export const MAX_MASTER_CODE_LENGTH = 64 as const;
/** Normalized codes: uppercase ASCII alphanumerics plus `.`, `_`, and `-`. */
const NORMALIZED_CODE_RE = /^[A-Z0-9._-]+$/;

/**
 * Normalizes an organization-owned master code.
 * Display code is trimmed NFC with caller casing; normalized code is uppercase ASCII.
 */
export function normalizeMasterCode(raw: string): Result<{
	code: string;
	normalizedCode: string;
}> {
	if (typeof raw !== "string") {
		return fail("BAD_REQUEST", "Master code must be a string", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "code",
		} satisfies MasterFailureDetails);
	}

	const code = raw.normalize("NFC").trim();
	if (code.length === 0) {
		return fail("BAD_REQUEST", "Master code is required", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "code",
		} satisfies MasterFailureDetails);
	}
	if (code.length > MAX_MASTER_CODE_LENGTH) {
		return fail(
			"BAD_REQUEST",
			`Master code must not exceed ${MAX_MASTER_CODE_LENGTH} characters`,
			{
				reason: "MASTER_VALIDATION_FAILED",
				field: "code",
				maxLength: MAX_MASTER_CODE_LENGTH,
			} satisfies MasterFailureDetails,
		);
	}

	const normalizedCode = code.toUpperCase();
	if (!NORMALIZED_CODE_RE.test(normalizedCode)) {
		return fail(
			"BAD_REQUEST",
			"Master code may contain only A-Z, 0-9, '.', '_' and '-'",
			{
				reason: "MASTER_VALIDATION_FAILED",
				field: "code",
			} satisfies MasterFailureDetails,
		);
	}
	return ok({ code, normalizedCode });
}
