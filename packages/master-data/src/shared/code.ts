import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../contracts/reasons";

export const MAX_MASTER_CODE_LENGTH = 64 as const;
/** Normalized codes: uppercase ASCII alphanumerics + . _ - */
const NORMALIZED_CODE_RE = /^[A-Z0-9._-]+$/;

/**
 * Trim → Unicode NFC → uppercase for comparison/storage of normalized_code.
 * Display `code` keeps caller casing after trim+NFC.
 */
export function normalizeMasterCode(raw: string): Result<{
	code: string;
	normalizedCode: string;
}> {
	const code = raw.normalize("NFC").trim();
	if (code.length === 0 || code.length > MAX_MASTER_CODE_LENGTH) {
		return fail("BAD_REQUEST", "Invalid master code length", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	const normalizedCode = code.toUpperCase();
	if (!NORMALIZED_CODE_RE.test(normalizedCode)) {
		return fail(
			"BAD_REQUEST",
			"Master code must be A-Z, 0-9, '.', '_' or '-' after normalize",
			{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
		);
	}
	return { ok: true, data: { code, normalizedCode } };
}
