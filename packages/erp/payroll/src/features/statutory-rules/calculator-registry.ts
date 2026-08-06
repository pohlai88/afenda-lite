import { errorResult, type Result } from "@afenda/errors";

import type {
	StatutoryCalculatorKind,
	StatutoryRuleCalculator,
} from "./calculator.types";
import { JURISDICTION_STATUTORY_CALCULATORS } from "./calculator-jurisdiction-packs";
import {
	SYNTH_V1_CALCULATOR_ID,
	synthV1StatutoryCalculator,
} from "./calculator-synth-v1";

const calculators = new Map<string, StatutoryRuleCalculator>([
	[SYNTH_V1_CALCULATOR_ID, synthV1StatutoryCalculator],
	...JURISDICTION_STATUTORY_CALCULATORS.map(
		(calculator) => [calculator.calculatorId, calculator] as const,
	),
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

/**
 * Sole owner of "which year-to-date channel does this rule feed".
 *
 * Persisted statutory results carry `calculatorId`, so classifying history is a
 * registry lookup rather than a second per-consumer map of rule codes. An
 * unknown id refuses: a historical result nobody can classify would otherwise be
 * silently dropped out of both channels and under-withhold.
 */
export function resolveStatutoryCalculatorKind(
	calculatorId: string,
): Result<StatutoryCalculatorKind> {
	const calculator = calculators.get(calculatorId);
	if (calculator === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: `Year-to-date totals include a statutory result from an unregistered calculator (${calculatorId})`,
		});
	}
	return errorResult.ok(calculator.statutoryKind);
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
