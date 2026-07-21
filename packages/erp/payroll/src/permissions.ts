/**
 * Payroll permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (payroll.*).
 */

export const PAYROLL_PERMISSION_SETUP_MANAGE = "payroll.setup.manage" as const;
export const PAYROLL_PERMISSION_INPUT_MANAGE = "payroll.input.manage" as const;
export const PAYROLL_PERMISSION_RUN_CREATE = "payroll.run.create" as const;
export const PAYROLL_PERMISSION_RUN_CALCULATE =
	"payroll.run.calculate" as const;
export const PAYROLL_PERMISSION_RUN_REVIEW = "payroll.run.review" as const;
export const PAYROLL_PERMISSION_RUN_FINALIZE = "payroll.run.finalize" as const;
export const PAYROLL_PERMISSION_RUN_REVERSE = "payroll.run.reverse" as const;
export const PAYROLL_PERMISSION_PAYSLIP_READ_OWN =
	"payroll.payslip.read-own" as const;
export const PAYROLL_PERMISSION_PAYSLIP_READ_ALL =
	"payroll.payslip.read-all" as const;
export const PAYROLL_PERMISSION_RECONCILIATION_MANAGE =
	"payroll.reconciliation.manage" as const;

export const PAYROLL_PERMISSION_CODES = [
	PAYROLL_PERMISSION_SETUP_MANAGE,
	PAYROLL_PERMISSION_INPUT_MANAGE,
	PAYROLL_PERMISSION_RUN_CREATE,
	PAYROLL_PERMISSION_RUN_CALCULATE,
	PAYROLL_PERMISSION_RUN_REVIEW,
	PAYROLL_PERMISSION_RUN_FINALIZE,
	PAYROLL_PERMISSION_RUN_REVERSE,
	PAYROLL_PERMISSION_PAYSLIP_READ_OWN,
	PAYROLL_PERMISSION_PAYSLIP_READ_ALL,
	PAYROLL_PERMISSION_RECONCILIATION_MANAGE,
] as const;
