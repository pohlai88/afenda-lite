import type { HandoffStatutoryProfile } from "@afenda/events/schemas";

import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";

/**
 * Year-to-date facts as ONE merged value. Prior-employer figures are folded in
 * by `PayrollYearToDateCapability` before a calculator ever sees them, so no
 * calculator can invent its own hire-year merge.
 *
 * `employeeStatutory` and `taxWithheld` are DISJOINT channels, split by the
 * registered kind of the calculator that produced each historical statutory
 * result: contribution packs (EPF/SOCSO/EIS/SI/HI/UI) aggregate into
 * `employeeStatutory`, tax packs (PCB/PIT) into `taxWithheld`. A tax pack that
 * nets off "tax already withheld this year" needs the tax figure alone; the
 * previously commingled total would have netted off contributions too and
 * under-withheld by the whole EPF/SOCSO year to date.
 */
export interface StatutoryYearToDateFacts {
	currencyCode: string;
	/** Employee-side statutory CONTRIBUTIONS year to date — never includes tax. */
	employeeStatutory: string;
	employerStatutory: string;
	gross: string;
	taxableBase: string;
	/** Employee-side statutory TAX withheld year to date, prior employers included. */
	taxWithheld: string;
	taxYear: number;
}

export interface StatutoryCalculatorInput {
	configJson: Record<string, unknown>;
	currencyCode: string;
	gross: bigint;
	jurisdictionCode: string;
	/**
	 * 1-based ordinal of this pay period within the tax year, and the number of
	 * periods the year holds. `null` means the caller could not establish the
	 * cadence; packs that need it (annualized withholding) refuse rather than
	 * assume a position in the year.
	 */
	periodOrdinal: number | null;
	periodsPerYear: number | null;
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

/**
 * Which year-to-date channel a pack's employee amount belongs to. This is the
 * single owner of "is this rule a tax withholding" — the year-to-date
 * capability classifies historical statutory results by their `calculatorId`
 * through the registry rather than re-deciding per consumer.
 */
export type StatutoryCalculatorKind = "contribution" | "tax";

export interface StatutoryRuleCalculator {
	calculate: (input: StatutoryCalculatorInput) => StatutoryCalculatorOutput;
	readonly calculatorId: string;
	/**
	 * Jurisdiction this pack is authored for. `null` marks a
	 * jurisdiction-agnostic pack (synthetic fixtures only); a non-null value is
	 * enforced against the rule's own `jurisdictionCode` on every calculation.
	 */
	readonly jurisdictionCode: string | null;
	readonly productionApproval:
		| { readonly status: "synthetic_only" }
		| { readonly status: "awaiting_review" }
		| {
				readonly status: "approved";
				readonly reviewedBy: string;
				readonly reviewedAt: string;
				readonly jurisdictions: readonly string[];
		  };
	readonly statutoryKind: StatutoryCalculatorKind;
}
