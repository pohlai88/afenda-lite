import { errorResult, type Result } from "@afenda/errors";

export interface PayrollAmountRateRuleConfiguration {
	amount: string | null;
	rate: string | null;
	ruleType: "fixed" | "rate";
}

export function isValidPayrollAmountRateRuleConfiguration(
	configuration: PayrollAmountRateRuleConfiguration,
): boolean {
	if (configuration.ruleType === "fixed") {
		return configuration.amount !== null && configuration.rate === null;
	}
	return configuration.rate !== null && configuration.amount === null;
}

export function assertValidPayrollAmountRateRuleConfiguration(
	configuration: PayrollAmountRateRuleConfiguration,
): Result<void> {
	if (!isValidPayrollAmountRateRuleConfiguration(configuration)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Fixed rules require only an amount; rate rules require only a rate",
		});
	}
	return errorResult.ok(undefined);
}

export function assertValidRuleSuccessorDate(input: {
	currentEffectiveFrom: string;
	successorEffectiveFrom: string;
}): Result<void> {
	if (input.successorEffectiveFrom <= input.currentEffectiveFrom) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"A successor rule must start after the version it supersedes",
		});
	}
	return errorResult.ok(undefined);
}

export function isHistoricallyApplicableRuleStatus(status: string): boolean {
	return status !== "archived";
}
