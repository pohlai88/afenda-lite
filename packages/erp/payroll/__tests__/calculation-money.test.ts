import { describe, expect, it } from "vitest";

import {
	formatScaledToDecimal,
	mulScaledWithRounding,
	parseDecimalToScaled,
	roundScaled,
} from "../src/features/calculation/calculation";

describe("payroll money (BigInt scale-12)", () => {
	it("round-trips decimal strings without floating point", () => {
		const samples = ["0", "1", "5200", "470.125"];
		for (const sample of samples) {
			expect(formatScaledToDecimal(parseDecimalToScaled(sample))).toBe(sample);
		}
	});

	it("rejects invalid decimal input", () => {
		expect(() => parseDecimalToScaled("1.2.3")).toThrow(RangeError);
		expect(() => parseDecimalToScaled("not-a-number")).toThrow(RangeError);
		expect(() => parseDecimalToScaled("1.1234567890123")).toThrow(
			"exceeds 12 fractional digits",
		);
	});

	it("applies half_even rounding at policy scale", () => {
		const policy = { scale: 2, mode: "half_even" as const };
		expect(
			formatScaledToDecimal(roundScaled(parseDecimalToScaled("2.005"), policy)),
		).toBe("2");
		expect(
			formatScaledToDecimal(roundScaled(parseDecimalToScaled("2.015"), policy)),
		).toBe("2.02");
		expect(
			formatScaledToDecimal(roundScaled(parseDecimalToScaled("2.025"), policy)),
		).toBe("2.02");
	});

	it("applies half_up and toward_zero rounding modes", () => {
		const value = parseDecimalToScaled("2.015");
		expect(
			formatScaledToDecimal(roundScaled(value, { scale: 2, mode: "half_up" })),
		).toBe("2.02");
		expect(
			formatScaledToDecimal(
				roundScaled(value, { scale: 2, mode: "toward_zero" }),
			),
		).toBe("2.01");
	});

	it("preserves exact storage scale when policy scale equals storage scale", () => {
		const policy = { scale: 12, mode: "half_even" as const };
		const value = parseDecimalToScaled("123.456789012");
		expect(roundScaled(value, policy)).toBe(value);
	});

	it("rounds multiplication before discarding scale-24 precision", () => {
		const result = mulScaledWithRounding(
			parseDecimalToScaled("1.01"),
			parseDecimalToScaled("0.004950495050"),
			{ scale: 2, mode: "half_even" },
		);
		expect(formatScaledToDecimal(result)).toBe("0.01");
	});
});
