import type { StatutoryRuleCalculator } from "./calculator.types";
import {
	SYNTH_V1_CALCULATOR_ID,
	synthV1StatutoryCalculator,
} from "./calculator-synth-v1";

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

export function getStatutoryCalculatorReadiness(): readonly {
	calculatorId: string;
	status: StatutoryRuleCalculator["productionApproval"]["status"];
}[] {
	return [...calculators.values()]
		.map((calculator) => ({
			calculatorId: calculator.calculatorId,
			status: calculator.productionApproval.status,
		}))
		.sort((left, right) => left.calculatorId.localeCompare(right.calculatorId));
}

export function isStatutoryProductionReady(): boolean {
	return [...calculators.values()].some(
		(calculator) => calculator.productionApproval.status === "approved",
	);
}

export function isStatutoryCalculatorProductionApproved(
	calculatorId: string,
): boolean {
	return (
		calculators.get(calculatorId)?.productionApproval.status === "approved"
	);
}
