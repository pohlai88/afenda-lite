import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { PartyContact, PartyContactType } from "../../types";
import {
	normalizeEmail,
	normalizePhone,
} from "../core-organization-masters/normalized-code";

const MAX_CONTACT_VALUE_LENGTH = 500;

function invalidContactValue(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
		field: "value",
	} satisfies MasterFailureDetails);
}

function normalizeWebsite(value: string): Result<string> {
	try {
		const url = new URL(value);
		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			url.username.length > 0 ||
			url.password.length > 0
		) {
			return invalidContactValue(
				"Website contacts must use an HTTP or HTTPS URL without credentials",
			);
		}
		if (
			(url.protocol === "http:" && url.port === "80") ||
			(url.protocol === "https:" && url.port === "443")
		) {
			url.port = "";
		}
		url.hash = "";
		return ok(url.toString());
	} catch {
		return invalidContactValue("Website contact value is invalid");
	}
}

/**
 * Produces a display value and a contact-type-specific comparison value.
 * General master-code normalization must never be applied to contact values.
 */
export function normalizePartyContactValue(
	contactType: PartyContactType,
	raw: string,
): Result<{ value: string; normalizedValue: string }> {
	if (typeof raw !== "string") {
		return invalidContactValue("Party contact value must be a string");
	}
	const value = raw.normalize("NFC").trim();
	if (value.length === 0 || value.length > MAX_CONTACT_VALUE_LENGTH) {
		return invalidContactValue(
			`Party contact value must contain between 1 and ${MAX_CONTACT_VALUE_LENGTH} characters`,
		);
	}

	let normalized: Result<{ value: string; normalizedValue: string }>;
	switch (contactType) {
		case "email":
			normalized = normalizeEmail(value);
			break;
		case "telephone":
		case "mobile":
		case "fax":
			normalized = normalizePhone(value);
			break;
		case "website": {
			const website = normalizeWebsite(value);
			if (!website.ok) return website;
			normalized = ok({ value, normalizedValue: website.data });
			break;
		}
		case "messaging":
		case "other":
			normalized = ok({ value, normalizedValue: value });
			break;
		default:
			return invalidContactValue("Party contact type is invalid");
	}
	if (!normalized.ok) return normalized;
	return ok(normalized.data);
}

/** Trusted notification routing requires explicit verification and usability. */
export function isPartyContactTrustedDestination(
	contact: PartyContact,
	at: Date = new Date(),
): boolean {
	if (!Number.isFinite(at.getTime())) {
		return false;
	}

	return (
		contact.status === "active" &&
		contact.archivedAt === null &&
		contact.verificationStatus === "verified" &&
		contact.verifiedAt !== null &&
		contact.verifiedAt <= at &&
		(contact.effectiveFrom === null || contact.effectiveFrom <= at) &&
		(contact.effectiveTo === null || at < contact.effectiveTo)
	);
}
