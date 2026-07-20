import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../contracts/reasons";

export const MAX_TAX_REGISTRATION_NUMBER_LENGTH = 128 as const;

/**
 * Trim → Unicode NFC → uppercase → strip whitespace and separators (- / .).
 * Display `registrationNumber` keeps caller casing after trim+NFC.
 */
export function normalizeTaxRegistrationNumber(raw: string): Result<{
	registrationNumber: string;
	normalizedRegistrationNumber: string;
}> {
	const registrationNumber = raw.normalize("NFC").trim();
	if (
		registrationNumber.length === 0 ||
		registrationNumber.length > MAX_TAX_REGISTRATION_NUMBER_LENGTH
	) {
		return fail("BAD_REQUEST", "Invalid tax registration number length", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	const normalizedRegistrationNumber = registrationNumber
		.toUpperCase()
		.replace(/[\s\-/.]+/g, "");
	if (normalizedRegistrationNumber.length === 0) {
		return fail(
			"BAD_REQUEST",
			"Tax registration number is empty after normalize",
			{
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails,
		);
	}
	if (
		normalizedRegistrationNumber.length > MAX_TAX_REGISTRATION_NUMBER_LENGTH
	) {
		return fail("BAD_REQUEST", "Normalized tax registration number too long", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	return {
		ok: true,
		data: { registrationNumber, normalizedRegistrationNumber },
	};
}
