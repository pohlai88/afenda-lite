/** Fixed-point (6dp) decimal helpers shared by memory adapters. */
const SCALE = 1_000_000n;
const TRAILING_ZERO_PATTERN = /0+$/;

export function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

export function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(TRAILING_ZERO_PATTERN, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

export function multiply(left: string, right: string): string {
	return format((decimal(left) * decimal(right)) / SCALE);
}
