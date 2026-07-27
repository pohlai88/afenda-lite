import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import type {
	ItemTemplateAttributeDataType,
	ItemTemplateAttributeValidationRules,
} from "./template-attribute-policy";
import { compareCanonicalDecimalValues } from "./template-attribute-policy";

export type VariantAttributeValueInput = Readonly<{
	textValue?: string;
	integerValue?: number | string;
	decimalValue?: number | string;
	booleanValue?: boolean;
	dateValue?: string;
	optionId?: string;
	optionIds?: readonly string[];
	referenceValue?: string;
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

const INTEGER_RE = /^-?(?:0|[1-9]\d*)$/;
const DECIMAL_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validationFailure(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
		field: "attributeValues",
	} satisfies MasterFailureDetails);
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
	if (!DECIMAL_RE.test(value)) return null;
	const negative = value.startsWith("-");
	const unsigned = negative ? value.slice(1) : value;
	const [integerPart = "0", fractionPart] = unsigned.split(".");
	const integer = integerPart.replace(/^0+(?=\d)/, "");
	const fraction = fractionPart?.replace(/0+$/, "");
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
	if (typeof value === "string" && DECIMAL_RE.test(value)) return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return undefined;
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
		`${integerPart}${fractionPart}`.replace(/^0+/, "").length || 1;
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
	return ok(true);
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
	const base = emptyValue(input.dataType);
	if (input.dataType === "text") {
		if (input.value.textValue === undefined) {
			return validationFailure("Text attribute requires textValue");
		}
		const textValue = input.value.textValue.normalize("NFC").trim();
		const minLength = numericRule(input.validationRules, "minLength");
		const maxLength = numericRule(input.validationRules, "maxLength");
		const pattern = input.validationRules.pattern;
		if (textValue.length === 0)
			return validationFailure("Text attribute value is required");
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
		return ok({
			...base,
			textValue,
			normalizedValue: textValue
				.normalize("NFKC")
				.replace(/\s+/gu, " ")
				.toUpperCase(),
		});
	}
	if (input.dataType === "integer") {
		const raw = input.value.integerValue;
		if (raw === undefined)
			return validationFailure("Integer attribute requires integerValue");
		if (typeof raw === "number" && !Number.isSafeInteger(raw)) {
			return validationFailure(
				"Numeric integer input must be a safe integer or decimal string",
			);
		}
		const integerValue = typeof raw === "number" ? String(raw) : raw.trim();
		if (!INTEGER_RE.test(integerValue))
			return validationFailure("Invalid integer attribute value");
		const canonical = BigInt(integerValue).toString();
		const rules = validateNumericRules(canonical, input.validationRules);
		if (!rules.ok) return rules;
		return ok({ ...base, integerValue: canonical, normalizedValue: canonical });
	}
	if (input.dataType === "decimal") {
		const raw = input.value.decimalValue;
		if (raw === undefined)
			return validationFailure("Decimal attribute requires decimalValue");
		const decimalValue = canonicalDecimal(raw);
		if (decimalValue === null)
			return validationFailure("Invalid decimal attribute value");
		const rules = validateNumericRules(decimalValue, input.validationRules);
		if (!rules.ok) return rules;
		return ok({ ...base, decimalValue, normalizedValue: decimalValue });
	}
	if (input.dataType === "boolean") {
		if (input.value.booleanValue === undefined) {
			return validationFailure("Boolean attribute requires booleanValue");
		}
		return ok({
			...base,
			booleanValue: input.value.booleanValue,
			normalizedValue: input.value.booleanValue ? "TRUE" : "FALSE",
		});
	}
	if (input.dataType === "date") {
		const dateValue = input.value.dateValue;
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
		const minimum = input.validationRules.minimum;
		const maximum = input.validationRules.maximum;
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
		return ok({ ...base, dateValue, normalizedValue: dateValue });
	}
	if (input.dataType === "single_option") {
		if (input.value.optionId === undefined) {
			return validationFailure("Single-option attribute requires optionId");
		}
		return ok({ ...base, optionId: input.value.optionId, normalizedValue: "" });
	}
	if (input.dataType === "multiple_option") {
		const optionIds = input.value.optionIds;
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
		return ok({ ...base, optionIds: uniqueOptionIds, normalizedValue: "" });
	}
	if (input.value.referenceValue === undefined) {
		return validationFailure("Reference attribute requires referenceValue");
	}
	const referenceValue = input.value.referenceValue.normalize("NFC").trim();
	if (referenceValue.length === 0 || referenceValue.length > 256) {
		return validationFailure(
			"Reference attribute value must contain 1 to 256 characters",
		);
	}
	return ok({
		...base,
		referenceValue,
		normalizedValue: referenceValue.normalize("NFKC").toUpperCase(),
	});
}
