import { errorResult, type Result } from "@afenda/errors";

export const MAX_MASTER_CODE_LENGTH = 64 as const;
export const MAX_SEARCH_TEXT_LENGTH = 512 as const;
export const MAX_EXTERNAL_ID_VALUE_LENGTH = 256 as const;
/** Normalized codes: uppercase ASCII alphanumerics plus `.`, `_`, and `-`. */
const NORMALIZED_CODE_RE = /^[A-Z0-9._-]+$/;
const CONTROL_CHARACTER_RE = /\p{Cc}/u;
const EMAIL_LOCAL_RE = /^[^\s@]+$/u;
const DOMAIN_LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const CANONICAL_PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * Normalizes an organization-owned master code.
 * Display code is trimmed NFC with caller casing; normalized code is uppercase ASCII.
 * Non-ASCII post-fold collisions are rejected explicitly instead of transliterated.
 */
export function normalizeMasterCode(raw: string): Result<{
	code: string;
	normalizedCode: string;
}> {
	if (typeof raw !== "string") {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Master code must be a string",
		});
	}

	const code = raw.normalize("NFC").trim();
	if (code.length === 0) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Master code is required",
		});
	}
	if (code.length > MAX_MASTER_CODE_LENGTH) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}

	const normalizedCode = code.toUpperCase();
	if (!NORMALIZED_CODE_RE.test(normalizedCode)) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Master code may contain only A-Z, 0-9, '.', '_' and '-'",
		});
	}
	return errorResult.ok({ code, normalizedCode });
}

export function normalizeSearchText(
	raw: string,
	options: { field?: string; maxLength?: number } = {},
): Result<{
	text: string;
	normalizedText: string;
}> {
	const field = options.field ?? "searchText";
	const maxLength = options.maxLength ?? MAX_SEARCH_TEXT_LENGTH;
	if (typeof raw !== "string") {
		return invalidNormalization(`${field} must be a string`, field);
	}

	const text = raw.normalize("NFC").trim().replace(/\s+/gu, " ");
	if (text.length === 0) {
		return invalidNormalization(`${field} is required`, field);
	}
	if (text.length > maxLength) {
		return invalidNormalization(
			`${field} must not exceed ${maxLength} characters`,
			field,
			{
				maxLength,
			},
		);
	}
	if (CONTROL_CHARACTER_RE.test(text)) {
		return invalidNormalization(
			`${field} must not contain control characters`,
			field,
		);
	}

	return errorResult.ok({
		text,
		normalizedText: text.normalize("NFKC").toLowerCase(),
	});
}

export function normalizeEmail(raw: string): Result<{
	value: string;
	normalizedValue: string;
}> {
	if (typeof raw !== "string") {
		return invalidNormalization(
			"Email contact value must be a string",
			"value",
		);
	}
	const value = raw.normalize("NFC").trim();
	const separator = value.lastIndexOf("@");
	if (
		separator <= 0 ||
		separator === value.length - 1 ||
		value.indexOf("@") !== separator
	) {
		return invalidNormalization("Email contact value is invalid", "value");
	}
	const local = value.slice(0, separator);
	const domain = value.slice(separator + 1).toLowerCase();
	if (
		local.length > 64 ||
		value.length > 254 ||
		!EMAIL_LOCAL_RE.test(local) ||
		domain.length > 253
	) {
		return invalidNormalization("Email contact value is invalid", "value");
	}

	const labels = domain.split(".");
	if (
		labels.length < 2 ||
		labels.some((label) => !DOMAIN_LABEL_RE.test(label))
	) {
		return invalidNormalization("Email contact value is invalid", "value");
	}

	return errorResult.ok({ value, normalizedValue: `${local}@${domain}` });
}

export function normalizePhone(raw: string): Result<{
	value: string;
	normalizedValue: string;
}> {
	if (typeof raw !== "string") {
		return invalidNormalization(
			"Phone contact value must be a string",
			"value",
		);
	}
	const value = raw.normalize("NFC").trim();
	const compact = value.replace(/[\s().-]/gu, "");
	const normalizedValue = compact.startsWith("00")
		? `+${compact.slice(2)}`
		: compact;
	if (!CANONICAL_PHONE_RE.test(normalizedValue)) {
		return invalidNormalization(
			"Telephone contacts must use an international canonical number",
			"value",
		);
	}
	return errorResult.ok({ value, normalizedValue });
}

export function normalizeExternalIdValue(input: {
	value: string;
	caseSensitive: boolean;
}): Result<{
	value: string;
	normalizedValue: string;
	caseSensitive: boolean;
}> {
	if (typeof input.value !== "string") {
		return invalidNormalization(
			"External identifier value must be a string",
			"externalValue",
		);
	}
	const value = input.value.normalize("NFC").trim();
	if (value.length === 0 || value.length > MAX_EXTERNAL_ID_VALUE_LENGTH) {
		return invalidNormalization(
			"External identifier value is invalid",
			"externalValue",
			{
				maxLength: MAX_EXTERNAL_ID_VALUE_LENGTH,
			},
		);
	}
	if (CONTROL_CHARACTER_RE.test(value)) {
		return invalidNormalization(
			"External identifier value must not contain control characters",
			"externalValue",
		);
	}

	return errorResult.ok({
		value,
		normalizedValue: input.caseSensitive ? value : value.toUpperCase(),
		caseSensitive: input.caseSensitive,
	});
}

function invalidNormalization(
	_message: string,
	_field: string,
	_extra: Record<string, unknown> = {},
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}
