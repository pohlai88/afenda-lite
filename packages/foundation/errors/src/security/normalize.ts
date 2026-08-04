/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import {
	CORRELATION_ID_PATTERN,
	ERROR_LIMITS,
	OPERATION_PATTERN,
} from "../contract/bounds";
import type {
	PublicFieldErrors,
	PublicFieldErrorsInput,
	RetryAfterSeconds,
} from "../contract/details";

const WHITESPACE_PATTERN = /\s+/gu;
const CREDENTIAL_VALUE_PATTERN =
	/(?:\b(?:password|passwd|secret|token|api[_-]?key)\b\s*[:=])|(?:-----BEGIN [A-Z ]*PRIVATE KEY-----)/iu;
const CONNECTION_URL_PATTERN =
	/\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss):\/\/[^\s]+/iu;
const SQL_VALUE_PATTERN =
	/(?:\bselect\b[\s\S]{0,200}\bfrom\b)|(?:\binsert\s+into\b)|(?:\bupdate\s+[A-Za-z0-9_."]+\s+set\b)|(?:\bdelete\s+from\b)|(?:\b(?:create|alter|drop|truncate)\s+(?:table|index|schema|database|view|function|procedure)\b)|(?:duplicate key value violates)|(?:relation "[^"]+" does not exist)|(?:column "[^"]+" does not exist)/iu;
const UNSAFE_FIELD_NAMES = new Set(["__proto__", "constructor", "prototype"]);

function isControlCodePoint(codePoint: number): boolean {
	return (
		codePoint < 32 ||
		(codePoint >= 127 && codePoint <= 159) ||
		codePoint === 0x20_28 ||
		codePoint === 0x20_29
	);
}

function stripControlCharacters(value: string): string {
	return Array.from(value, (character) => {
		const codePoint = character.codePointAt(0);
		return codePoint !== undefined && isControlCodePoint(codePoint)
			? " "
			: character;
	}).join("");
}

function utf8CodePointBytes(codePoint: number): number {
	if (codePoint <= 0x7f) {
		return 1;
	}
	if (codePoint <= 0x7_ff) {
		return 2;
	}
	if (codePoint <= 0xff_ff) {
		return 3;
	}
	return 4;
}

/** Returns the exact UTF-8 byte count without relying on a DOM/Node global. */
export function utf8ByteLength(value: string): number {
	let bytes = 0;
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined) {
			bytes += utf8CodePointBytes(codePoint);
		}
	}
	return bytes;
}

function truncateUtf8(
	value: string,
	maximumCharacters: number,
	maximumBytes: number,
): string {
	let bytes = 0;
	let characters = 0;
	let output = "";

	for (const character of value) {
		if (characters >= maximumCharacters) {
			break;
		}
		const codePoint = character.codePointAt(0);
		if (codePoint === undefined) {
			continue;
		}
		const characterBytes = utf8CodePointBytes(codePoint);
		if (bytes + characterBytes > maximumBytes) {
			break;
		}
		output += character;
		bytes += characterBytes;
		characters += 1;
	}

	return output;
}

function normalizeBoundedText(
	value: string,
	maximumCharacters: number,
	maximumBytes: number,
): string {
	if (
		value.length >
		maximumCharacters * ERROR_LIMITS.textInputCodeUnitsPerCharacter
	) {
		return "";
	}
	const normalized = stripControlCharacters(value)
		.replace(WHITESPACE_PATTERN, " ")
		.trim();
	return truncateUtf8(normalized, maximumCharacters, maximumBytes).trim();
}

function normalizeSourceText(value: string): string {
	return stripControlCharacters(value).replace(WHITESPACE_PATTERN, " ").trim();
}

function containsSensitiveValue(value: string): boolean {
	return (
		CREDENTIAL_VALUE_PATTERN.test(value) ||
		CONNECTION_URL_PATTERN.test(value) ||
		SQL_VALUE_PATTERN.test(value)
	);
}

