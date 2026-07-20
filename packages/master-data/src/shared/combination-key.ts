/**
 * Deterministic uniqueness aid for live variants within a template.
 * Attribute value rows remain SSOT — this key is not a JSON bag.
 */
export function normalizeAttributeValueText(raw: string): string {
	return raw.normalize("NFC").trim().replace(/\s+/g, " ").toUpperCase();
}

export function buildCombinationKey(
	entries: ReadonlyArray<{
		attrNormalizedCode: string;
		valueNormalized: string;
	}>,
): string {
	return [...entries]
		.map((entry) => `${entry.attrNormalizedCode}=${entry.valueNormalized}`)
		.sort((a: string, b: string) => a.localeCompare(b))
		.join("|");
}
