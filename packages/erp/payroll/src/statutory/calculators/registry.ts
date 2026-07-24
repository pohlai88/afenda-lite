import { SYNTH_V1_CALCULATOR_ID, synthV1StatutoryCalculator } from "./synth-v1";
import type { StatutoryRuleCalculator } from "./types";

const calculators = new Map<string, StatutoryRuleCalculator>([
	[SYNTH_V1_CALCULATOR_ID, synthV1StatutoryCalculator],
]);

export function getStatutoryCalculator(
	calculatorId: string,
): StatutoryRuleCalculator {
	const calculator = calculators.get(calculatorId);
	if (calculator === undefined) {
		throw new RangeError(`Unknown statutory calculator: ${calculatorId}`);
	}
	return calculator;
}

export function listRegisteredStatutoryCalculators(): readonly string[] {
	return [...calculators.keys()].sort();
}
