import type { Result } from "@afenda/errors";

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
export interface PayrollOutputsStore {
	deleteCalculationOutputsForRun: (
		input: {
			organizationId: string;
			runId: PayrollRunId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<{ deleted: true }>>;

	listResultLinesForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollResultLine[]>>;

	listRunEmployeesForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollRunEmployee[]>>;
	replaceRunCalculationOutputs: (
		input: ReplaceRunCalculationOutputsInput,
		ports: MutationPorts,
	) => Promise<
		Result<{
			runEmployees: PayrollRunEmployee[];
			resultLines: PayrollResultLine[];
		}>
	>;
}

export type { PayrollRunId } from "../brands";
export type { ReplaceRunCalculationOutputsInput } from "../types";
