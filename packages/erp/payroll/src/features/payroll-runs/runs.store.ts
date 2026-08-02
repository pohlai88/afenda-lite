import type { Result } from "@afenda/errors";
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type { PayrollRunId } from "../../kernel/identity/brands";

/**
 * Persistence contract for runs — run lifecycle and exceptions.
 * Persistence only; orchestration stays in payroll-run operations.
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

export type {
	PayrollExceptionCreateRecord,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../../kernel/contracts/projected-types";
export type { PayrollRunId } from "../../kernel/identity/brands";
