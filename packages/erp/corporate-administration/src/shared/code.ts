import { fail, ok, type Result } from "@afenda/errors/result";

const unicodeWhitespacePattern = /\s+/gu;
const nonIdentifierCharactersPattern = /[\s\-_.:/\\()[\]{}]+/gu;
const taxTypeSeparatorPattern = /[\s-]+/gu;

const forbiddenTaxIdentifierTypes = new Set([
	"tax",
	"tax_number",
	"tax_registration",
	"tin",
	"vat",
	"vat_registration",
	"gst",
	"gst_registration",
	"sst",
	"sst_registration",
]);

const registrationIdentifierTypes = new Set([
	"company_registration",
	"company_registration_number",
	"registration_number",
	"lei",
]);

function normalizeCorporateText(value: string): string {
	return value
		.normalize("NFKC")
		.trim()
		.replace(unicodeWhitespacePattern, " ")
		.toLocaleUpperCase("en-US");
}

function normalizeIdentifierTypeKey(identifierType: string): string {
	return identifierType
		.normalize("NFKC")
		.trim()
		.toLocaleLowerCase("en-US");
}

export function normalizeCorporateCode(value: string): string {
	return normalizeCorporateText(value);
}

export function normalizeCompanyName(value: string): string {
	return normalizeCorporateText(value);
}

export function normalizeCorporateIdentifierValue(value: string): string {
	return normalizeCorporateText(value);
}

export function normalizeCorporateIdentifier(
	identifierType: string,
	value: string,
): string {
	const normalizedType = normalizeIdentifierTypeKey(identifierType);

	const canonicalValue = value
		.normalize("NFKC")
		.trim()
		.toLocaleUpperCase("en-US");

	if (registrationIdentifierTypes.has(normalizedType)) {
		return canonicalValue.replace(nonIdentifierCharactersPattern, "");
	}

	return canonicalValue.replace(unicodeWhitespacePattern, " ");
}

export function isTaxIdentifierType(identifierType: string): boolean {
	const normalizedType = normalizeIdentifierTypeKey(identifierType).replace(
		taxTypeSeparatorPattern,
		"_",
	);

	return forbiddenTaxIdentifierTypes.has(normalizedType);
}

export function isRegistrationIdentifierType(identifierType: string): boolean {
	return registrationIdentifierTypes.has(
		normalizeIdentifierTypeKey(identifierType),
	);
}

export function normalizeCompanyCode(
	code: string,
): Result<{ code: string; normalizedCode: string }> {
	const trimmed = code.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Company code is required");
	}
	return ok({
		code: trimmed,
		normalizedCode: normalizeCorporateCode(trimmed),
	});
}

export function normalizeDisplayName(
	name: string,
): Result<{ displayName: string; normalizedName: string }> {
	const trimmed = name.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Display name is required");
	}
	return ok({
		displayName: trimmed,
		normalizedName: normalizeCompanyName(trimmed),
	});
}

export function normalizeIdentifierValue(
	value: string,
	identifierType?: string,
): Result<{ value: string; normalizedValue: string }> {
	const trimmed = value.trim();
	if (!trimmed) {
		return fail("BAD_REQUEST", "Identifier value is required");
	}
	const normalizedValue =
		identifierType === undefined
			? normalizeCorporateIdentifierValue(trimmed)
			: normalizeCorporateIdentifier(identifierType, trimmed);
	return ok({
		value: trimmed,
		normalizedValue,
	});
}

/** Stable idempotency material for company identifier commands. */
export function buildCompanyIdentifierIdempotencyMaterial(input: {
	legalCompanyId: string;
	identifierType: string;
	identifierValue: string;
}): {
	identifierType: string;
	normalizedIdentifierValue: string;
	idempotencyKey: string;
} {
	const identifierType = input.identifierType.trim();
	const normalizedIdentifierValue = normalizeCorporateIdentifier(
		identifierType,
		input.identifierValue,
	);
	return {
		identifierType,
		normalizedIdentifierValue,
		idempotencyKey: `id:${input.legalCompanyId}:${normalizeIdentifierTypeKey(identifierType)}:${normalizedIdentifierValue}`,
	};
}
