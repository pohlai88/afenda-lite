/** Canonical fixed-point storage policy matching PostgreSQL numeric(24,12). */
export const PAYROLL_MONEY_PRECISION = 24;
export const PAYROLL_MONEY_SCALE = 12;
export const PAYROLL_MONEY_INTEGER_DIGITS =
	PAYROLL_MONEY_PRECISION - PAYROLL_MONEY_SCALE;
