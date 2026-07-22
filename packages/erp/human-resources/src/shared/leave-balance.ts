const DEFAULT_SCALE = 4;

function resolveScale(...values: string[]): number {
	let scale = 0;
	for (const value of values) {
		const dot = value.indexOf(".");
		if (dot >= 0) {
			scale = Math.max(scale, value.length - dot - 1);
		}
	}
	return Math.max(scale, DEFAULT_SCALE);
}

function toScaled(value: string, scale: number): bigint {
	const trimmed = value.trim();
	const negative = trimmed.startsWith("-");
	const normalized = negative ? trimmed.slice(1) : trimmed;
	const [integerPart = "0", fractionalPart = ""] = normalized.split(".");
	const paddedFraction = `${fractionalPart}${"0".repeat(scale)}`.slice(
		0,
		scale,
	);
	const digits = `${integerPart || "0"}${paddedFraction}`.replace(
		/^0+(?=\d)/,
		"",
	);
	const magnitude = BigInt(digits || "0");
	return negative ? -magnitude : magnitude;
}

function fromScaled(value: bigint, scale: number): string {
	if (value === 0n) {
		return "0";
	}
	const negative = value < 0n;
	const abs = negative ? -value : value;
	const raw = abs.toString();
	const padded = raw.padStart(scale + 1, "0");
	const integerPart = padded.slice(0, -scale) || "0";
	const fractionalPart = padded.slice(-scale).replace(/0+$/, "");
	const rendered = fractionalPart
		? `${integerPart}.${fractionalPart}`
		: integerPart;
	return negative ? `-${rendered}` : rendered;
}

/**
 * Derived leave balance: opening quantity plus sum of posted adjustment deltas.
 * Uses fixed-scale bigint arithmetic to avoid floating-point drift.
 */
export function computeLeaveBalance(
	openingQuantity: string,
	adjustments: { delta: string }[],
): string {
	const scale = resolveScale(
		openingQuantity,
		...adjustments.map((adjustment) => adjustment.delta),
	);
	let total = toScaled(openingQuantity, scale);
	for (const adjustment of adjustments) {
		total += toScaled(adjustment.delta, scale);
	}
	return fromScaled(total, scale);
}

export function compareLeaveQuantity(left: string, right: string): number {
	const scale = resolveScale(left, right);
	const leftScaled = toScaled(left, scale);
	const rightScaled = toScaled(right, scale);
	if (leftScaled < rightScaled) return -1;
	if (leftScaled > rightScaled) return 1;
	return 0;
}

export function negateLeaveQuantity(value: string): string {
	if (value.startsWith("-")) {
		return value.slice(1);
	}
	return value === "0" ? "0" : `-${value}`;
}
