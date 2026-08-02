import { describe, expect, it } from "vitest";

import { multiplyRoundHalfEven } from "../src/kernel/money";

describe("multiplyRoundHalfEven", () => {
	it("multiplies and rounds half-even at the requested precision", () => {
		expect(multiplyRoundHalfEven("100", "1.1", 2)).toBe("110");
		expect(multiplyRoundHalfEven("100.005", "1", 2)).toBe("100");
		expect(multiplyRoundHalfEven("100.015", "1", 2)).toBe("100.02");
		expect(multiplyRoundHalfEven("33.333333", "3", 2)).toBe("100");
		expect(multiplyRoundHalfEven("10", "0.123456", 6)).toBe("1.23456");
	});

	it("rejects negative precision and non-decimal input", () => {
		expect(() => multiplyRoundHalfEven("abc", "1", 2)).toThrow();
		expect(() => multiplyRoundHalfEven("1", "1", -1)).toThrow();
	});
});
