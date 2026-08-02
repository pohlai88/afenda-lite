import type { Result } from "@afenda/errors";
import type {
	PayrollReconciliation,
	PayrollReconciliationCreateRecord,
} from "../../kernel/contracts/projected-types";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	PayrollReconciliationId,
	PayrollRunId,
} from "../../kernel/identity/brands";

/** Feature-owned persistence capability for payroll reconciliation. */
export interface PayrollReconciliationStore {
	createReconciliation: (
		record: PayrollReconciliationCreateRecord,
		ports: MutationPorts,
	) => Promise<Result<PayrollReconciliation>>;
	findReconciliationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<{
			entity: PayrollReconciliation;
			createRequestFingerprint: string;
		} | null>
	>;
	listReconciliationsForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollReconciliation[]>>;
	resolveReconciliation: (
		input: {
			organizationId: string;
			reconciliationId: PayrollReconciliationId;
			resolutionNote: string;
			expectedVersion: number;
			actorUserId: string;
			correlationId: string;
		},
		ports: MutationPorts,
	) => Promise<Result<PayrollReconciliation>>;
}
