/** Private calculation facade for Payroll orchestration and contract tests. */
export {
	addScaled,
	compareScaled,
	divScaled,
	formatScaledToDecimal,
	isNegative,
	isZero,
	mulScaled,
	mulScaledWithRounding,
	PAYROLL_MONEY_SCALE,
	parseDecimalToScaled,
	roundScaled,
	subScaled,
} from "../../kernel/money/money";
export {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
	type PayrollRoundingPolicy,
	payrollRoundingModeSchema,
	payrollRoundingPolicySchema,
} from "../../kernel/money/rounding-policy";
export type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
	StatutoryRuleCalculator,
} from "../statutory-rules/calculator.types";
export {
	getStatutoryCalculator,
	getStatutoryCalculatorReadiness,
	isStatutoryCalculatorProductionApproved,
	isStatutoryProductionReady,
	listRegisteredStatutoryCalculators,
} from "../statutory-rules/calculator-registry";
export {
	SYNTH_V1_CALCULATOR_ID,
	synthV1StatutoryCalculator,
} from "../statutory-rules/calculator-synth-v1";
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
} from "./calculation.types";
export { verifyAccountingIdentities } from "./calculation-identities";
export { normalizeCalcOutput } from "./calculation-normalize";
export { calculateEmployeePayroll } from "./calculation-pipeline";
export { canonicalizeSnapshot, hashSnapshot } from "./calculation-snapshot";
export { payrollEmployeeCalcSnapshotSchema } from "./calculation-snapshot.schema";
