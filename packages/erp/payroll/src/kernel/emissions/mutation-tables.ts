/** Payroll sole-mutator tables — aligned with SCHEMA-OWNERSHIP-MANIFEST.
 *
 * PAYROLL_MUTATION_TABLES = tables Payroll may insert/update/delete.
 * Allowance and deduction *calculation* live here (earning/deduction rules,
 * recurring lines, result lines, statutory results, runs, payslips).
 *
 * PAYROLL_AGGREGATES includes payment_instruction and accounting_posting as
 * logical event-saga markers only — not mutation tables. Posting ownership is
 * @afenda/accounting (journal*); disbursement ownership is @afenda/payments
 * (payment*). Finalization emits payroll.posting-requested.v1 and
 * payroll.payment-requested.v1 as requests, not peer-table writes.
 *
 * HR agreement tables (hr_allowance_entitlement, hr_employee_compensation, …):
 * @afenda/human-resources only.
 * Authority: docs/erp/hr-payroll-bridging.md (ownership + emission drain).
 * Emission → dispatcher mapping: ./emission-registry.ts.
 */
export const PAYROLL_MUTATION_TABLES = [
	"payroll_calendar",
	"payroll_pay_group",
	"payroll_period",
	"payroll_employee_assignment",
	"payroll_earning_rule",
	"payroll_deduction_rule",
	"payroll_statutory_rule",
	"payroll_recurring_earning",
	"payroll_recurring_deduction",
	"payroll_variable_input",
	"payroll_run",
	"payroll_run_employee",
	"payroll_result_line",
	"payroll_statutory_result",
	"payroll_exception",
	"payroll_payslip",
	"payroll_adjustment",
	"payroll_reconciliation",
	"payroll_rule_finalized_usage",
	"payroll_accepted_handoff",
] as const;

export const PAYROLL_AGGREGATES = [
	"calendar",
	"pay_group",
	"earning_rule",
	"deduction_rule",
	"statutory_rule",
	"employee_payroll_assignment",
	"recurring_earning",
	"recurring_deduction",
	"variable_input",
	"overtime_input",
	"leave_adjustment",
	"one_time_adjustment",
	"payroll_period",
	"payroll_run",
	"calculation",
	"exception",
	"finalization",
	"reversal",
	"employee_contribution",
	"employer_contribution",
	"tax_result",
	"statutory_submission",
	"payroll_result",
	"payslip",
	"payment_instruction",
	"accounting_posting",
	"payroll_reconciliation",
	"payment_reconciliation",
	"accounting_reconciliation",
	"accepted_workforce_handoff",
] as const;
