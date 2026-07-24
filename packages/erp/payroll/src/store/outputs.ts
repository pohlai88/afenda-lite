import type { Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../brands";
import type { MutationPorts } from "../ports";
import type {
	PayrollResultLine,
	PayrollRunEmployee,
	ReplaceRunCalculationOutputsInput,
} from "../types";

/**
 * Persistence contract for outputs — payroll result lines and run employees.
 * Slice of `PayrollStore`. Persistence only; orchestration stays in commands.
 */
export type PayrollOutputsStore = {
	replaceRunCalculationOutputs(
		input: ReplaceRunCalculationOutputsInput,
		ports: MutationPorts,
	): Promise<
		Result<{
			runEmployees: PayrollRunEmployee[];
			resultLines: PayrollResultLine[];
		}>
	>;

	listRunEmployeesForRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollRunEmployee[]>>;

	listResultLinesForRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollResultLine[]>>;

	deleteCalculationOutputsForRun(
		input: {
			organizationId: string;
			runId: PayrollRunId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<{ deleted: true }>>;
};

export type { ReplaceRunCalculationOutputsInput } from "../types";
export type { PayrollRunId } from "../brands";
