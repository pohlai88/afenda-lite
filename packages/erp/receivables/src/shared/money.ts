const SCALE = 1_000_000n;

export function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	const sign = whole.startsWith("-") ? -1n : 1n;
	const absWhole = whole.replace("-", "");
	return (
		sign *
		(BigInt(absWhole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6)))
	);
}

export function format(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/, "");
	return `${sign}${absolute / SCALE}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

export function multiply(left: string, right: string): string {
	return format((decimal(left) * decimal(right)) / SCALE);
}

export function add(left: string, right: string): string {
	return format(decimal(left) + decimal(right));
}

export function subtract(left: string, right: string): string {
	return format(decimal(left) - decimal(right));
}
