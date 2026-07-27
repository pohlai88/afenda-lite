export type ExactDecimal = Readonly<{
	coefficient: bigint;
	scale: number;
}>;

const EXACT_DECIMAL_PATTERN = /^([+-]?)(\d+)(?:\.(\d+))?$/;

export const EXACT_DECIMAL_ZERO: ExactDecimal = Object.freeze({
	coefficient: 0n,
	scale: 0,
});

export function parseExactDecimal(value: string): ExactDecimal | null {
	const match = EXACT_DECIMAL_PATTERN.exec(value);
	if (!match) return null;

	const sign = match[1] ?? "";
	const integerPart = match[2] ?? "0";
	const fractionalPart = match[3] ?? "";
	const digits = `${integerPart}${fractionalPart}`.replace(/^0+(?=\d)/, "");
	const magnitude = BigInt(digits || "0");

	return {
		coefficient: sign === "-" ? -magnitude : magnitude,
		scale: fractionalPart.length,
	};
}

function coefficientAtScale(value: ExactDecimal, scale: number): bigint {
	return value.coefficient * 10n ** BigInt(Math.max(0, scale - value.scale));
}

export function compareExactDecimals(
	left: ExactDecimal,
	right: ExactDecimal,
): -1 | 0 | 1 {
	const scale = Math.max(left.scale, right.scale);
	const leftCoefficient = coefficientAtScale(left, scale);
	const rightCoefficient = coefficientAtScale(right, scale);

	if (leftCoefficient < rightCoefficient) return -1;
	if (leftCoefficient > rightCoefficient) return 1;
	return 0;
}

export function addExactDecimals(
	left: ExactDecimal,
	right: ExactDecimal,
): ExactDecimal {
	const scale = Math.max(left.scale, right.scale);
	return {
		coefficient:
			coefficientAtScale(left, scale) + coefficientAtScale(right, scale),
		scale,
	};
}

export function subtractExactDecimals(
	left: ExactDecimal,
	right: ExactDecimal,
): ExactDecimal {
	return addExactDecimals(left, {
		coefficient: -right.coefficient,
		scale: right.scale,
	});
}
