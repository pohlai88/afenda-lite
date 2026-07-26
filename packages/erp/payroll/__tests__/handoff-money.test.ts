import { describe, expect, it } from "vitest";

import {
	formatScaledToDecimal,
	formatScaledToHandoffAmount,
	parseDecimalToScaled,
} from "../src/shared/money";

describe("formatScaledToHandoffAmount", () => {
	it("preserves trailing zeros at the declared handoff scale", () => {
		const scaled = parseDecimalToScaled("100.10");
		expect(formatScaledToDecimal(scaled)).toBe("100.1");
		expect(formatScaledToHandoffAmount(scaled, 2)).toBe("100.10");
	});

	it("pads integer amounts when handoff scale is positive", () => {
		const scaled = parseDecimalToScaled("300");
		expect(formatScaledToHandoffAmount(scaled, 2)).toBe("300.00");
	});

	it("returns integer canonical form when handoff scale is zero", () => {
		const scaled = parseDecimalToScaled("85000");
		expect(formatScaledToHandoffAmount(scaled, 0)).toBe("85000");
	});
});
