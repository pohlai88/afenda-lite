import { errorResult, type Result } from "@afenda/errors";

import type {
	PurchaseOrderCommitmentQueryPort,
	PurchaseOrderCommitmentStatus,
} from "../ports";
import { resolveAsync } from "../resolve-async";

const ZERO_COMMITMENT: PurchaseOrderCommitmentStatus = {
	orderedQuantity: "0",
	receivedQuantity: "0",
	invoicedQuantity: "0",
	hasPostedReceipt: false,
	hasPostedSupplierInvoice: false,
};

/** Test double — returns zero commitment by default (close always allowed). */
export function createMemoryCommitmentQueryPort(
	override?: Partial<PurchaseOrderCommitmentStatus>,
): PurchaseOrderCommitmentQueryPort {
	const status: PurchaseOrderCommitmentStatus = {
		...ZERO_COMMITMENT,
		...override,
	};
	return {
		getCommitmentStatus(): Promise<Result<PurchaseOrderCommitmentStatus>> {
			return resolveAsync(() => errorResult.ok(status));
		},
	};
}
