import { errorResult, type Result } from "@afenda/errors";

import {
	getStatutoryCalculator,
	isStatutoryCalculatorProductionApproved,
} from "../features/statutory-rules/calculator-registry";
import type {
	PayrollClockCapability,
	PayrollCurrencyCapability,
	PayrollStatutoryCapability,
} from "../kernel/execution/capability-ports";
import type { PayrollRoundingPolicy } from "../kernel/money/rounding-policy";

const ISO_CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const JURISDICTION_PAYABLE_POLICY = {
	MYR: { scale: 2, mode: "half_even" },
	VND: { scale: 0, mode: "half_up" },
} as const satisfies Record<string, PayrollRoundingPolicy>;

function toIsoCalendarDate(instant: Date): string {
	const year = instant.getUTCFullYear();
	const month = String(instant.getUTCMonth() + 1).padStart(2, "0");
	const day = String(instant.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** Production system clock (UTC calendar date). Tests inject a fixed clock. */
export function createSystemPayrollClock(
	now: () => Date = () => new Date(),
): PayrollClockCapability {
	return {
		now,
		today: () => toIsoCalendarDate(now()),
	};
}

/** Fixed clock for deterministic parity and unit tests. */
export function createFixedPayrollClock(input: {
	now: Date;
}): PayrollClockCapability {
	const instant = new Date(input.now.getTime());
	return {
		now: () => new Date(instant.getTime()),
		today: () => toIsoCalendarDate(instant),
	};
}

/**
 * Jurisdiction payable-scale table for MYR and VND. Unknown codes fail closed.
 */
export function createJurisdictionPayrollCurrency(): PayrollCurrencyCapability {
	return {
		payableScale(input) {
			const policy =
				JURISDICTION_PAYABLE_POLICY[
					input.currencyCode as keyof typeof JURISDICTION_PAYABLE_POLICY
				];
			if (policy === undefined) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Unsupported payroll payout currency",
				});
			}
			return errorResult.ok(policy.scale);
		},
		payableRounding(input) {
			const policy =
				JURISDICTION_PAYABLE_POLICY[
					input.currencyCode as keyof typeof JURISDICTION_PAYABLE_POLICY
				];
			if (policy === undefined) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Unsupported payroll payout currency",
				});
			}
			return errorResult.ok(policy);
		},
	};
}

/** Statutory resolution over the package calculator registry (fail-closed). */
export function createRegistryPayrollStatutory(): PayrollStatutoryCapability {
	return {
		isProductionApproved: isStatutoryCalculatorProductionApproved,
		requireCalculator(calculatorId) {
			try {
				const calculator = getStatutoryCalculator(calculatorId);
				return errorResult.ok({ calculatorId: calculator.calculatorId });
			} catch {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Statutory calculator is not registered",
				});
			}
		},
	};
}

export function assertIsoCalendarDate(value: string): Result<string> {
	if (!ISO_CALENDAR_DATE.test(value)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Clock today() must return an ISO calendar date",
		});
	}
	return errorResult.ok(value);
}
