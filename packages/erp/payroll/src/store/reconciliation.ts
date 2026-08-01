import type { Result } from "@afenda/errors";
import type { PayrollReconciliationId, PayrollRunId } from "../brands";
import type { MutationPorts } from "../ports";
import type {
	PayrollReconciliation,
	PayrollReconciliationCreateRecord,
} from "../types";

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
