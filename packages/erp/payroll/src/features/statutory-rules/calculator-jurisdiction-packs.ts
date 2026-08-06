import type { z } from "zod";

import type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
	StatutoryRuleCalculator,
} from "./calculator.types";
import {
	bandedContributionCalculatorConfigSchema,
	contributionCeilingCalculatorConfigSchema,
	fixedAmountBandCalculatorConfigSchema,
	progressiveTaxCalculatorConfigSchema,
	type StatutoryBandScheduleConfig,
	type StatutoryCeilingRateConfig,
} from "./calculator-config";
import {
	calculateBandScheduleContribution,
	calculateCeilingRateContribution,
	calculateContributionWithBaseBounds,
	calculateProgressiveTax,
	StatutoryCalculationError,
} from "./calculator-helpers";

const AWAITING_REVIEW = { status: "awaiting_review" as const };

export const MY_EPF_V1_CALCULATOR_ID = "my.epf.v1" as const;
export const MY_SOCSO_V1_CALCULATOR_ID = "my.socso.v1" as const;
export const MY_EIS_V1_CALCULATOR_ID = "my.eis.v1" as const;
export const MY_PCB_V1_CALCULATOR_ID = "my.pcb.v1" as const;
export const VN_SI_V1_CALCULATOR_ID = "vn.si.v1" as const;
export const VN_HI_V1_CALCULATOR_ID = "vn.hi.v1" as const;
export const VN_UI_V1_CALCULATOR_ID = "vn.ui.v1" as const;
export const VN_PIT_V1_CALCULATOR_ID = "vn.pit.v1" as const;

/**
 * Config rejection carries the zod issue list, not just "invalid". A pack
 * reviewer populating a 1000-row KWSP schedule needs to know WHICH row overlaps.
 */
function summarizeIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length === 0 ? "(root)" : issue.path.join(".");
			return `${path}: ${issue.message}`;
		})
		.join("; ");
}

function parseOrThrow<T>(
	calculatorId: string,
	ruleCode: string,
	result: z.ZodSafeParseResult<T>,
): T {
	if (!result.success) {
		throw new StatutoryCalculationError(
			`${calculatorId} config invalid for rule ${ruleCode}: ${summarizeIssues(result.error)}`,
		);
	}
	return result.data;
}

/**
 * A pack authored for one jurisdiction refuses a rule filed under another. The
 * rule row and the config are edited independently; without this guard a MY EPF
 * config attached to a VN rule would silently contribute Malaysian amounts
 * against Vietnamese liabilities.
 */
function assertJurisdiction(
	calculator: { calculatorId: string; jurisdictionCode: string | null },
	input: StatutoryCalculatorInput,
): void {
	if (
		calculator.jurisdictionCode !== null &&
		calculator.jurisdictionCode !== input.jurisdictionCode
	) {
		throw new StatutoryCalculationError(
			`${calculator.calculatorId} is authored for ${calculator.jurisdictionCode} but rule ${input.ruleCode} is filed under ${input.jurisdictionCode}`,
		);
	}
}

function isBandConfig(
	config: StatutoryBandScheduleConfig | StatutoryCeilingRateConfig,
): config is StatutoryBandScheduleConfig {
	return "bands" in config;
}

/**
 * EPF is a fixed-amount wage-band schedule (KWSP Third Schedule) with a
 * percentage branch above the tabled wages.
 */
