import type { PayrollRoundingPolicy } from "./rounding-policy";

/** Fixed-point scale matching `numeric(24, 12)` storage. */
export const PAYROLL_MONEY_SCALE = 12;

const SCALE_FACTOR = 10n ** BigInt(PAYROLL_MONEY_SCALE);

function assertValidDecimal(value: string): void {
	if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
		throw new RangeError(`Invalid payroll decimal: ${value}`);
	}
}

export function parseDecimalToScaled(value: string): bigint {
	const trimmed = value.trim();
	assertValidDecimal(trimmed);

	const negative = trimmed.startsWith("-");
	const unsigned = negative ? trimmed.slice(1) : trimmed;
	const [integerPart = "0", fractionalPart = ""] = unsigned.split(".");
	const normalizedFraction = fractionalPart
		.padEnd(PAYROLL_MONEY_SCALE, "0")
		.slice(0, PAYROLL_MONEY_SCALE);
	const digits = `${integerPart}${normalizedFraction}`.replace(/^0+(?=\d)/, "");
	const magnitude = BigInt(digits.length > 0 ? digits : "0");
	return negative ? -magnitude : magnitude;
}

export function formatScaledToDecimal(scaled: bigint): string {
	if (scaled === 0n) {
		return "0";
	}

	const negative = scaled < 0n;
	const absolute = negative ? -scaled : scaled;
	const digits = absolute.toString().padStart(PAYROLL_MONEY_SCALE + 1, "0");
	const integerPartRaw = digits.slice(0, -PAYROLL_MONEY_SCALE);
	const integerPart = integerPartRaw.length > 0 ? integerPartRaw : "0";
	const fractionalPart = digits.slice(-PAYROLL_MONEY_SCALE).replace(/0+$/, "");
	const unsigned = fractionalPart
		? `${integerPart}.${fractionalPart}`
		: integerPart;
	return negative ? `-${unsigned}` : unsigned;
}

export function addScaled(left: bigint, right: bigint): bigint {
	return left + right;
}

export function subScaled(left: bigint, right: bigint): bigint {
	return left - right;
}

export function mulScaled(left: bigint, right: bigint): bigint {
	return (left * right) / SCALE_FACTOR;
}

export function divScaled(left: bigint, right: bigint): bigint {
	if (right === 0n) {
		throw new RangeError("Division by zero in payroll money arithmetic");
	}
	const negative = left < 0n !== right < 0n;
	const absLeft = left < 0n ? -left : left;
	const absRight = right < 0n ? -right : right;
	const quotient = (absLeft * SCALE_FACTOR) / absRight;
	return negative ? -quotient : quotient;
}

function divideWithRounding(
	value: bigint,
	divisor: bigint,
	mode: PayrollRoundingPolicy["mode"],
): bigint {
	if (divisor === 0n) {
		throw new RangeError("Division by zero in payroll rounding");
	}

	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const quotient = absolute / divisor;
	const remainder = absolute % divisor;

	if (remainder === 0n) {
		return negative ? -quotient : quotient;
	}

	const twiceRemainder = remainder * 2n;
	let roundedUp = false;

	switch (mode) {
		case "toward_zero":
			roundedUp = false;
			break;
		case "half_up":
			roundedUp = twiceRemainder >= divisor;
			break;
		case "half_even":
			if (twiceRemainder > divisor) {
				roundedUp = true;
			} else if (twiceRemainder < divisor) {
				roundedUp = false;
			} else {
				roundedUp = quotient % 2n !== 0n;
			}
			break;
		default: {
			const exhaustive: never = mode;
			return exhaustive;
		}
	}

	const magnitude = roundedUp ? quotient + 1n : quotient;
	return negative ? -magnitude : magnitude;
}

export function roundScaled(
	value: bigint,
	policy: PayrollRoundingPolicy,
): bigint {
	if (policy.scale < 0 || policy.scale > PAYROLL_MONEY_SCALE) {
		throw new RangeError(
			`Rounding scale must be between 0 and ${PAYROLL_MONEY_SCALE}`,
		);
	}

	if (policy.scale === PAYROLL_MONEY_SCALE) {
		return value;
	}

	const scaleDelta = BigInt(PAYROLL_MONEY_SCALE - policy.scale);
	const divisor = 10n ** scaleDelta;
	const rounded = divideWithRounding(value, divisor, policy.mode);
	return rounded * divisor;
}

export function isNegative(value: bigint): boolean {
	return value < 0n;
}

export function isZero(value: bigint): boolean {
	return value === 0n;
}

export function compareScaled(left: bigint, right: bigint): -1 | 0 | 1 {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
}

export function minScaled(left: bigint, right: bigint): bigint {
	return left < right ? left : right;
}

export function absScaled(value: bigint): bigint {
	return value < 0n ? -value : value;
}
