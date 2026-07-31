import { errorResult, type Result } from "@afenda/errors";
import type {
	ItemTemplateAttributeDataType,
	ItemTemplateAttributeValidationRules,
} from "./template-attribute-policy";
import { compareCanonicalDecimalValues } from "./template-attribute-policy";

export type VariantAttributeValueInput = Readonly<{
	textValue?: string | undefined;
	integerValue?: number | string | undefined;
	decimalValue?: number | string | undefined;
	booleanValue?: boolean | undefined;
	dateValue?: string | undefined;
	optionId?: string | undefined;
	optionIds?: readonly string[] | undefined;
	referenceValue?: string | undefined;
}>;

export type NormalizedVariantAttributeValue = Readonly<{
	valueType: ItemTemplateAttributeDataType;
	textValue: string | null;
	integerValue: string | null;
	decimalValue: string | null;
	booleanValue: boolean | null;
	dateValue: string | null;
	optionId: string | null;
	optionIds: readonly string[];
	referenceValue: string | null;
	normalizedValue: string;
}>;

type NormalizeVariantAttributeValueInput = Readonly<{
	dataType: ItemTemplateAttributeDataType;
	validationRules: ItemTemplateAttributeValidationRules;
	value: VariantAttributeValueInput;
}>;

const INTEGER_RE = /^-?(?:0|[1-9]\d*)$/;
const DECIMAL_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LEADING_DECIMAL_ZERO_RE = /^0+(?=\d)/;
const TRAILING_DECIMAL_ZERO_RE = /0+$/;
const LEADING_ZERO_RE = /^0+/;

function validationFailure(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

function populatedRepresentationCount(
	input: VariantAttributeValueInput,
): number {
	return [
		input.textValue,
		input.integerValue,
		input.decimalValue,
		input.booleanValue,
		input.dateValue,
		input.optionId,
		input.optionIds,
		input.referenceValue,
	].filter((value) => value !== undefined).length;
}

function canonicalDecimal(raw: number | string): string | null {
	const value =
		typeof raw === "number" ? String(raw) : raw.normalize("NFC").trim();
	if (!DECIMAL_RE.test(value)) {
		return null;
	}
	const negative = value.startsWith("-");
	const unsigned = negative ? value.slice(1) : value;
	const [integerPart = "0", fractionPart] = unsigned.split(".");
	const integer = integerPart.replace(LEADING_DECIMAL_ZERO_RE, "");
	const fraction = fractionPart?.replace(TRAILING_DECIMAL_ZERO_RE, "");
	const magnitude = fraction ? `${integer}.${fraction}` : integer;
	return negative && magnitude !== "0" ? `-${magnitude}` : magnitude;
}

function numericRule(
	rules: ItemTemplateAttributeValidationRules,
	key: string,
): number | undefined {
	const value = rules[key];
	return typeof value === "number" ? value : undefined;
}

function decimalRule(
	rules: ItemTemplateAttributeValidationRules,
	key: "minimum" | "maximum",
): string | undefined {
	const value = rules[key];
	if (typeof value === "string" && DECIMAL_RE.test(value)) {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
}

function validateNumericRules(
	canonical: string,
	rules: ItemTemplateAttributeValidationRules,
): Result<true> {
	const minimum = decimalRule(rules, "minimum");
	const maximum = decimalRule(rules, "maximum");
	if (
		minimum !== undefined &&
		compareCanonicalDecimalValues(canonical, minimum) < 0
	) {
		return validationFailure("Attribute value is below its configured minimum");
	}
	if (
		maximum !== undefined &&
		compareCanonicalDecimalValues(canonical, maximum) > 0
	) {
		return validationFailure("Attribute value exceeds its configured maximum");
	}
	const unsigned = canonical.startsWith("-") ? canonical.slice(1) : canonical;
	const [integerPart = "0", fractionPart = ""] = unsigned.split(".");
	const precision = numericRule(rules, "precision");
	const scale = numericRule(rules, "scale");
	const digitCount =
		`${integerPart}${fractionPart}`.replace(LEADING_ZERO_RE, "").length || 1;
	if (digitCount > 38 || fractionPart.length > 18) {
		return validationFailure(
			"Numeric attribute value exceeds supported precision or scale",
		);
	}
	if (precision !== undefined && digitCount > precision) {
		return validationFailure(
			"Attribute value exceeds its configured precision",
		);
	}
	if (scale !== undefined && fractionPart.length > scale) {
		return validationFailure("Attribute value exceeds its configured scale");
	}
	return errorResult.ok(true);
}

function emptyValue(dataType: ItemTemplateAttributeDataType) {
	return {
		valueType: dataType,
		textValue: null,
		integerValue: null,
		decimalValue: null,
		booleanValue: null,
		dateValue: null,
		optionId: null,
		optionIds: [] as readonly string[],
		referenceValue: null,
	};
}

/** Normalizes exactly one representation according to its attribute data type. */
export function normalizeVariantAttributeValue(input: {
	dataType: ItemTemplateAttributeDataType;
	validationRules: ItemTemplateAttributeValidationRules;
	value: VariantAttributeValueInput;
}): Result<NormalizedVariantAttributeValue> {
	if (populatedRepresentationCount(input.value) !== 1) {
		return validationFailure(
			"Each attribute requires exactly one value representation",
		);
	}

	switch (input.dataType) {
		case "text":
			return normalizeTextValue(input);
		case "integer":
			return normalizeIntegerValue(input);
		case "decimal":
			return normalizeDecimalValue(input);
		case "boolean":
			return normalizeBooleanValue(input);
		case "date":
			return normalizeDateValue(input);
		case "single_option":
			return normalizeSingleOptionValue(input);
		case "multiple_option":
			return normalizeMultipleOptionValue(input);
		case "reference":
			return normalizeReferenceValue(input);
		default:
			return assertNever(input.dataType);
	}
}

function assertNever(value: never): never {
	throw new Error(`Unsupported attribute data type: ${String(value)}`);
}

function normalizeTextValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	if (input.value.textValue === undefined) {
		return validationFailure("Text attribute requires textValue");
	}
	const textValue = input.value.textValue.normalize("NFC").trim();
	const minLength = numericRule(input.validationRules, "minLength");
	const maxLength = numericRule(input.validationRules, "maxLength");
	const { pattern } = input.validationRules;
	if (textValue.length === 0) {
		return validationFailure("Text attribute value is required");
	}
	if (minLength !== undefined && textValue.length < minLength) {
		return validationFailure(
			"Text attribute value is shorter than its configured minimum",
		);
	}
	if (maxLength !== undefined && textValue.length > maxLength) {
		return validationFailure(
			"Text attribute value exceeds its configured maximum",
		);
	}
	if (
		typeof pattern === "string" &&
		!new RegExp(pattern, "u").test(textValue)
	) {
		return validationFailure(
			"Text attribute value does not match its configured pattern",
		);
	}
	return errorResult.ok({
		...emptyValue("text"),
		textValue,
		normalizedValue: textValue
			.normalize("NFKC")
			.replace(/\s+/gu, " ")
			.toUpperCase(),
	});
}

function normalizeIntegerValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	const raw = input.value.integerValue;
	if (raw === undefined) {
		return validationFailure("Integer attribute requires integerValue");
	}
	if (typeof raw === "number" && !Number.isSafeInteger(raw)) {
		return validationFailure(
			"Numeric integer input must be a safe integer or decimal string",
		);
	}
	const integerValue = typeof raw === "number" ? String(raw) : raw.trim();
	if (!INTEGER_RE.test(integerValue)) {
		return validationFailure("Invalid integer attribute value");
	}
	const canonical = BigInt(integerValue).toString();
	const rules = validateNumericRules(canonical, input.validationRules);
	if (!rules.ok) {
		return rules;
	}
	return errorResult.ok({
		...emptyValue("integer"),
		integerValue: canonical,
		normalizedValue: canonical,
	});
}

function normalizeDecimalValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	const raw = input.value.decimalValue;
	if (raw === undefined) {
		return validationFailure("Decimal attribute requires decimalValue");
	}
	const decimalValue = canonicalDecimal(raw);
	if (decimalValue === null) {
		return validationFailure("Invalid decimal attribute value");
	}
	const rules = validateNumericRules(decimalValue, input.validationRules);
	if (!rules.ok) {
		return rules;
	}
	return errorResult.ok({
		...emptyValue("decimal"),
		decimalValue,
		normalizedValue: decimalValue,
	});
}

function normalizeBooleanValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	if (input.value.booleanValue === undefined) {
		return validationFailure("Boolean attribute requires booleanValue");
	}
	return errorResult.ok({
		...emptyValue("boolean"),
		booleanValue: input.value.booleanValue,
		normalizedValue: input.value.booleanValue ? "TRUE" : "FALSE",
	});
}

function normalizeDateValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	const { dateValue } = input.value;
	if (dateValue === undefined || !ISO_DATE_RE.test(dateValue)) {
		return validationFailure("Date attribute requires an ISO calendar date");
	}
	const parsed = new Date(`${dateValue}T00:00:00.000Z`);
	if (
		Number.isNaN(parsed.valueOf()) ||
		parsed.toISOString().slice(0, 10) !== dateValue
	) {
		return validationFailure("Invalid calendar date attribute value");
	}
	const { minimum, maximum } = input.validationRules;
	if (typeof minimum === "string" && dateValue < minimum) {
		return validationFailure(
			"Date attribute value is before its configured minimum",
		);
	}
	if (typeof maximum === "string" && dateValue > maximum) {
		return validationFailure(
			"Date attribute value exceeds its configured maximum",
		);
	}
	return errorResult.ok({
		...emptyValue("date"),
		dateValue,
		normalizedValue: dateValue,
	});
}

function normalizeSingleOptionValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	if (input.value.optionId === undefined) {
		return validationFailure("Single-option attribute requires optionId");
	}
	return errorResult.ok({
		...emptyValue("single_option"),
		optionId: input.value.optionId,
		normalizedValue: "",
	});
}

function normalizeMultipleOptionValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	const { optionIds } = input.value;
	if (
		optionIds === undefined ||
		optionIds.length === 0 ||
		optionIds.length > 100
	) {
		return validationFailure(
			"Multiple-option attribute requires 1 to 100 optionIds",
		);
	}
	const uniqueOptionIds = [...new Set(optionIds)].sort();
	if (uniqueOptionIds.length !== optionIds.length) {
		return validationFailure(
			"Multiple-option attribute contains duplicate optionIds",
		);
	}
	return errorResult.ok({
		...emptyValue("multiple_option"),
		optionIds: uniqueOptionIds,
		normalizedValue: "",
	});
}

function normalizeReferenceValue(
	input: NormalizeVariantAttributeValueInput,
): Result<NormalizedVariantAttributeValue> {
	if (input.value.referenceValue === undefined) {
		return validationFailure("Reference attribute requires referenceValue");
	}
	const referenceValue = input.value.referenceValue.normalize("NFC").trim();
	if (referenceValue.length === 0 || referenceValue.length > 256) {
		return validationFailure(
			"Reference attribute value must contain 1 to 256 characters",
		);
	}
	return errorResult.ok({
		...emptyValue("reference"),
		referenceValue,
		normalizedValue: referenceValue.normalize("NFKC").toUpperCase(),
	});
}
