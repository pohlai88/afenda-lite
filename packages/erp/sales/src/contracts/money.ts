import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

export const currencyCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z]{3}$/u);
export const decimalAmountSchema = z
	.string()
	.trim()
	.regex(/^-?\d+(?:\.\d{1,6})?$/u);
export const nonNegativeDecimalAmountSchema = decimalAmountSchema.refine(
	(value) => !value.startsWith("-"),
);

export type Money = Readonly<{ currencyCode: string; amount: string }>;

const SCALE = 1_000_000n;

export function decimalToScaled(value: string): Result<bigint> {
	const parsed = decimalAmountSchema.safeParse(value);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Enter a valid decimal amount", {
			reason: "SALES_INVALID_MONEY",
		});
	const negative = parsed.data.startsWith("-");
	const unsigned = negative ? parsed.data.slice(1) : parsed.data;
	const [whole = "0", fraction = ""] = unsigned.split(".");
	const scaled = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
	return ok(negative ? -scaled : scaled);
}

export function scaledToDecimal(value: bigint): string {
	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const whole = absolute / SCALE;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/u, "");
	return `${negative ? "-" : ""}${whole}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

export function multiplyDecimal(left: string, right: string): Result<string> {
	const a = decimalToScaled(left);
	if (!a.ok) return a;
	const b = decimalToScaled(right);
	if (!b.ok) return b;
	const product = a.data * b.data;
	const rounded =
		product >= 0n
			? (product + SCALE / 2n) / SCALE
			: (product - SCALE / 2n) / SCALE;
	return ok(scaledToDecimal(rounded));
}

export function addDecimals(values: readonly string[]): Result<string> {
	let total = 0n;
	for (const value of values) {
		const parsed = decimalToScaled(value);
		if (!parsed.ok) return parsed;
		total += parsed.data;
	}
	return ok(scaledToDecimal(total));
}
