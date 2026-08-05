import type { HandoffStatutoryProfile } from "@afenda/events/schemas";

import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";

/**
 * Year-to-date facts as ONE merged value. Prior-employer figures are folded in
 * by `PayrollYearToDateCapability` before a calculator ever sees them, so no
 * calculator can invent its own hire-year merge.
 */
export interface StatutoryYearToDateFacts {
	currencyCode: string;
	employeeStatutory: string;
	employerStatutory: string;
	gross: string;
	taxableBase: string;
	taxYear: number;
}

export interface StatutoryCalculatorInput {
	configJson: Record<string, unknown>;
	currencyCode: string;
	gross: bigint;
	jurisdictionCode: string;
	roundingPolicy: PayrollRoundingPolicy;
	ruleCode: string;
	ruleVersion: string;
	statutoryProfile: HandoffStatutoryProfile | null;
	taxableBase: bigint;
	yearToDate: StatutoryYearToDateFacts;
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
	readonly productionApproval:
		| { readonly status: "synthetic_only" }
		| { readonly status: "awaiting_review" }
		| {
				readonly status: "approved";
				readonly reviewedBy: string;
				readonly reviewedAt: string;
				readonly jurisdictions: readonly string[];
		  };
}
