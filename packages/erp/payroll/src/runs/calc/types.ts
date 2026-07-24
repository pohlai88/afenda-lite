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

export type PayrollEmployeeSnapshotFacts = {
	employeeId: string;
	employmentStatus: "active" | "notice" | "terminated";
	payGroupId: string;
	baseCompensation: string;
	currencyCode: string;
	recurringAllowances: Array<{
		code: string;
		amount: string;
	}>;
	recurringDeductions: Array<{
		code: string;
		amount: string;
	}>;
};

export type PayrollCalcEarningRuleSnapshot = {
	id: string;
	code: string;
	name: string;
	ruleType: "fixed" | "rate";
	amount: string | null;
	rate: string | null;
	currencyCode: string;
	ruleVersion: string;
};

export type PayrollCalcDeductionRuleSnapshot = {
	id: string;
	code: string;
	name: string;
	ruleType: "fixed" | "rate";
	amount: string | null;
	rate: string | null;
	currencyCode: string;
	ruleVersion: string;
	taxTiming: PayrollDeductionTaxTiming;
};

export type PayrollCalcStatutoryRuleSnapshot = {
	id: string;
	code: string;
	name: string;
	jurisdictionCode: string;
	configJson: Record<string, unknown>;
	ruleVersion: string;
};

export type PayrollCalcRecurringEarningSnapshot = {
	id: string;
	earningRuleId: string;
	earningRuleCode: string;
	earningRuleVersion: string;
	amount: string;
	currencyCode: string;
};

export type PayrollCalcRecurringDeductionSnapshot = {
	id: string;
	deductionRuleId: string;
	deductionRuleCode: string;
	deductionRuleVersion: string;
	amount: string;
	currencyCode: string;
};

export type PayrollCalcVariableInputSnapshot = {
	id: string;
	earningRuleId: string;
	earningRuleCode: string;
	earningRuleVersion: string;
	amount: string;
	currencyCode: string;
	sourceType: string;
	sourceId: string;
};

export type PayrollEmployeeCalcSnapshot = {
	organizationId: string;
	employeeId: string;
	assignmentId: string;
	payGroupId: string;
	periodId: string;
	currencyCode: string;
	calculationVersion: typeof PAYROLL_CALCULATION_VERSION;
	roundingPolicy: PayrollRoundingPolicy;
	eligibility: {
		eligible: boolean;
		reason: string | null;
	};
	employee: PayrollEmployeeSnapshotFacts;
	recurringEarnings: PayrollCalcRecurringEarningSnapshot[];
	recurringDeductions: PayrollCalcRecurringDeductionSnapshot[];
	variableInputs: PayrollCalcVariableInputSnapshot[];
	earningRules: PayrollCalcEarningRuleSnapshot[];
	deductionRules: PayrollCalcDeductionRuleSnapshot[];
	statutoryRules: PayrollCalcStatutoryRuleSnapshot[];
};

export type PayrollCalcException = {
	severity: PayrollExceptionSeverity;
	exceptionCode: string;
	message: string;
	sourceRef: string | null;
};

export type PayrollCalcTraceStep = {
	id: string;
	stage:
		| "eligibility"
		| "earnings"
		| "pre_tax_deductions"
		| "statutory"
		| "post_tax_deductions"
		| "employer_contributions"
		| "totals";
	message: string;
	amount: string | null;
};

export type PayrollCalcResultLine = {
	sequence: number;
	lineKind: PayrollResultLineKind;
	code: string;
	ruleCode: string;
	ruleVersion: string;
	ruleKind: PayrollRuleKind;
	amount: string;
	currencyCode: string;
	sourceType: string | null;
	sourceId: string | null;
	traceRef: string;
};

export type PayrollCalcStatutoryResult = {
	ruleCode: string;
	ruleVersion: string;
	jurisdictionCode: string;
	calculatorId: string;
	baseAmount: string;
	employeeAmount: string;
	employerAmount: string;
	currencyCode: string;
	configSnapshotJson: Record<string, unknown>;
};

export type PayrollEmployeeCalcTotals = {
	gross: string;
	employeeDeductions: string;
	employeeStatutory: string;
	employerCost: string;
	net: string;
};

export type PayrollEmployeeCalcOutput = {
	employeeId: string;
	assignmentId: string;
	currencyCode: string;
	calculationVersion: typeof PAYROLL_CALCULATION_VERSION;
	roundingPolicy: PayrollRoundingPolicy;
	totals: PayrollEmployeeCalcTotals;
	lines: PayrollCalcResultLine[];
	statutoryResults: PayrollCalcStatutoryResult[];
	exceptions: PayrollCalcException[];
	trace: PayrollCalcTraceStep[];
};

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

export type PayrollAccountingIdentityResult = {
	valid: boolean;
	violations: string[];
};
