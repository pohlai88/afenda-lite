import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import type { MasterFailureDetails } from "../../contracts/reasons";

export const ITEM_TEMPLATE_ATTRIBUTE_DATA_TYPES = [
	"text",
	"integer",
	"decimal",
	"boolean",
	"date",
	"single_option",
	"multiple_option",
	"reference",
] as const;

export type ItemTemplateAttributeDataType =
	(typeof ITEM_TEMPLATE_ATTRIBUTE_DATA_TYPES)[number];

export const OPTION_COMPATIBLE_ATTRIBUTE_DATA_TYPES = [
	"single_option",
	"multiple_option",
] as const satisfies readonly ItemTemplateAttributeDataType[];

export const MAX_TEMPLATE_TEXT_LENGTH = 65_535;
export const MAX_TEMPLATE_PATTERN_LENGTH = 512;

const textRulesSchema = z
	.object({
		minLength: z.number().int().min(0).max(MAX_TEMPLATE_TEXT_LENGTH).optional(),
		maxLength: z.number().int().min(0).max(MAX_TEMPLATE_TEXT_LENGTH).optional(),
		pattern: z.string().min(1).max(MAX_TEMPLATE_PATTERN_LENGTH).optional(),
	})
	.strict()
	.superRefine((rules, ctx) => {
		if (
			rules.minLength !== undefined &&
			rules.maxLength !== undefined &&
			rules.minLength > rules.maxLength
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxLength"],
				message: "maxLength must be greater than or equal to minLength",
			});
		}
		if (rules.pattern !== undefined) {
			// Syntax validation is not execution-safety validation. Runtime
			// validators must compile with the same flags and apply input limits.
			try {
				new RegExp(rules.pattern, "u");
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["pattern"],
					message: "pattern must be a valid Unicode regular expression",
				});
			}
		}
	});

const integerRulesSchema = z
	.object({
		minimum: z.number().int().safe().optional(),
		maximum: z.number().int().safe().optional(),
		precision: z.number().int().min(1).max(38).optional(),
	})
	.strict()
	.superRefine((rules, ctx) => {
		if (
			rules.minimum !== undefined &&
			rules.maximum !== undefined &&
			rules.minimum > rules.maximum
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maximum"],
				message: "maximum must be greater than or equal to minimum",
			});
		}
	});

const decimalValueSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/, {
		message: "Must be a canonical decimal value",
	});

function decimalParts(value: string): {
	negative: boolean;
	integer: string;
	fraction: string;
} {
	const negative = value.startsWith("-");
	const unsigned = negative ? value.slice(1) : value;
	const [rawInteger = "0", rawFraction = ""] = unsigned.split(".");
	const integer = rawInteger.replace(/^0+(?=\d)/, "");
	const fraction = rawFraction.replace(/0+$/, "");
	const isZero = integer === "0" && fraction.length === 0;
	return { negative: negative && !isZero, integer, fraction };
}

function compareUnsignedDecimalParts(
	left: ReturnType<typeof decimalParts>,
	right: ReturnType<typeof decimalParts>,
): -1 | 0 | 1 {
	if (left.integer.length !== right.integer.length) {
		return left.integer.length < right.integer.length ? -1 : 1;
	}
	if (left.integer !== right.integer) {
		return left.integer < right.integer ? -1 : 1;
	}
	const fractionLength = Math.max(left.fraction.length, right.fraction.length);
	const leftFraction = left.fraction.padEnd(fractionLength, "0");
	const rightFraction = right.fraction.padEnd(fractionLength, "0");
	if (leftFraction === rightFraction) return 0;
	return leftFraction < rightFraction ? -1 : 1;
}

export function compareCanonicalDecimalValues(
	left: string,
	right: string,
): -1 | 0 | 1 {
	const leftParts = decimalParts(left);
	const rightParts = decimalParts(right);
	if (leftParts.negative !== rightParts.negative) {
		return leftParts.negative ? -1 : 1;
	}
	const compared = compareUnsignedDecimalParts(leftParts, rightParts);
	if (!leftParts.negative || compared === 0) return compared;
	return compared === 1 ? -1 : 1;
}

function decimalDigitCount(value: string): number {
	const unsigned = value.startsWith("-") ? value.slice(1) : value;
	const [integerPart = "0", fractionPart = ""] = unsigned.split(".");
	return `${integerPart}${fractionPart}`.replace(/^0+/, "").length || 1;
}

function decimalFractionLength(value: string): number {
	return (value.split(".")[1] ?? "").length;
}

