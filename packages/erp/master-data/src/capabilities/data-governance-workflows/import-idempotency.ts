import { createHash } from "node:crypto";

export type ImportPayloadIdentity = Readonly<{
	operationType: string;
	entityType: string;
	sourceSystem: string;
	mode: string;
	rows: readonly unknown[];
}>;

export function hashImportPayload(input: ImportPayloadIdentity): string {
	return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

export function hashImportRow(payload: unknown): string {
	return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

export function canonicalJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("Import payload contains a non-finite number");
		}
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left.localeCompare(right));
		return `{${entries
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
			.join(",")}}`;
	}
	throw new Error(`Import payload contains unsupported ${typeof value} value`);
}
