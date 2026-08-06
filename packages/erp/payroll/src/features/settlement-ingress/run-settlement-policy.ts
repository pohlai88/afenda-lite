import { errorResult, type Result } from "@afenda/errors";

import type { PayrollRunId } from "../../kernel/identity/brands";
import type { PayrollReconciliationStore } from "../reconciliation/reconciliation.store";

/**
 * A4/C8: payroll run reversal is allowed only while disbursement evidence is
 * unsettled. Matched payment reconciliations imply posted disbursements.
 */
export async function assertPayrollRunUnsettledForReversal(
	store: PayrollReconciliationStore,
	input: {
		organizationId: string;
		runId: PayrollRunId;
	},
): Promise<Result<void>> {
	const listed = await store.listReconciliationsForRun({
		organizationId: input.organizationId,
		runId: input.runId,
	});
	if (!listed.ok) {
		return listed;
	}
	const hasSettledDisbursement = listed.data.some(
		(reconciliation) =>
			reconciliation.kind === "payment" && reconciliation.status === "matched",
	);
	if (hasSettledDisbursement) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Payroll run reversal is blocked while disbursement is settled; use Accounting clawback instead.",
		});
	}
	return errorResult.ok(undefined);
}
