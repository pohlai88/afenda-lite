import { ok, type Result } from "@afenda/errors/result";

import type {
	MutationPorts,
	PayrollRunCalculatorPort,
	PayrollRunCalculatorResult,
} from "../ports";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	PAYROLL_CALCULATION_VERSION,
} from "../shared/rounding-policy";

export type TestPayrollRunCalculatorOptions = {
	snapshotHash?: string;
	exceptions?: PayrollRunCalculatorResult["exceptions"];
	failWith?: Result<never>;
};

export function createTestPayrollRunCalculator(
	options: TestPayrollRunCalculatorOptions = {},
): PayrollRunCalculatorPort {
	return {
		async calculate(input, _ports: MutationPorts) {
			if (options.failWith) {
				return options.failWith;
			}
			return ok({
				calculationSnapshotHash:
					options.snapshotHash ?? `hash-${input.runId}-${input.sequence}`,
				calculationVersion: PAYROLL_CALCULATION_VERSION,
				roundingPolicyJson: { ...DEFAULT_PAYROLL_ROUNDING_POLICY },
				exceptions: options.exceptions ?? [],
			});
		},
	};
}
