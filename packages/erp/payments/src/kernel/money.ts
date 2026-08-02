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
