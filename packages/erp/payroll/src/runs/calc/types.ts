import type {
	PAYROLL_CALCULATION_VERSION,
	PayrollRoundingPolicy,
} from "../../shared/rounding-policy";
import type { PayrollExceptionSeverity } from "../../types";

export type PayrollResultLineKind =
	| "earning"
	| "pre_tax_deduction"
	| "employee_statutory"
	| "post_tax_deduction"
	| "employer_contribution";

export type PayrollRuleKind = "earning" | "deduction" | "statutory" | "none";

export type PayrollDeductionTaxTiming = "pre_tax" | "post_tax";

export interface PayrollEmployeeSnapshotFacts {
	baseCompensation: string;
	currencyCode: string;
	employeeId: string;
	employmentStatus: "active" | "notice" | "terminated";
	payGroupId: string;
	recurringAllowances: Array<{
		code: string;
		amount: string;
	}>;
	recurringDeductions: Array<{
		code: string;
		amount: string;
	}>;
}

export interface PayrollCalcEarningRuleSnapshot {
	amount: string | null;
	code: string;
	currencyCode: string;
	id: string;
	name: string;
	rate: string | null;
	ruleType: "fixed" | "rate";
	ruleVersion: string;
}

export interface PayrollCalcDeductionRuleSnapshot {
	amount: string | null;
	code: string;
	currencyCode: string;
	id: string;
	name: string;
	rate: string | null;
	ruleType: "fixed" | "rate";
	ruleVersion: string;
	taxTiming: PayrollDeductionTaxTiming;
}

export interface PayrollCalcStatutoryRuleSnapshot {
	code: string;
	configJson: Record<string, unknown>;
	id: string;
	jurisdictionCode: string;
	name: string;
	ruleVersion: string;
}

export interface PayrollCalcRecurringEarningSnapshot {
	amount: string;
	currencyCode: string;
	earningRuleCode: string;
	earningRuleId: string;
	earningRuleVersion: string;
	id: string;
}

export interface PayrollCalcRecurringDeductionSnapshot {
	amount: string;
	currencyCode: string;
	deductionRuleCode: string;
	deductionRuleId: string;
	deductionRuleVersion: string;
	id: string;
}

export interface PayrollCalcVariableInputSnapshot {
	amount: string;
	currencyCode: string;
	earningRuleCode: string;
	earningRuleId: string;
	earningRuleVersion: string;
	id: string;
	sourceId: string;
	sourceType: string;
}

export interface PayrollEmployeeCalcSnapshot {
	assignmentId: string;
	calculationVersion: typeof PAYROLL_CALCULATION_VERSION;
	currencyCode: string;
	deductionRules: PayrollCalcDeductionRuleSnapshot[];
	earningRules: PayrollCalcEarningRuleSnapshot[];
	eligibility: {
		eligible: boolean;
		reason: string | null;
	};
	employee: PayrollEmployeeSnapshotFacts;
	employeeId: string;
	organizationId: string;
	payGroupId: string;
	periodId: string;
	recurringDeductions: PayrollCalcRecurringDeductionSnapshot[];
	recurringEarnings: PayrollCalcRecurringEarningSnapshot[];
	roundingPolicy: PayrollRoundingPolicy;
	statutoryRules: PayrollCalcStatutoryRuleSnapshot[];
	variableInputs: PayrollCalcVariableInputSnapshot[];
}

export interface PayrollCalcException {
	exceptionCode: string;
	message: string;
	severity: PayrollExceptionSeverity;
	sourceRef: string | null;
}

export interface PayrollCalcTraceStep {
	amount: string | null;
	id: string;
	message: string;
	stage:
		| "eligibility"
		| "earnings"
		| "pre_tax_deductions"
		| "statutory"
		| "post_tax_deductions"
		| "employer_contributions"
		| "totals";
}

export interface PayrollCalcResultLine {
	amount: string;
	code: string;
	currencyCode: string;
	lineKind: PayrollResultLineKind;
	ruleCode: string;
	ruleKind: PayrollRuleKind;
	ruleVersion: string;
	sequence: number;
	sourceId: string | null;
	sourceType: string | null;
	traceRef: string;
}

export interface PayrollCalcStatutoryResult {
	baseAmount: string;
	calculatorId: string;
	configSnapshotJson: Record<string, unknown>;
	currencyCode: string;
	employeeAmount: string;
	employerAmount: string;
	jurisdictionCode: string;
	ruleCode: string;
	ruleVersion: string;
}

export interface PayrollEmployeeCalcTotals {
	employeeDeductions: string;
	employeeStatutory: string;
	employerCost: string;
	gross: string;
	net: string;
}

export interface PayrollEmployeeCalcOutput {
	assignmentId: string;
	calculationVersion: typeof PAYROLL_CALCULATION_VERSION;
	currencyCode: string;
	employeeId: string;
	exceptions: PayrollCalcException[];
	lines: PayrollCalcResultLine[];
	roundingPolicy: PayrollRoundingPolicy;
	statutoryResults: PayrollCalcStatutoryResult[];
	totals: PayrollEmployeeCalcTotals;
	trace: PayrollCalcTraceStep[];
}

export type NormalizedPayrollCalcResultLine = PayrollCalcResultLine;

export type NormalizedPayrollCalcStatutoryResult = PayrollCalcStatutoryResult;

export type NormalizedPayrollCalcTraceStep = PayrollCalcTraceStep;

export type NormalizedPayrollEmployeeCalcOutput = Omit<
	PayrollEmployeeCalcOutput,
	"lines" | "statutoryResults" | "trace"
> & {
	lines: NormalizedPayrollCalcResultLine[];
	statutoryResults: NormalizedPayrollCalcStatutoryResult[];
	trace: NormalizedPayrollCalcTraceStep[];
};

export interface PayrollAccountingIdentityResult {
	valid: boolean;
	violations: string[];
}
