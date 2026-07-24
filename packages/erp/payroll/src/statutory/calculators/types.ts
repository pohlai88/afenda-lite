import type { PayrollRoundingPolicy } from "../../shared/rounding-policy";

export type StatutoryCalculatorInput = {
	ruleCode: string;
	ruleVersion: string;
	jurisdictionCode: string;
	configJson: Record<string, unknown>;
	currencyCode: string;
	gross: bigint;
	taxableBase: bigint;
	roundingPolicy: PayrollRoundingPolicy;
};

export type StatutoryCalculatorOutput = {
	calculatorId: string;
	baseAmount: bigint;
	employeeAmount: bigint;
	employerAmount: bigint;
	traceMessage: string;
};

export type StatutoryRuleCalculator = {
	readonly calculatorId: string;
	calculate(input: StatutoryCalculatorInput): StatutoryCalculatorOutput;
};
