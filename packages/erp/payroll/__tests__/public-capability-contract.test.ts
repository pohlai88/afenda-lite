import { errorResult } from "@afenda/errors";
import {
	createPayrollCalendar,
	createPayrollCapabilityOptions,
	type PayrollCapabilityComposition,
	type PayrollCapabilityOptions,
} from "@afenda/payroll";
import { describe, expect, it } from "vitest";

import { createPayrollCalendar as createPayrollCalendarInternal } from "../src/features/payroll-setup/calendar";

function createComposition(): PayrollCapabilityComposition {
	return {
		authorization: {
			can() {
				return Promise.resolve(true);
			},
		},
		workforce: {
			getApprovedPayrollHandoff() {
				return Promise.resolve(errorResult.ok(null));
			},
		},
	};
}

describe("@afenda/payroll permanent capability contract", () => {
	it("creates an opaque frozen execution context without infrastructure fields", () => {
		const context = createPayrollCapabilityOptions(createComposition());

		expect(Object.isFrozen(context)).toBe(true);
		expect(Object.keys(context)).toEqual([]);
		expect("store" in context).toBe(false);
		expect("ports" in context).toBe(false);
		expect("calculator" in context).toBe(false);
	});

	it("exports business-operation wrappers instead of internal implementations", () => {
		expect(createPayrollCalendar).not.toBe(createPayrollCalendarInternal);
	});

	it("rejects forged execution contexts before invoking an operation", () => {
		expect(() =>
			createPayrollCalendar({}, {} as unknown as PayrollCapabilityOptions),
		).toThrowError(
			"Payroll operations require a context created by createPayrollCapabilityOptions().",
		);
	});

	it("executes boundary validation through an approved context", async () => {
		const context = createPayrollCapabilityOptions(createComposition());
		const result = await createPayrollCalendar({}, context);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
	});
});