function validateDecimalBoundFit(
	field: "minimum" | "maximum",
	value: string | undefined,
	rules: { precision?: number; scale?: number },
	ctx: z.RefinementCtx,
): void {
	if (value === undefined) return;
	if (
		rules.precision !== undefined &&
		decimalDigitCount(value) > rules.precision
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [field],
			message: `${field} must fit the declared precision`,
		});
	}
	if (rules.scale !== undefined && decimalFractionLength(value) > rules.scale) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [field],
			message: `${field} must fit the declared scale`,
		});
	}
}

const decimalRulesSchema = z
	.object({
		minimum: decimalValueSchema.optional(),
		maximum: decimalValueSchema.optional(),
		precision: z.number().int().min(1).max(38).optional(),
		scale: z.number().int().min(0).max(18).optional(),
	})
	.strict()
	.superRefine((rules, ctx) => {
		if (
			rules.minimum !== undefined &&
			rules.maximum !== undefined &&
			compareCanonicalDecimalValues(rules.minimum, rules.maximum) > 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maximum"],
				message: "maximum must be greater than or equal to minimum",
			});
		}
		if (
			rules.precision !== undefined &&
			rules.scale !== undefined &&
			rules.scale > rules.precision
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["scale"],
				message: "scale must not exceed precision",
			});
		}
		validateDecimalBoundFit("minimum", rules.minimum, rules, ctx);
		validateDecimalBoundFit("maximum", rules.maximum, rules, ctx);
	});

const dateRulesSchema = z
	.object({
		minimum: z.string().date().optional(),
		maximum: z.string().date().optional(),
	})
	.strict()
	.superRefine((rules, ctx) => {
		if (
			rules.minimum !== undefined &&
			rules.maximum !== undefined &&
			rules.minimum > rules.maximum
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maximum"],
				message: "maximum date must be on or after minimum date",
			});
		}
	});

const referenceRulesSchema = z
	.object({
		referenceType: z
			.string()
			.trim()
			.toLowerCase()
			.min(1)
			.max(64)
			.regex(/^[a-z0-9._-]+$/),
	})
	.strict();

const emptyRulesSchema = z.object({}).strict();

export type ItemTemplateAttributeValidationRules = Readonly<
	Record<string, unknown>
>;

export function isOptionCompatibleAttributeDataType(
	dataType: ItemTemplateAttributeDataType,
): boolean {
	return OPTION_COMPATIBLE_ATTRIBUTE_DATA_TYPES.includes(
		dataType as (typeof OPTION_COMPATIBLE_ATTRIBUTE_DATA_TYPES)[number],
	);
}

function validationRulesSchemaFor(
	dataType: ItemTemplateAttributeDataType,
): z.ZodType<ItemTemplateAttributeValidationRules> {
	switch (dataType) {
		case "text":
			return textRulesSchema;
		case "integer":
			return integerRulesSchema;
		case "decimal":
			return decimalRulesSchema;
		case "date":
			return dateRulesSchema;
		case "reference":
			return referenceRulesSchema;
		case "boolean":
		case "single_option":
		case "multiple_option":
			return emptyRulesSchema;
	}
}

/** Validates rules against the declared attribute data type. */
export function parseTemplateAttributeValidationRules(
	dataType: ItemTemplateAttributeDataType,
	rawRules: unknown,
): Result<ItemTemplateAttributeValidationRules> {
	const parsed = validationRulesSchemaFor(dataType).safeParse(rawRules ?? {});
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path:
				issue.path.length === 0
					? "validationRules"
					: `validationRules.${issue.path.join(".")}`,
			message: issue.message,
		}));
		return fail("BAD_REQUEST", "Invalid template attribute validation rules", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "validationRules",
			issuePaths: issues.map((issue) => issue.path),
			issues,
		} satisfies MasterFailureDetails);
	}
	return ok(parsed.data);
}

/** Compatibility mapping for the original text/option public input. */
export function dataTypeFromLegacyValueKind(
	valueKind: "text" | "option",
): ItemTemplateAttributeDataType {
	return valueKind === "option" ? "single_option" : "text";
}

/** Compatibility projection retained for existing consumers. */
export function legacyValueKindFromDataType(
	dataType: ItemTemplateAttributeDataType,
): "text" | "option" {
	/*
	 * Lossy compatibility projection.
	 *
	 * Only option-compatible types retain semantic identity. All other modern
	 * data types project to legacy "text"; do not use this result for validation
	 * or round-trip persistence.
	 */
	return isOptionCompatibleAttributeDataType(dataType) ? "option" : "text";
}
