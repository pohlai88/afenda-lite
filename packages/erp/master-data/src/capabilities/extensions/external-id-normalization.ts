import { errorResult, type Result } from "@afenda/errors";
import type { ExternalIdCaseSensitivity } from "../../types";
import { normalizeExternalIdValue } from "../core-organization-masters/normalized-code";

export { MAX_EXTERNAL_ID_VALUE_LENGTH } from "../core-organization-masters/normalized-code";

export const MAX_EXTERNAL_ID_QUALIFIER_LENGTH = 64 as const;

const EXTERNAL_ID_QUALIFIER_RE = /^[a-z0-9._-]+$/u;

export type NormalizedExternalId = Readonly<{
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	normalizedValue: string;
	caseSensitivity: ExternalIdCaseSensitivity;
}>;

/** @deprecated Use NormalizedExternalId. */
export type NormalizedPartyExternalId = NormalizedExternalId;

export function normalizeExternalIdQualifier(
	value: string,
	_field: "sourceSystem" | "externalIdType",
): Result<string> {
	const normalized = value.normalize("NFC").trim().toLowerCase();

	if (
		normalized.length === 0 ||
		normalized.length > MAX_EXTERNAL_ID_QUALIFIER_LENGTH ||
		!EXTERNAL_ID_QUALIFIER_RE.test(normalized)
	) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}

	return errorResult.ok(normalized);
}

/** @deprecated Use normalizeExternalId. */
export function normalizePartyExternalId(input: {
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	caseSensitivity: ExternalIdCaseSensitivity;
}): Result<NormalizedExternalId> {
	return normalizeExternalId(input);
}

/**
 * Produces normalized components for deterministic external-ID lookup.
 *
 * The original trimmed identifier is preserved for display. Only the
 * comparison value is folded when the identifier policy is case-insensitive.
 */
export function normalizeExternalId(input: {
	sourceSystem: string;
	externalIdType: string;
	externalValue: string;
	caseSensitivity: ExternalIdCaseSensitivity;
}): Result<NormalizedExternalId> {
	const sourceSystem = normalizeExternalIdQualifier(
		input.sourceSystem,
		"sourceSystem",
	);
	if (!sourceSystem.ok) {
		return sourceSystem;
	}

	const externalIdType = normalizeExternalIdQualifier(
		input.externalIdType,
		"externalIdType",
	);
	if (!externalIdType.ok) {
		return externalIdType;
	}

	const externalValue = normalizeExternalIdValue({
		value: input.externalValue,
		caseSensitive: input.caseSensitivity === "sensitive",
	});
	if (!externalValue.ok) {
		return externalValue;
	}

	return errorResult.ok({
		sourceSystem: sourceSystem.data,
		externalIdType: externalIdType.data,
		externalValue: externalValue.data.value,
		normalizedValue: externalValue.data.normalizedValue,
		caseSensitivity: input.caseSensitivity,
	});
}
