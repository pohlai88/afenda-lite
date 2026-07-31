import { errorResult, type Result } from "@afenda/errors";
import type { PartyContact, PartyContactType } from "../../types";
import {
	normalizeEmail,
	normalizePhone,
} from "../core-organization-masters/normalized-code";

const MAX_CONTACT_VALUE_LENGTH = 500;

function invalidContactValue(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
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
		return errorResult.ok(url.toString());
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

	switch (contactType) {
		case "email":
			return normalizeEmail(value);
		case "telephone":
		case "mobile":
		case "fax":
			return normalizePhone(value);
		case "website": {
			const website = normalizeWebsite(value);
			if (!website.ok) {
				return website;
			}
			return errorResult.ok({ value, normalizedValue: website.data });
		}
		case "messaging":
		case "other":
			return errorResult.ok({ value, normalizedValue: value });
		default:
			return invalidContactValue("Party contact type is invalid");
	}
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
