import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type { PartyContact, PartyContactType } from "../../types";

const MAX_CONTACT_VALUE_LENGTH = 500;
const CANONICAL_TELEPHONE_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_LOCAL_RE = /^[^\s@]+$/u;
const DOMAIN_LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function invalidContactValue(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
		field: "value",
	} satisfies MasterFailureDetails);
}

function normalizeEmail(value: string): Result<string> {
	const separator = value.lastIndexOf("@");
	if (
		separator <= 0 ||
		separator === value.length - 1 ||
		value.indexOf("@") !== separator
	) {
		return invalidContactValue("Email contact value is invalid");
	}
	const local = value.slice(0, separator);
	const domain = value.slice(separator + 1).toLowerCase();
	if (
		local.length > 64 ||
		value.length > 254 ||
		!EMAIL_LOCAL_RE.test(local) ||
		domain.length > 253
	) {
		return invalidContactValue("Email contact value is invalid");
	}

	const labels = domain.split(".");
	if (
		labels.length < 2 ||
		labels.some((label) => !DOMAIN_LABEL_RE.test(label))
	) {
		return invalidContactValue("Email contact value is invalid");
	}

	return ok(`${local}@${domain}`);
}

function normalizeTelephone(value: string): Result<string> {
	const compact = value.replace(/[\s().-]/gu, "");
	const normalizedValue = compact.startsWith("00")
		? `+${compact.slice(2)}`
		: compact;
	if (!CANONICAL_TELEPHONE_RE.test(normalizedValue)) {
		return invalidContactValue(
			"Telephone contacts must use an international canonical number",
		);
	}
	return ok(normalizedValue);
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

	let normalized: Result<string>;
	switch (contactType) {
		case "email":
			normalized = normalizeEmail(value);
			break;
		case "telephone":
		case "mobile":
		case "fax":
			normalized = normalizeTelephone(value);
			break;
		case "website":
			normalized = normalizeWebsite(value);
			break;
		case "messaging":
		case "other":
			normalized = ok(value);
			break;
		default:
			return invalidContactValue("Party contact type is invalid");
	}
	if (!normalized.ok) return normalized;
	return ok({ value, normalizedValue: normalized.data });
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
