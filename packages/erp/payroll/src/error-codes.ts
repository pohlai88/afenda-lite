export const PAYROLL_ERROR_VALIDATION = "payroll.validation" as const;

export const PAYROLL_ERROR_CODES = [PAYROLL_ERROR_VALIDATION] as const;

export type PayrollErrorCode = (typeof PAYROLL_ERROR_CODES)[number];

export function payrollErrorDetails(payrollCode: PayrollErrorCode): {
	payrollCode: PayrollErrorCode;
} {
	return { payrollCode };
}
