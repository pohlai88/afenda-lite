import type { StatutoryRuleCalculator } from "./calculator.types";
import {
	ceilingRateCalculatorConfigSchema,
	contributionCeilingCalculatorConfigSchema,
	progressiveTaxCalculatorConfigSchema,
	scheduleCalculatorConfigSchema,
} from "./calculator-config";
import {
	calculateCeilingRateContribution,
	calculateContributionWithBaseBounds,
	calculateProgressiveTax,
	calculateScheduleContribution,
} from "./calculator-helpers";

const AWAITING_REVIEW = { status: "awaiting_review" as const };

function parseOrThrow<T>(
	calculatorId: string,
	ruleCode: string,
	result:
		| { success: true; data: T }
		| { success: false; error: { message: string } },
): T {
	if (!result.success) {
		throw new RangeError(
			`${calculatorId} config invalid for rule ${ruleCode}: ${result.error.message}`,
		);
	}
	return result.data;
}

export const MY_EPF_V1_CALCULATOR_ID = "my.epf.v1" as const;
export const myEpfV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_EPF_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			MY_EPF_V1_CALCULATOR_ID,
			input.ruleCode,
			scheduleCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateScheduleContribution({
			calculatorId: MY_EPF_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const MY_SOCSO_V1_CALCULATOR_ID = "my.socso.v1" as const;
export const mySocsoV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_SOCSO_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			MY_SOCSO_V1_CALCULATOR_ID,
			input.ruleCode,
			ceilingRateCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateCeilingRateContribution({
			calculatorId: MY_SOCSO_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const MY_EIS_V1_CALCULATOR_ID = "my.eis.v1" as const;
export const myEisV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_EIS_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			MY_EIS_V1_CALCULATOR_ID,
			input.ruleCode,
			ceilingRateCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateCeilingRateContribution({
			calculatorId: MY_EIS_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const MY_PCB_V1_CALCULATOR_ID = "my.pcb.v1" as const;
export const myPcbV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: MY_PCB_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			MY_PCB_V1_CALCULATOR_ID,
			input.ruleCode,
			progressiveTaxCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateProgressiveTax({
			calculatorId: MY_PCB_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const VN_SI_V1_CALCULATOR_ID = "vn.si.v1" as const;
export const vnSiV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: VN_SI_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			VN_SI_V1_CALCULATOR_ID,
			input.ruleCode,
			contributionCeilingCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateContributionWithBaseBounds({
			calculatorId: VN_SI_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const VN_HI_V1_CALCULATOR_ID = "vn.hi.v1" as const;
export const vnHiV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: VN_HI_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			VN_HI_V1_CALCULATOR_ID,
			input.ruleCode,
			contributionCeilingCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateContributionWithBaseBounds({
			calculatorId: VN_HI_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const VN_UI_V1_CALCULATOR_ID = "vn.ui.v1" as const;
export const vnUiV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: VN_UI_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			VN_UI_V1_CALCULATOR_ID,
			input.ruleCode,
			contributionCeilingCalculatorConfigSchema.safeParse(input.configJson),
		);
		return calculateContributionWithBaseBounds({
			calculatorId: VN_UI_V1_CALCULATOR_ID,
			config,
			input,
		});
	},
};

export const VN_PIT_V1_CALCULATOR_ID = "vn.pit.v1" as const;
export const vnPitV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: VN_PIT_V1_CALCULATOR_ID,
	productionApproval: AWAITING_REVIEW,
	calculate(input) {
		const config = parseOrThrow(
			VN_PIT_V1_CALCULATOR_ID,
			input.ruleCode,
			progressiveTaxCalculatorConfigSchema.safeParse(input.configJson),
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
