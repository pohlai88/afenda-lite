import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";

export const ITEM_UOM_FACTOR_PRECISION = 24 as const;
export const ITEM_UOM_FACTOR_SCALE = 12 as const;
export const ITEM_UOM_MAX_INTEGER_DIGITS =
	ITEM_UOM_FACTOR_PRECISION - ITEM_UOM_FACTOR_SCALE;

export const ITEM_UOM_COMPATIBILITY_MODES = [
	"physical_dimension",
	"packaging_count",
] as const;
export type ItemUomCompatibilityMode =
	(typeof ITEM_UOM_COMPATIBILITY_MODES)[number];

const ITEM_UOM_COMPATIBILITY_MODE_SET: ReadonlySet<string> = new Set(
	ITEM_UOM_COMPATIBILITY_MODES,
);
const POSITIVE_DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/u;
const LEADING_DECIMAL_ZERO_RE = /^0+(?=\d)/u;
const TRAILING_DECIMAL_ZERO_RE = /0+$/u;
const NONZERO_DIGIT_RE = /[1-9]/u;

export function normalizeItemUomConversionFactor(raw: string): Result<string> {
	if (typeof raw !== "string") {
		return invalidFactor();
	}

	const value = raw.trim();
	const match = POSITIVE_DECIMAL_RE.exec(value);
	if (match === null) {
		return invalidFactor();
	}

	const integerPart = (match[1] ?? "").replace(LEADING_DECIMAL_ZERO_RE, "");
	const fractionPart = (match[2] ?? "").replace(TRAILING_DECIMAL_ZERO_RE, "");
	if (
		integerPart.length > ITEM_UOM_MAX_INTEGER_DIGITS ||
		fractionPart.length > ITEM_UOM_FACTOR_SCALE ||
		!NONZERO_DIGIT_RE.test(`${integerPart}${fractionPart}`)
	) {
		return invalidFactor();
	}

	return ok(
		fractionPart.length > 0 ? `${integerPart}.${fractionPart}` : integerPart,
	);
}

export function assertItemUomCompatibility(input: {
	baseDimensionCode: string;
	alternateDimensionCode: string;
	compatibilityMode: ItemUomCompatibilityMode;
	packagingApprovalReference: string | null;
}): Result<true> {
	const baseDimensionCode = input.baseDimensionCode
		.normalize("NFC")
		.trim()
		.toLowerCase();
	const alternateDimensionCode = input.alternateDimensionCode
		.normalize("NFC")
		.trim()
		.toLowerCase();
	const packagingApprovalReference =
		input.packagingApprovalReference?.normalize("NFC").trim() ?? null;

	if (!ITEM_UOM_COMPATIBILITY_MODE_SET.has(input.compatibilityMode)) {
		return fail("BAD_REQUEST", "Item UoM compatibility mode is invalid", {
			reason: "MASTER_INVALID_UOM_CONVERSION",
			field: "compatibilityMode",
		} satisfies MasterFailureDetails);
	}

	if (baseDimensionCode !== alternateDimensionCode) {
		return fail(
			"BAD_REQUEST",
			"Cross-dimension item UoM conversion is not permitted",
			{
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "alternateUomId",
			} satisfies MasterFailureDetails,
		);
	}

	switch (input.compatibilityMode) {
		case "physical_dimension":
			if (packagingApprovalReference !== null) {
				return fail(
					"BAD_REQUEST",
					"Packaging approval applies only to packaging/count compatibility",
					{
						reason: "MASTER_VALIDATION_FAILED",
						field: "packagingApprovalReference",
					} satisfies MasterFailureDetails,
				);
			}
			return ok(true);

		case "packaging_count":
			if (baseDimensionCode !== "count") {
				return fail(
					"BAD_REQUEST",
					"Packaging/count conversion requires count-dimension UoMs",
					{
						reason: "MASTER_INVALID_UOM_CONVERSION",
						field: "compatibilityMode",
					} satisfies MasterFailureDetails,
				);
			}

			if (
				packagingApprovalReference === null ||
				packagingApprovalReference.length === 0
			) {
				return fail(
					"BAD_REQUEST",
					"Packaging/count conversion requires approval evidence",
					{
						reason: "MASTER_INVALID_UOM_CONVERSION",
						field: "packagingApprovalReference",
					} satisfies MasterFailureDetails,
				);
			}

			return ok(true);

		default:
			return fail("BAD_REQUEST", "Item UoM compatibility mode is invalid", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "compatibilityMode",
			} satisfies MasterFailureDetails);
	}
}

function invalidFactor(): Result<never> {
	return fail(
		"BAD_REQUEST",
		`conversionFactor must be positive with at most ${ITEM_UOM_MAX_INTEGER_DIGITS} integer and ${ITEM_UOM_FACTOR_SCALE} fractional digits`,
		{
			reason: "MASTER_INVALID_UOM_CONVERSION",
			field: "conversionFactor",
		} satisfies MasterFailureDetails,
	);
}
