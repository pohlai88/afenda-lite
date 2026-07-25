const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function parseDecimalString(value: string): string | null {
	const trimmed = value.trim();
	if (!DECIMAL_PATTERN.test(trimmed)) {
		return null;
	}
	return normalizeDecimal(trimmed);
}

function normalizeDecimal(value: string): string {
	const negative = value.startsWith("-");
	const unsigned = negative ? value.slice(1) : value;
	const [wholePart = "0", fractionPart = ""] = unsigned.split(".");
	const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0";
	const normalizedFraction = fractionPart.replace(/0+$/, "");
	if (!normalizedFraction) {
		return negative && normalizedWhole !== "0"
			? `-${normalizedWhole}`
			: normalizedWhole;
	}
	const result = `${normalizedWhole}.${normalizedFraction}`;
	return negative ? `-${result}` : result;
}

function splitDecimal(value: string): {
	sign: -1 | 1;
	whole: string;
	fraction: string;
} {
	const normalized = normalizeDecimal(value);
	const negative = normalized.startsWith("-");
	const unsigned = negative ? normalized.slice(1) : normalized;
	const [whole = "0", fraction = ""] = unsigned.split(".");
	return { sign: negative ? -1 : 1, whole, fraction };
}

function compareMagnitude(a: string, b: string): -1 | 0 | 1 {
	const left = splitDecimal(a);
	const right = splitDecimal(b);
	const maxFraction = Math.max(left.fraction.length, right.fraction.length);
	const leftFraction = left.fraction.padEnd(maxFraction, "0");
	const rightFraction = right.fraction.padEnd(maxFraction, "0");
	const leftWhole = BigInt(left.whole + leftFraction);
	const rightWhole = BigInt(right.whole + rightFraction);
	if (leftWhole < rightWhole) return -1;
	if (leftWhole > rightWhole) return 1;
	return 0;
}

export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
	const left = splitDecimal(a);
	const right = splitDecimal(b);
	if (left.sign !== right.sign) {
		return left.sign < right.sign ? -1 : 1;
	}
	const magnitude = compareMagnitude(a, b);
	return left.sign === -1 ? (-magnitude as -1 | 0 | 1) : magnitude;
}

export function isZeroDecimal(value: string): boolean {
	return compareDecimal(value, "0") === 0;
}

export function isNegativeDecimal(value: string): boolean {
	return compareDecimal(value, "0") < 0;
}

export function addDecimal(a: string, b: string): string {
	const left = splitDecimal(a);
	const right = splitDecimal(b);
	const maxFraction = Math.max(left.fraction.length, right.fraction.length);
	const scale = 10n ** BigInt(maxFraction);
	const leftScaled =
		BigInt(left.whole + left.fraction.padEnd(maxFraction, "0")) *
		BigInt(left.sign);
	const rightScaled =
		BigInt(right.whole + right.fraction.padEnd(maxFraction, "0")) *
		BigInt(right.sign);
	const sum = leftScaled + rightScaled;
	const negative = sum < 0n;
	const absolute = negative ? -sum : sum;
	const whole = absolute / scale;
	const fraction = absolute % scale;
	if (fraction === 0n) {
		return negative ? `-${whole.toString()}` : whole.toString();
	}
	const fractionText = fraction
		.toString()
		.padStart(maxFraction, "0")
		.replace(/0+$/, "");
	return negative
		? `-${whole.toString()}.${fractionText}`
		: `${whole.toString()}.${fractionText}`;
}

export function sumDecimals(values: string[]): string {
	return values.reduce((total, value) => addDecimal(total, value), "0");
}

export function negateDecimal(value: string): string {
	if (isZeroDecimal(value)) return "0";
	return value.startsWith("-") ? value.slice(1) : `-${value}`;
}
