import type { Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../brands";
import type { MutationPorts } from "../ports";
import type {
	PayrollStatutoryResult,
	ReplaceStatutoryResultsForRunInput,
} from "../types";

/**
 * Persistence contract for statutory calculation outputs.
 * Slice of `PayrollStore`. Persistence only; orchestration stays in commands.
 */
export type PayrollStatutoryStore = {
	replaceStatutoryResultsForRun(
		input: ReplaceStatutoryResultsForRunInput,
		ports: MutationPorts,
	): Promise<Result<PayrollStatutoryResult[]>>;

	listStatutoryResultsForRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollStatutoryResult[]>>;
};

export type { ReplaceStatutoryResultsForRunInput } from "../types";
export type { PayrollRunId } from "../brands";
