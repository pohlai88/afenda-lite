import type { Result } from "@afenda/errors";
import type {
	PayrollResultLine,
	PayrollRunEmployee,
	ReplaceRunCalculationOutputsInput,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type { PayrollRunId } from "../../kernel/identity/brands";

/**
 * Persistence contract for outputs — payroll result lines and run employees.
 * Persistence only; orchestration stays in calculation operations.
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

	/** One read across many runs for a single employee (year-to-date history). */
	listResultLinesForEmployeeRuns: (input: {
		organizationId: string;
		employeeId: string;
		runIds: readonly PayrollRunId[];
	}) => Promise<Result<PayrollResultLine[]>>;

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

export type { ReplaceRunCalculationOutputsInput } from "../../kernel/contracts/projected-types";
export type { PayrollRunId } from "../../kernel/identity/brands";
