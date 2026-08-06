import type {
	HandoffApprovalEvidence,
	HandoffLeaveFact,
	HandoffOvertimeFact,
	HandoffPriorEmployerYtd,
	HandoffSourceVersion,
	HandoffStatutoryProfile,
	HandoffTimeFacts,
} from "@afenda/events/schemas";
import type { PayrollExceptionSeverity } from "../../kernel/contracts/projected-types";
import type {
	PAYROLL_CALCULATION_VERSION,
	PayrollRoundingPolicy,
} from "../../kernel/money/rounding-policy";
import type { PayrollJsonObject } from "../../kernel/validation/common.schema";
import type { StatutoryYearToDateFacts } from "../statutory-rules/calculator.types";
import type { PayrollStatutoryPeriodCadence } from "../statutory-rules/period-cadence";
import type { ApprovedPayrollHandoffParsedComponent } from "../workforce-ingress/parse-approved-payroll-handoff";

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
	recordVersion: number;
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
	recordVersion: number;
	ruleType: "fixed" | "rate";
	ruleVersion: string;
	taxTiming: PayrollDeductionTaxTiming;
}

export interface PayrollLapsedStatutoryRule {
	calculatorId: string;
	jurisdictionCode: string;
	ruleCode: string;
}

export interface PayrollCalcStatutoryRuleSnapshot {
	code: string;
	configJson: PayrollJsonObject;
	id: string;
	jurisdictionCode: string;
	name: string;
	recordVersion: number;
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

export interface PayrollApprovedWorkFactsSnapshot {
	approvalEvidence: HandoffApprovalEvidence;
	components: Omit<ApprovedPayrollHandoffParsedComponent, "amountScaled">[];
	leaveFacts: HandoffLeaveFact[];
	overtimeFacts: HandoffOvertimeFact[];
	sourceVersion: HandoffSourceVersion;
	timeFacts: HandoffTimeFacts | null;
}

export interface PayrollEmployeeCalcSnapshot {
	approvedWorkFacts: PayrollApprovedWorkFactsSnapshot;
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
	/**
	 * Statutory rules that were active in the pay group's immediately-preceding
	 * period but have no active rule for the SAME calculator covering this one.
	 * Derived by the production run calculator, which is the only layer that can
	 * see the previous period, and sealed into the snapshot so a retro recompute
	 * re-reaches the same refusal.
	 */
	lapsedStatutoryRules?: readonly PayrollLapsedStatutoryRule[] | undefined;
	organizationId: string;
	payGroupId: string;
	/**
	 * Where this period sits in its tax year. Supplied by the production run
	 * calculator from the pay group's period sequence; absent only for synthetic
	 * snapshots, in which case annualized tax packs refuse rather than guess.
	 */
	periodCadence?: PayrollStatutoryPeriodCadence | undefined;
	periodId: string;
	priorEmployerYtd?: readonly HandoffPriorEmployerYtd[] | undefined;
	recurringDeductions: PayrollCalcRecurringDeductionSnapshot[];
	recurringEarnings: PayrollCalcRecurringEarningSnapshot[];
	roundingPolicy: PayrollRoundingPolicy;
	statutoryProfile?: HandoffStatutoryProfile | null | undefined;
	statutoryRules: PayrollCalcStatutoryRuleSnapshot[];
	variableInputs: PayrollCalcVariableInputSnapshot[];
	yearToDate?: StatutoryYearToDateFacts | undefined;
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
	configSnapshotJson: PayrollJsonObject;
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
