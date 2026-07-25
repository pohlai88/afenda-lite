import { createHash } from "node:crypto";

import type { PersonContactType } from "../workforce-foundation/types";

export function normalizePersonContactValue(
	contactType: PersonContactType,
	value: string,
): string {
	const trimmed = value.trim();
	switch (contactType) {
		case "email":
			return trimmed.toLowerCase();
		case "phone":
			return trimmed.replace(/\D/g, "");
		case "postal_address":
			return trimmed.replace(/\s+/g, " ").toLowerCase();
		default: {
			const exhaustive: never = contactType;
			return exhaustive;
		}
	}
}

export function normalizePersonIdentifierValue(value: string): string {
	return value.replace(/\s+/g, "").toUpperCase();
}

export function fingerprintPersonIdentifier(value: string): string {
	const normalized = normalizePersonIdentifierValue(value);
	return createHash("sha256").update(normalized).digest("hex");
}

export function last4PersonIdentifier(value: string): string {
	const normalized = normalizePersonIdentifierValue(value);
	return normalized.slice(-4);
}
