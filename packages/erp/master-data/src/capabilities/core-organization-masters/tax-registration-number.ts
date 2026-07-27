import { fail, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { TaxRegistration } from "../../types";

export const MAX_TAX_REGISTRATION_NUMBER_LENGTH = 128 as const;

export const TAX_REGISTRATION_LIFECYCLE_STATUSES = [
	"pending_verification",
	"active",
	"expired",
	"revoked",
	"archived",
] as const;
export type TaxRegistrationLifecycleStatus =
	(typeof TAX_REGISTRATION_LIFECYCLE_STATUSES)[number];

export type MaskedTaxRegistration = Omit<
	TaxRegistration,
	"registrationNumber" | "normalizedRegistrationNumber"
> & {
	lifecycleStatus: TaxRegistrationLifecycleStatus;
	registrationNumberMasked: string;
	normalizedRegistrationNumberMasked: string;
};

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

export function projectTaxRegistrationLifecycleStatus(
	registration: Pick<TaxRegistration, "status" | "validTo">,
	asOf: Date = new Date(),
): TaxRegistrationLifecycleStatus {
	if (registration.status === "retired") {
		return "archived";
	}
	if (registration.status === "blocked") {
		return "revoked";
	}
	if (
		registration.status === "active" &&
		registration.validTo !== null &&
		registration.validTo < asOf
	) {
		return "expired";
	}
	if (registration.status === "active") {
		return "active";
	}
	return "pending_verification";
}

export function maskTaxRegistrationNumber(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length <= 4) {
		return "*".repeat(trimmed.length);
	}
	return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function toMaskedTaxRegistration(
	registration: TaxRegistration,
	asOf: Date = new Date(),
): MaskedTaxRegistration {
	const {
		registrationNumber,
		normalizedRegistrationNumber,
		...safeRegistration
	} = registration;
	return {
		...safeRegistration,
		lifecycleStatus: projectTaxRegistrationLifecycleStatus(registration, asOf),
		registrationNumberMasked: maskTaxRegistrationNumber(registrationNumber),
		normalizedRegistrationNumberMasked: maskTaxRegistrationNumber(
			normalizedRegistrationNumber,
		),
	};
}
