import type { Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../brands";
import type { MutationPorts } from "../ports";
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../types";

/**
 * Persistence contract for runs — run lifecycle and exceptions.
 * Slice of `PayrollStore`. Persistence only; orchestration stays in commands.
 */
export type PayrollRunsStore = {
	findRunByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPayrollRunRecord | null>>;

	createRun(
		input: PayrollRunCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRun>>;

	getRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollRun | null>>;

	updateRunWithVersion(
		input: PayrollRunUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollRun>>;

	createException(
		input: PayrollExceptionCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollException>>;

	listExceptionsForRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollException[]>>;

	deleteExceptionsForRun(
		input: {
			organizationId: string;
			runId: PayrollRunId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	): Promise<Result<{ deletedCount: number }>>;
};

export type {
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
	PayrollExceptionCreateRecord,
} from "../types";

export type { PayrollRunId } from "../brands";
