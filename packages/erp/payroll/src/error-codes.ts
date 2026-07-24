export const PAYROLL_ERROR_VALIDATION = "payroll.validation" as const;
export const PAYROLL_ERROR_NOT_FOUND = "payroll.not_found" as const;
export const PAYROLL_ERROR_CONFLICT = "payroll.conflict" as const;
export const PAYROLL_ERROR_DUPLICATE = "payroll.duplicate" as const;
export const PAYROLL_ERROR_STALE_VERSION = "payroll.stale_version" as const;
export const PAYROLL_ERROR_INVALID_STATE = "payroll.invalid_state" as const;
export const PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP =
	"payroll.effective_range_overlap" as const;
export const PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE =
	"payroll.cross_organization_reference" as const;
export const PAYROLL_ERROR_PERSISTENCE_FAILURE =
	"payroll.persistence_failure" as const;

export const PAYROLL_ERROR_CODES = [
	PAYROLL_ERROR_VALIDATION,
	PAYROLL_ERROR_NOT_FOUND,
	PAYROLL_ERROR_CONFLICT,
	PAYROLL_ERROR_DUPLICATE,
	PAYROLL_ERROR_STALE_VERSION,
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_EFFECTIVE_RANGE_OVERLAP,
	PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE,
	PAYROLL_ERROR_PERSISTENCE_FAILURE,
] as const;

export type PayrollErrorCode = (typeof PAYROLL_ERROR_CODES)[number];

export function payrollErrorDetails(payrollCode: PayrollErrorCode): {
	payrollCode: PayrollErrorCode;
} {
	return { payrollCode };
}
