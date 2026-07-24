/** Aggregate boundary marker and public pure calculation engine exports. */
export const PAYROLL_AGGREGATE_CALCULATION = "calculation" as const;
export type PayrollCalculationAggregate = typeof PAYROLL_AGGREGATE_CALCULATION;

import { verifyAccountingIdentities } from "./calc/identities";
import { normalizeCalcOutput } from "./calc/normalize";
import { calculateEmployeePayroll } from "./calc/pipeline";
import { canonicalizeSnapshot, hashSnapshot } from "./calc/snapshot";
import type {
	NormalizedPayrollEmployeeCalcOutput,
	PayrollAccountingIdentityResult,
	PayrollCalcException,
	PayrollCalcResultLine,
	PayrollCalcStatutoryResult,
	PayrollCalcTraceStep,
	PayrollDeductionTaxTiming,
	PayrollEmployeeCalcOutput,
	PayrollEmployeeCalcSnapshot,
	PayrollEmployeeCalcTotals,
	PayrollEmployeeSnapshotFacts,
	PayrollResultLineKind,
	PayrollRuleKind,
} from "./calc/types";

export {
	addScaled,
	compareScaled,
	divScaled,
	formatScaledToDecimal,
	isNegative,
	isZero,
	mulScaled,
	PAYROLL_MONEY_SCALE,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../shared/money";
export {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
	type PayrollRoundingPolicy,
	payrollRoundingModeSchema,
	payrollRoundingPolicySchema,
} from "../shared/rounding-policy";
export {
	getStatutoryCalculator,
	listRegisteredStatutoryCalculators,
} from "../statutory/calculators/registry";
export {
	SYNTH_V1_CALCULATOR_ID,
	synthV1StatutoryCalculator,
} from "../statutory/calculators/synth-v1";
export type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
	StatutoryRuleCalculator,
} from "../statutory/calculators/types";
export type {
	NormalizedPayrollEmployeeCalcOutput,
	PayrollAccountingIdentityResult,
	PayrollCalcException,
	PayrollCalcResultLine,
	PayrollCalcStatutoryResult,
	PayrollCalcTraceStep,
	PayrollDeductionTaxTiming,
	PayrollEmployeeCalcOutput,
	PayrollEmployeeCalcSnapshot,
	PayrollEmployeeCalcTotals,
	PayrollEmployeeSnapshotFacts,
	PayrollResultLineKind,
	PayrollRuleKind,
};
export {
	calculateEmployeePayroll,
	canonicalizeSnapshot,
	hashSnapshot,
	normalizeCalcOutput,
	verifyAccountingIdentities,
};