/** Registry defaults must already be normalized, bounded, and leak-safe. */
export function isValidDefaultPublicMessage(value: unknown): value is string {
	if (
		typeof value !== "string" ||
		value.length >
			ERROR_LIMITS.publicMessageCharacters *
				ERROR_LIMITS.textInputCodeUnitsPerCharacter
	) {
		return false;
	}
	const normalized = normalizeBoundedText(
		value,
		ERROR_LIMITS.publicMessageCharacters,
		ERROR_LIMITS.publicMessageBytes,
	);
	return (
		normalized.length > 0 &&
		normalized === value &&
		!containsSensitiveValue(normalized)
	);
}

/** Sanitizes caller-authored public wording and falls back to registry text. */
export function normalizePublicMessage(
	value: unknown,
	fallback: string,
): string {
	const normalizedFallback = normalizeBoundedText(
		fallback,
		ERROR_LIMITS.publicMessageCharacters,
		ERROR_LIMITS.publicMessageBytes,
	);
	if (typeof value !== "string") {
		return normalizedFallback;
	}
	if (
		value.length >
		ERROR_LIMITS.publicMessageCharacters *
			ERROR_LIMITS.textInputCodeUnitsPerCharacter
	) {
		return normalizedFallback;
	}
	const normalized = normalizeSourceText(value);
	return normalized.length > 0 &&
		Array.from(normalized).length <= ERROR_LIMITS.publicMessageCharacters &&
		utf8ByteLength(normalized) <= ERROR_LIMITS.publicMessageBytes &&
		!containsSensitiveValue(normalized)
		? normalized
		: normalizedFallback;
}

/** Invalid operation labels collapse to a single safe private diagnostic key. */
export function normalizeOperation(value: unknown): string {
	if (typeof value !== "string") {
		return "unknown";
	}
	if (
		value.length >
		ERROR_LIMITS.operationCharacters *
			ERROR_LIMITS.textInputCodeUnitsPerCharacter
	) {
		return "unknown";
	}
	const normalized = value.trim();
	return normalized.length <= ERROR_LIMITS.operationCharacters &&
		OPERATION_PATTERN.test(normalized)
		? normalized
		: "unknown";
}

/** Invalid external trace/correlation references are omitted, never truncated. */
export function normalizeCorrelationId(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return;
	}
	if (
		value.length >
		ERROR_LIMITS.correlationIdCharacters *
			ERROR_LIMITS.textInputCodeUnitsPerCharacter
	) {
		return;
	}
	const normalized = value.trim();
	return normalized.length > 0 &&
		normalized.length <= ERROR_LIMITS.correlationIdCharacters &&
		CORRELATION_ID_PATTERN.test(normalized)
		? normalized
		: undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	try {
		if (Array.isArray(value)) {
			return false;
		}
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	} catch {
		return false;
	}
}

function isArray(value: unknown): value is readonly unknown[] {
	try {
		return Array.isArray(value);
	} catch {
		return false;
	}
}

function arrayLength(value: readonly unknown[]): number {
	try {
		const length = Reflect.get(value, "length");
		return typeof length === "number" &&
			Number.isSafeInteger(length) &&
			length >= 0
			? Math.min(length, ERROR_LIMITS.fieldInputMessagesPerField)
			: 0;
	} catch {
		return 0;
	}
}

function arrayValue(value: readonly unknown[], index: number): unknown {
	try {
		return Reflect.get(value, index);
	} catch {
		// Throwing indices are omitted from public details.
	}
}

function enumerableKeys(value: object): readonly string[] {
	try {
		const keys = Object.keys(value);
		const maximumRawFieldNameCodeUnits =
			ERROR_LIMITS.fieldNameCharacters *
			ERROR_LIMITS.textInputCodeUnitsPerCharacter;
		return keys.length <= ERROR_LIMITS.fieldInputKeys &&
			keys.every((key) => key.length <= maximumRawFieldNameCodeUnits)
			? keys.sort()
			: [];
	} catch {
		return [];
	}
}

