import { ok, type Result } from "@afenda/errors/result";

import { normalizeSearchText } from "../core-organization-masters/normalized-code";
import { extensionValidationFailure } from "./extension-errors";

export const ITEM_ALIAS_TYPES = [
	"short_name",
	"commercial_name",
	"supplier_name",
	"customer_name",
	"legacy_name",
	"local_name",
	"scientific_name",
	"search_keyword",
	"other",
] as const;

export type ItemAliasType = (typeof ITEM_ALIAS_TYPES)[number];

export const MAX_ITEM_ALIAS_VALUE_LENGTH = 256 as const;
export const MAX_ITEM_ALIAS_SOURCE_LENGTH = 64 as const;

const ALIAS_SOURCE_RE = /^[a-z0-9._-]+$/;
export type NormalizedItemAlias = Readonly<{
	aliasValue: string;
	normalizedValue: string;
}>;

/**
 * Produces display and comparison values for a human-searchable item alias.
 *
 * Display aliases use NFC and normalized spacing. Comparison aliases use NFKC
 * and locale-independent lowercase matching.
 */
export function normalizeItemAlias(
	rawValue: string,
): Result<NormalizedItemAlias> {
	const normalized = normalizeSearchText(rawValue, {
		field: "aliasValue",
		maxLength: MAX_ITEM_ALIAS_VALUE_LENGTH,
	});
	if (!normalized.ok) return normalized;

	return ok({
		aliasValue: normalized.data.text,
		normalizedValue: normalized.data.normalizedText,
	});
}

/** Produces the canonical source-system or provenance code for an item alias. */
export function normalizeItemAliasSource(rawSource: string): Result<string> {
	if (typeof rawSource !== "string") {
		return extensionValidationFailure(
			"Alias source must be a string",
			"source",
		);
	}

	const source = rawSource.normalize("NFC").trim().toLowerCase();
	if (
		source.length === 0 ||
		source.length > MAX_ITEM_ALIAS_SOURCE_LENGTH ||
		!ALIAS_SOURCE_RE.test(source)
	) {
		return extensionValidationFailure(
			`Alias source must be a valid code of no more than ${MAX_ITEM_ALIAS_SOURCE_LENGTH} characters`,
			"source",
		);
	}
	return ok(source);
}
