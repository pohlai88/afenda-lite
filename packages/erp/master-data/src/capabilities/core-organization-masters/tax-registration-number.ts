import { fail, type Result } from "@afenda/errors/result";
import type { PartyId, TaxRegistrationId } from "../../brands";
import { partyIdSchema, taxRegistrationIdSchema } from "../../brands";
import {
	type OrganizationId,
	organizationIdSchema,
} from "../../contracts/context";
import type { MasterFailureDetails } from "../../contracts/reasons";
import type {
	MasterStatus,
	TaxRegistration,
	TaxRegistrationType,
} from "../../types";
import {
	type RefCountryId,
	refCountryIdSchema,
} from "../platform-references/brands";

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

export type TaxRegistrationStatus = MasterStatus;

export interface TaxRegistrationProjection {
	countryId: RefCountryId;
	id: TaxRegistrationId;
	maskedRegistrationNumber: string;
	organizationId: OrganizationId;
	partyId: PartyId;
	status: TaxRegistrationStatus;
	taxType: TaxRegistrationType;
	validFrom: Date | null;
	validUntil: Date | null;
	version: number;
}

export interface SensitiveTaxRegistrationProjection
	extends TaxRegistrationProjection {
	registrationNumber: string;
}

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
	registration: Pick<TaxRegistrationProjection, "status" | "validUntil">,
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
		registration.validUntil !== null &&
		registration.validUntil < asOf
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

export function toTaxRegistrationProjection(
	registration: TaxRegistration,
): TaxRegistrationProjection {
	return {
		id: taxRegistrationIdSchema.parse(registration.id),
		organizationId: organizationIdSchema.parse(registration.organizationId),
		partyId: partyIdSchema.parse(registration.partyId),
		countryId: refCountryIdSchema.parse(registration.jurisdictionCountryId),
		taxType: registration.registrationType,
		maskedRegistrationNumber: maskTaxRegistrationNumber(
			registration.registrationNumber,
		),
		status: registration.status,
		validFrom: registration.validFrom,
		validUntil: registration.validTo,
		version: registration.version,
	};
}

export function toSensitiveTaxRegistrationProjection(
	registration: TaxRegistration,
): SensitiveTaxRegistrationProjection {
	return {
		...toTaxRegistrationProjection(registration),
		registrationNumber: registration.registrationNumber,
	};
}
