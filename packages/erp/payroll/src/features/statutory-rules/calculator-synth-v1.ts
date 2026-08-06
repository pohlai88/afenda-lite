import { z } from "zod";

import {
	formatScaledToDecimal,
	minScaled,
	mulScaledWithRounding,
	parseDecimalToScaled,
	roundScaled,
} from "../../kernel/money/money";
import type {
	StatutoryCalculatorInput,
	StatutoryCalculatorOutput,
	StatutoryRuleCalculator,
} from "./calculator.types";

export const SYNTH_V1_CALCULATOR_ID = "synth.v1" as const;

const synthV1ConfigSchema = z
	.object({
		calculatorId: z.literal(SYNTH_V1_CALCULATOR_ID),
		baseKind: z.enum(["gross", "taxable"]),
		employeeRate: z.string().regex(/^-?\d+(\.\d+)?$/),
		employerRate: z.string().regex(/^-?\d+(\.\d+)?$/),
		cap: z
			.string()
			.regex(/^-?\d+(\.\d+)?$/)
			.optional(),
	})
	.strict();

function applyOptionalCap(amount: bigint, cap: bigint | null): bigint {
	if (cap === null) {
		return amount;
	}
	return minScaled(amount, cap);
}

function computeRateAmount(
	base: bigint,
	rate: string,
	cap: bigint | null,
	policy: StatutoryCalculatorInput["roundingPolicy"],
): bigint {
	const rateScaled = parseDecimalToScaled(rate);
	const rounded = mulScaledWithRounding(base, rateScaled, policy);
	return applyOptionalCap(rounded, cap);
}

export const synthV1StatutoryCalculator: StatutoryRuleCalculator = {
	calculatorId: SYNTH_V1_CALCULATOR_ID,
	jurisdictionCode: null,
	statutoryKind: "contribution",
	productionApproval: { status: "synthetic_only" },
	calculate(input: StatutoryCalculatorInput): StatutoryCalculatorOutput {
		const parsed = synthV1ConfigSchema.safeParse(input.configJson);
		if (!parsed.success) {
			throw new RangeError(
				`synth.v1 config invalid for rule ${input.ruleCode}: ${parsed.error.message}`,
			);
		}

		const config = parsed.data;
		const cap =
			config.cap === undefined ? null : parseDecimalToScaled(config.cap);
		const base = config.baseKind === "gross" ? input.gross : input.taxableBase;
		const roundedBase = roundScaled(base, input.roundingPolicy);

		const employeeAmount = computeRateAmount(
			roundedBase,
			config.employeeRate,
			cap,
			input.roundingPolicy,
		);
		const employerAmount = computeRateAmount(
			roundedBase,
			config.employerRate,
			cap,
			input.roundingPolicy,
		);

		return {
			calculatorId: SYNTH_V1_CALCULATOR_ID,
			baseAmount: roundedBase,
			employeeAmount,
			employerAmount,
			traceMessage: `synth.v1 ${config.baseKind} base ${formatScaledToDecimal(roundedBase)} employeeRate ${config.employeeRate} employerRate ${config.employerRate}`,
		};
	},
};

export { synthV1ConfigSchema };
