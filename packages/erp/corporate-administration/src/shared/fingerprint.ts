import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)]),
		);
	}
	if (typeof value === "string") {
		return value.normalize("NFKC").trim();
	}
	return value ?? null;
}

/** Produces the stable request identity used by idempotent CA commands. */
export function createCorporateAdministrationRequestFingerprint(
	value: unknown,
): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalize(value)))
		.digest("hex");
}