function propertyValue(value: Record<string, unknown>, key: string): unknown {
	try {
		return value[key];
	} catch {
		// Throwing getters cannot provide trustworthy public details.
	}
}

function normalizeFieldName(value: string): string | undefined {
	const normalized = normalizeBoundedText(
		value,
		ERROR_LIMITS.fieldNameCharacters,
		ERROR_LIMITS.fieldNameCharacters * 4,
	);
	return normalized.length > 0 &&
		!UNSAFE_FIELD_NAMES.has(normalized.toLowerCase()) &&
		!containsSensitiveValue(normalized)
		? normalized
		: undefined;
}

function normalizeFieldMessage(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return;
	}
	const normalized = normalizeBoundedText(
		value,
		ERROR_LIMITS.fieldMessageCharacters,
		ERROR_LIMITS.fieldMessageCharacters * 4,
	);
	return normalized.length > 0 && !containsSensitiveValue(normalized)
		? normalized
		: undefined;
}

function detailsByteLength(value: PublicFieldErrors): number {
	return utf8ByteLength(JSON.stringify({ fieldErrors: value }));
}

function normalizeFieldMessages(value: unknown): readonly string[] | undefined {
	if (!isArray(value)) {
		return;
	}
	const messages: string[] = [];
	const inputLength = arrayLength(value);
	for (let index = 0; index < inputLength; index += 1) {
		if (messages.length >= ERROR_LIMITS.fieldMessagesPerField) {
			break;
		}
		const message = normalizeFieldMessage(arrayValue(value, index));
		if (message !== undefined) {
			messages.push(message);
		}
	}
	return messages.length > 0 ? Object.freeze(messages) : undefined;
}

/**
 * Produces deterministic, deeply immutable field errors within every public
 * field-count, message-count, character, and aggregate-byte bound.
 */
export function normalizePublicFieldErrors(
	value: PublicFieldErrorsInput | unknown,
): PublicFieldErrors | undefined {
	if (!isPlainRecord(value)) {
		return;
	}

	const output: Record<string, readonly string[]> = {};
	let fields = 0;
	for (const rawName of enumerableKeys(value)) {
		if (fields >= ERROR_LIMITS.fieldCount) {
			break;
		}
		const name = normalizeFieldName(rawName);
		if (name === undefined || Object.hasOwn(output, name)) {
			continue;
		}
		const rawMessages = propertyValue(value, rawName);
		const messages = normalizeFieldMessages(rawMessages);
		if (messages === undefined) {
			continue;
		}

		const candidate = Object.freeze({ ...output, [name]: messages });
		if (detailsByteLength(candidate) > ERROR_LIMITS.publicDetailsBytes) {
			break;
		}
		Object.defineProperty(output, name, {
			configurable: false,
			enumerable: true,
			value: messages,
			writable: false,
		});
		fields += 1;
	}

	return fields > 0 ? Object.freeze(output) : undefined;
}

/** Returns a branded retry interval only when hostile input is already valid. */
export function normalizeRetryAfterSeconds(
	value: unknown,
): RetryAfterSeconds | undefined {
	return typeof value === "number" &&
		Number.isInteger(value) &&
		value >= ERROR_LIMITS.retryAfterSecondsMinimum &&
		value <= ERROR_LIMITS.retryAfterSecondsMaximum
		? (value as RetryAfterSeconds)
		: undefined;
}

/** Strict public constructor for the bounded retry interval brand. */
export function retryAfterSeconds(value: number): RetryAfterSeconds {
	const normalized = normalizeRetryAfterSeconds(value);
	if (normalized === undefined) {
		throw new RangeError(
			`retryAfterSeconds must be an integer from ${ERROR_LIMITS.retryAfterSecondsMinimum} through ${ERROR_LIMITS.retryAfterSecondsMaximum}`,
		);
	}
	return normalized;
}
