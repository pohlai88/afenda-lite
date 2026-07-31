import { errorResult, type Result } from "@afenda/errors";

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

	return errorResult.ok(
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Item UoM compatibility mode is invalid",
		});
	}

	if (baseDimensionCode !== alternateDimensionCode) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Cross-dimension item UoM conversion is not permitted",
		});
	}

	switch (input.compatibilityMode) {
		case "physical_dimension":
			if (packagingApprovalReference !== null) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage:
						"Packaging approval applies only to packaging/count compatibility",
				});
			}
			return errorResult.ok(true);

		case "packaging_count":
			if (baseDimensionCode !== "count") {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage:
						"Packaging/count conversion requires count-dimension UoMs",
				});
			}

			if (
				packagingApprovalReference === null ||
				packagingApprovalReference.length === 0
			) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage:
						"Packaging/count conversion requires approval evidence",
				});
			}

			return errorResult.ok(true);

		default:
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Item UoM compatibility mode is invalid",
			});
	}
}

function invalidFactor(): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}
