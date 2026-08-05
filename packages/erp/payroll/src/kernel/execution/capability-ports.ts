import type { Result } from "@afenda/errors";

import type { PayrollRoundingPolicy } from "../money/rounding-policy";

/**
 * Injectable clock for effective dating and period "today" decisions (bridging B3).
 * Production composition supplies a system clock; parity tests inject a fixed clock.
 */
export interface PayrollClockCapability {
	now: () => Date;
	today: () => string;
}

/**
 * Currency payable-scale policy (bridging B3). Statutory calculators own their
 * own rounding modes; this capability owns payout currency scale and default
 * payable rounding so VND (0) and MYR (2) cannot share a hard-coded scale.
 */
export interface PayrollCurrencyCapability {
	payableRounding: (input: {
		currencyCode: string;
	}) => Result<PayrollRoundingPolicy>;
	payableScale: (input: { currencyCode: string }) => Result<number>;
}

/**
 * Statutory calculator resolution boundary (bridging B3). Production activation
 * is fail-closed unless the registered calculator carries reviewer approval.
 */
export interface PayrollStatutoryCapability {
	isProductionApproved: (calculatorId: string) => boolean;
	requireCalculator: (calculatorId: string) => Result<{ calculatorId: string }>;
}

/**
 * Payroll-owned year-to-date totals from finalized history (bridging D0).
 * Prior-employer figures arrive on the HR handoff; this port never invents them.
 */
export interface PayrollYearToDateTotals {
	currencyCode: string;
	employeeStatutory: string;
	employerStatutory: string;
	gross: string;
	taxableBase: string;
	taxYear: number;
}

export interface PayrollYearToDateCapability {
	employeeTotals: (input: {
		currencyCode: string;
		employeeId: string;
		organizationId: string;
		taxYear: number;
		throughDate: string;
	}) => Promise<Result<PayrollYearToDateTotals>>;
}