const myEpfConfigSchema = fixedAmountBandCalculatorConfigSchema(
	MY_EPF_V1_CALCULATOR_ID,
);
export const myEpfV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_EPF_V1_CALCULATOR_ID,
	jurisdictionCode: "MY",
	statutoryKind: "contribution",
	productionApproval: AWAITING_REVIEW,
	calculate(input): StatutoryCalculatorOutput {
		assertJurisdiction(myEpfV1StatutoryCalculator, input);
		const config = parseOrThrow(
			MY_EPF_V1_CALCULATOR_ID,
			input.ruleCode,
			myEpfConfigSchema.safeParse(input.configJson),
		);
		return calculateBandScheduleContribution({
			calculatorId: MY_EPF_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

function createPerkesoCalculator(input: {
	calculatorId:
		| typeof MY_SOCSO_V1_CALCULATOR_ID
		| typeof MY_EIS_V1_CALCULATOR_ID;
}): StatutoryRuleCalculator {
	const schema = bandedContributionCalculatorConfigSchema(input.calculatorId);
	const calculator: StatutoryRuleCalculator = {
		calculatorId: input.calculatorId,
		jurisdictionCode: "MY",
		statutoryKind: "contribution",
		productionApproval: AWAITING_REVIEW,
		calculate(calculationInput): StatutoryCalculatorOutput {
			assertJurisdiction(calculator, calculationInput);
			const config = parseOrThrow(
				input.calculatorId,
				calculationInput.ruleCode,
				schema.safeParse(calculationInput.configJson),
			);
			return isBandConfig(config)
				? calculateBandScheduleContribution({
						calculatorId: input.calculatorId,
						config,
						input: calculationInput,
					})
				: calculateCeilingRateContribution({
						calculatorId: input.calculatorId,
						config,
						input: calculationInput,
					});
		},
	};
	return calculator;
}

export const mySocsoV1StatutoryCalculator = createPerkesoCalculator({
	calculatorId: MY_SOCSO_V1_CALCULATOR_ID,
});

export const myEisV1StatutoryCalculator = createPerkesoCalculator({
	calculatorId: MY_EIS_V1_CALCULATOR_ID,
});

const myPcbConfigSchema = progressiveTaxCalculatorConfigSchema(
	MY_PCB_V1_CALCULATOR_ID,
);
export const myPcbV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_PCB_V1_CALCULATOR_ID,
	jurisdictionCode: "MY",
	statutoryKind: "tax",
	productionApproval: AWAITING_REVIEW,
	calculate(input): StatutoryCalculatorOutput {
		assertJurisdiction(myPcbV1StatutoryCalculator, input);
		const config = parseOrThrow(
			MY_PCB_V1_CALCULATOR_ID,
			input.ruleCode,
			myPcbConfigSchema.safeParse(input.configJson),
		);
		return calculateProgressiveTax({
			calculatorId: MY_PCB_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

function createVietnamContributionCalculator(input: {
	calculatorId:
		| typeof VN_SI_V1_CALCULATOR_ID
		| typeof VN_HI_V1_CALCULATOR_ID
		| typeof VN_UI_V1_CALCULATOR_ID;
}): StatutoryRuleCalculator {
	const schema = contributionCeilingCalculatorConfigSchema(input.calculatorId);
	const calculator: StatutoryRuleCalculator = {
		calculatorId: input.calculatorId,
		jurisdictionCode: "VN",
		statutoryKind: "contribution",
		productionApproval: AWAITING_REVIEW,
		calculate(calculationInput): StatutoryCalculatorOutput {
			assertJurisdiction(calculator, calculationInput);
			const config = parseOrThrow(
				input.calculatorId,
				calculationInput.ruleCode,
				schema.safeParse(calculationInput.configJson),
			);
			return calculateContributionWithBaseBounds({
				calculatorId: input.calculatorId,
				config,
				input: calculationInput,
			});
		},
	};
	return calculator;
}

export const vnSiV1StatutoryCalculator = createVietnamContributionCalculator({
	calculatorId: VN_SI_V1_CALCULATOR_ID,
});

export const vnHiV1StatutoryCalculator = createVietnamContributionCalculator({
	calculatorId: VN_HI_V1_CALCULATOR_ID,
});

export const vnUiV1StatutoryCalculator = createVietnamContributionCalculator({
	calculatorId: VN_UI_V1_CALCULATOR_ID,
});

const vnPitConfigSchema = progressiveTaxCalculatorConfigSchema(
	VN_PIT_V1_CALCULATOR_ID,
);
export const vnPitV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: VN_PIT_V1_CALCULATOR_ID,
	jurisdictionCode: "VN",
	statutoryKind: "tax",
	productionApproval: AWAITING_REVIEW,
	calculate(input): StatutoryCalculatorOutput {
		assertJurisdiction(vnPitV1StatutoryCalculator, input);
		const config = parseOrThrow(
			VN_PIT_V1_CALCULATOR_ID,
			input.ruleCode,
			vnPitConfigSchema.safeParse(input.configJson),
		);
		return calculateProgressiveTax({
			calculatorId: VN_PIT_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const JURISDICTION_STATUTORY_CALCULATORS: readonly StatutoryRuleCalculator[] =
	[
		myEpfV1StatutoryCalculator,
		mySocsoV1StatutoryCalculator,
		myEisV1StatutoryCalculator,
		myPcbV1StatutoryCalculator,
		vnSiV1StatutoryCalculator,
		vnHiV1StatutoryCalculator,
		vnUiV1StatutoryCalculator,
		vnPitV1StatutoryCalculator,
	];
