/** Fixed-point (6dp) decimal helpers shared by memory adapters. */
const SCALE = 1_000_000n;
const TRAILING_ZERO_PATTERN = /0+$/;

export function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

export function formatDecimal(value: bigint): string {
	const whole = value / SCALE;
	const fraction = (value % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(TRAILING_ZERO_PATTERN, "");
	return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

const DECIMAL_PATTERN = /^\d+(?:\.\d{1,6})?$/;

/**
 * amount × rate, rounded half-even at `decimals` places (0–6).
 * Pure primitive — payment-specific FX interpretation lives in fx-policy.
 */
export function multiplyRoundHalfEven(
	amount: string,
	rate: string,
	decimals: number,
): string {
	if (!(DECIMAL_PATTERN.test(amount) && DECIMAL_PATTERN.test(rate))) {
		throw new Error("multiplyRoundHalfEven requires plain decimal strings");
	}
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
		throw new Error("multiplyRoundHalfEven precision must be 0-6");
	}
	const product = decimal(amount) * decimal(rate);
	const targetScale = 10n ** BigInt(12 - decimals);
	const quotient = product / targetScale;
	const remainder = product % targetScale;
	const half = targetScale / 2n;
	let rounded = quotient;
	if (remainder > half || (remainder === half && quotient % 2n === 1n)) {
		rounded += 1n;
	}
	return formatDecimal(rounded * 10n ** BigInt(6 - decimals));
}
