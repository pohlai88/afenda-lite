import { describe, expect, it } from "vitest";

import {
	addLeaveQuantity,
	computeLeaveBalance,
} from "../src/features/leave/balance";

describe("leave quantity arithmetic", () => {
	it("adds day quantities without floating-point drift", () => {
		expect(addLeaveQuantity("1.5", "2.25")).toBe("3.75");
		expect(addLeaveQuantity("0", "4")).toBe("4");
		expect(computeLeaveBalance("10", [{ delta: "-2.5" }, { delta: "1" }])).toBe(
			"8.5",
		);
	});

	it("keeps the sign on negative operands", () => {
		expect(addLeaveQuantity("4", "-1.5")).toBe("2.5");
		expect(addLeaveQuantity("-1.25", "-0.75")).toBe("-2");
	});

	it("regresses the two payroll-handoff decimal defects (D0 review)", () => {
		// The deleted hand-rolled addQuantity in the payroll handoff returned
		// "9.5" here (it dropped the minus before scaling) ...
		expect(addLeaveQuantity("10", "-1.5")).toBe("8.5");
		// ... and produced the un-parseable "0.-5" here.
		expect(addLeaveQuantity("0", "-1.5")).toBe("-1.5");
	});
});
