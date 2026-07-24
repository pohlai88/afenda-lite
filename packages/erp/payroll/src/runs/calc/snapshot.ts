import { createHash } from "node:crypto";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalizeSnapshot(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => canonicalizeSnapshot(entry));
	}

	if (!isPlainObject(value)) {
		return value;
	}

	const sortedEntries = Object.entries(value).sort(([left], [right]) =>
		left.localeCompare(right),
	);

	const canonical: Record<string, unknown> = {};
	for (const [key, entryValue] of sortedEntries) {
		canonical[key] = canonicalizeSnapshot(entryValue);
	}
	return canonical;
}

export function hashSnapshot(canonicalJson: unknown): string {
	const canonical = canonicalizeSnapshot(canonicalJson);
	const payload = JSON.stringify(canonical);
	return createHash("sha256").update(payload).digest("hex");
}
