import { errorResult, type Result } from "@afenda/errors";

import type {
	MutationPorts,
	PayrollRunCalculatorPort,
	PayrollRunCalculatorResult,
} from "../ports";
import { hashSnapshot } from "../runs/calc/snapshot";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../shared/rounding-policy";

export interface TestPayrollRunCalculatorOptions {
	exceptions?: PayrollRunCalculatorResult["exceptions"];
	failWith?: Result<never>;
	snapshotHash?: string;
}

export function createTestPayrollRunCalculator(
	options: TestPayrollRunCalculatorOptions = {},
): PayrollRunCalculatorPort {
	return {
		// biome-ignore lint/suspicious/useAwait: This deterministic test calculator implements the asynchronous calculator port contract.
		async calculate(input, _ports: MutationPorts) {
			if (options.failWith) {
				return options.failWith;
			}
			return errorResult.ok({
				calculationSnapshotHash:
					options.snapshotHash ??
					hashSnapshot({
						runId: input.runId,
						calculationVersion: PAYROLL_CALCULATION_VERSION,
						roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
						snapshotHashes: [],
					}),
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				roundingPolicyJson: { ...DEFAULT_PAYROLL_ROUNDING_POLICY },
				exceptions: options.exceptions ?? [],
			});
		},
	};
}
