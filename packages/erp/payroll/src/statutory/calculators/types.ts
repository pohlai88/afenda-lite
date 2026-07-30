import type { PayrollRoundingPolicy } from "../../shared/rounding-policy";

export interface StatutoryCalculatorInput {
	configJson: Record<string, unknown>;
	currencyCode: string;
	gross: bigint;
	jurisdictionCode: string;
	roundingPolicy: PayrollRoundingPolicy;
	ruleCode: string;
	ruleVersion: string;
	taxableBase: bigint;
}

export interface StatutoryCalculatorOutput {
	baseAmount: bigint;
	calculatorId: string;
	employeeAmount: bigint;
	employerAmount: bigint;
	traceMessage: string;
}

export interface StatutoryRuleCalculator {
	calculate: (input: StatutoryCalculatorInput) => StatutoryCalculatorOutput;
	readonly calculatorId: string;
}
