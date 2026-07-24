import type { PayrollEmployeeCalcSnapshot } from "../../src/runs/calc/types";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../../src/shared/rounding-policy";

export const CALC_TEST_IDS = {
	organizationId: "org-synth-calc-test",
	employeeId: "emp-synth-001",
	assignmentId: "a0000001-0001-4001-8001-000000000001",
	payGroupId: "a0000002-0002-4002-8002-000000000002",
	periodId: "a0000003-0003-4003-8003-000000000003",
	baseEarningRuleId: "a0000004-0004-4004-8004-000000000004",
	bonusEarningRuleId: "a0000005-0005-4005-8005-000000000005",
	preTaxRuleId: "a0000006-0006-4006-8006-000000000006",
	postTaxRuleId: "a0000007-0007-4007-8007-000000000007",
	statutoryRuleId: "a0000008-0008-4008-8008-000000000008",
	recurringEarningId: "a0000009-0009-4009-8009-000000000009",
	recurringPreTaxId: "a000000a-000a-400a-800a-00000000000a",
	recurringPostTaxId: "a000000b-000b-400b-800b-00000000000b",
	variableInputId: "a000000c-000c-400c-800c-00000000000c",
} as const;

type SnapshotOverrides = Partial<
	Omit<PayrollEmployeeCalcSnapshot, "employee" | "eligibility">
> & {
	employee?: Partial<PayrollEmployeeCalcSnapshot["employee"]>;
	eligibility?: Partial<PayrollEmployeeCalcSnapshot["eligibility"]>;
};

export function buildSyntheticCalcSnapshot(
	overrides: SnapshotOverrides = {},
): PayrollEmployeeCalcSnapshot {
	const ids = CALC_TEST_IDS;
	const base: PayrollEmployeeCalcSnapshot = {
		organizationId: ids.organizationId,
		employeeId: ids.employeeId,
		assignmentId: ids.assignmentId,
		payGroupId: ids.payGroupId,
		periodId: ids.periodId,
		currencyCode: "USD",
		calculationVersion: PAYROLL_CALCULATION_VERSION,
		roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
		eligibility: {
			eligible: true,
			reason: null,
		},
		employee: {
			employeeId: ids.employeeId,
			employmentStatus: "active",
			payGroupId: ids.payGroupId,
			baseCompensation: "5000",
			currencyCode: "USD",
			recurringAllowances: [{ code: "MEAL", amount: "200" }],
			recurringDeductions: [],
		},
		recurringEarnings: [
			{
				id: ids.recurringEarningId,
				earningRuleId: ids.bonusEarningRuleId,
				earningRuleCode: "BONUS",
				earningRuleVersion: "1",
				amount: "0",
				currencyCode: "USD",
			},
		],
		recurringDeductions: [
			{
				id: ids.recurringPreTaxId,
				deductionRuleId: ids.preTaxRuleId,
				deductionRuleCode: "PRE401",
				deductionRuleVersion: "1",
				amount: "500",
				currencyCode: "USD",
			},
			{
				id: ids.recurringPostTaxId,
				deductionRuleId: ids.postTaxRuleId,
				deductionRuleCode: "POSTTAX",
				deductionRuleVersion: "1",
				amount: "100",
				currencyCode: "USD",
			},
		],
		variableInputs: [],
		earningRules: [
			{
				id: ids.bonusEarningRuleId,
				code: "BONUS",
				name: "Synthetic bonus",
				ruleType: "fixed",
				amount: "0",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
			},
		],
		deductionRules: [
			{
				id: ids.preTaxRuleId,
				code: "PRE401",
				name: "Synthetic pre-tax",
				ruleType: "fixed",
				amount: "500",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				taxTiming: "pre_tax",
			},
			{
				id: ids.postTaxRuleId,
				code: "POSTTAX",
				name: "Synthetic post-tax",
				ruleType: "fixed",
				amount: "100",
				rate: null,
				currencyCode: "USD",
				ruleVersion: "1",
				taxTiming: "post_tax",
			},
		],
		statutoryRules: [
			{
				id: ids.statutoryRuleId,
				code: "SYNTH_TAX",
				name: "Synthetic statutory (not a real jurisdiction)",
				jurisdictionCode: "SYNTH",
				ruleVersion: "1",
				configJson: {
					calculatorId: "synth.v1",
					baseKind: "taxable",
					employeeRate: "0.1",
					employerRate: "0.05",
				},
			},
		],
	};

	return {
		...base,
		...overrides,
		eligibility: {
			...base.eligibility,
			...overrides.eligibility,
		},
		employee: {
			...base.employee,
			...overrides.employee,
		},
		recurringEarnings: overrides.recurringEarnings ?? base.recurringEarnings,
		recurringDeductions:
			overrides.recurringDeductions ?? base.recurringDeductions,
		variableInputs: overrides.variableInputs ?? base.variableInputs,
		earningRules: overrides.earningRules ?? base.earningRules,
		deductionRules: overrides.deductionRules ?? base.deductionRules,
		statutoryRules: overrides.statutoryRules ?? base.statutoryRules,
	};
}
