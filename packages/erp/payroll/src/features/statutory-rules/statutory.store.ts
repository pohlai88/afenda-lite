import type { Result } from "@afenda/errors";
import type {
	PayrollStatutoryResult,
	ReplaceStatutoryResultsForRunInput,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type { PayrollRunId } from "../../kernel/identity/brands";

/**
 * Persistence contract for statutory calculation outputs.
 * Persistence only; orchestration stays in statutory-rule operations.
 */
export interface PayrollStatutoryStore {
	/** One read across many runs for a single employee (year-to-date history). */
	listStatutoryResultsForEmployeeRuns: (input: {
		organizationId: string;
		employeeId: string;
		runIds: readonly PayrollRunId[];
	}) => Promise<Result<PayrollStatutoryResult[]>>;
	listStatutoryResultsForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollStatutoryResult[]>>;
	replaceStatutoryResultsForRun: (
		input: ReplaceStatutoryResultsForRunInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollStatutoryResult[]>>;
}

export type { ReplaceStatutoryResultsForRunInput } from "../../kernel/contracts/projected-types";
export type { PayrollRunId } from "../../kernel/identity/brands";
