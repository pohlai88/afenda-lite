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
export interface PayrollRunsStore {
	createException: (
		input: PayrollExceptionCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollException>>;

	createRun: (
		input: PayrollRunCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollRun>>;

	deleteExceptionsForRun: (
		input: {
			organizationId: string;
			runId: PayrollRunId;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<{ deletedCount: number }>>;
	findRunByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentPayrollRunRecord | null>>;

	getRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollRun | null>>;

	listExceptionsForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollException[]>>;

	updateRunWithVersion: (
		input: PayrollRunUpdateInput,
		ports: MutationPorts,
	) => Promise<Result<PayrollRun>>;
}

export type { PayrollRunId } from "../brands";
export type {
	PayrollExceptionCreateRecord,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../types";
