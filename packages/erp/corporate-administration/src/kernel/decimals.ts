import { z } from "zod";

const DECIMAL_INPUT_PATTERN = /^-?\d+(?:\.\d+)?$/;
const CANONICAL_DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export const canonicalDecimalSchema = z
	.string()
	.regex(CANONICAL_DECIMAL_PATTERN)
	.refine((value) => value !== "-0", "Negative zero is not canonical")
	.brand<"CanonicalDecimal">();

export type CanonicalDecimal = z.infer<typeof canonicalDecimalSchema>;

export function normalizeDecimalString(value: string): CanonicalDecimal {
	if (!DECIMAL_INPUT_PATTERN.test(value)) {
		throw new RangeError("Decimal must be a plain base-10 string");
	}

	const negative = value.startsWith("-");
	const unsigned = negative ? value.slice(1) : value;
	const [integerPart = "0", fractionalPart] = unsigned.split(".");
	const integer = integerPart.replace(/^0+(?=\d)/, "");
	const fraction = fractionalPart?.replace(/0+$/, "") ?? "";
	const magnitude = fraction.length > 0 ? `${integer}.${fraction}` : integer;
	const normalized =
		magnitude === "0" ? "0" : negative ? `-${magnitude}` : magnitude;
	return canonicalDecimalSchema.parse(normalized);
}

export const decimalInputSchema = z
	.string()
	.refine(
		(value) => DECIMAL_INPUT_PATTERN.test(value),
		"Expected a plain base-10 decimal",
	)
	.transform(normalizeDecimalString);
