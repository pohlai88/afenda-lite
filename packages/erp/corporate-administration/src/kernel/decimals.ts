// biome-ignore-all lint/performance/useTopLevelRegex: Decimal normalization expressions are small and policy-local.
import { z } from "zod";

const DECIMAL_INPUT_PATTERN = /^[+-]?(?:0|[1-9]\d*|0\d+)(?:\.\d+)?$/;

export function normalizeDecimalString(value: string): string {
	if (!DECIMAL_INPUT_PATTERN.test(value)) {
		throw new RangeError("Expected a plain base-10 decimal");
	}

	const negative = value.startsWith("-");
	const unsigned = value.replace(/^[+-]/, "");

	const [integerPart = "0", fractionalPart = ""] = unsigned.split(".");

	const integer = integerPart.replace(/^0+(?=\d)/, "");
	const fractional = fractionalPart.replace(/0+$/, "");

	const magnitude =
		fractional.length > 0 ? `${integer}.${fractional}` : integer;

	return negative && magnitude !== "0" ? `-${magnitude}` : magnitude;
}

function tryNormalizeDecimalString(value: string): string | undefined {
	if (!DECIMAL_INPUT_PATTERN.test(value)) {
		return;
	}

	return normalizeDecimalString(value);
}

export const canonicalDecimalSchema = z
	.string()
	.refine(
		(value) => tryNormalizeDecimalString(value) === value,
		"Expected a canonical base-10 decimal",
	)
	.brand<"CanonicalDecimal">();

export type CanonicalDecimal = z.infer<typeof canonicalDecimalSchema>;

export const decimalInputSchema = z
	.string()
	.regex(DECIMAL_INPUT_PATTERN, "Expected a plain base-10 decimal")
	.transform(normalizeDecimalString)
	.pipe(canonicalDecimalSchema);
