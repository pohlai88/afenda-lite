import { errorResult, type Result } from "@afenda/errors";

import type { CorporateAdministrationStore } from "../composition/store/contract";
import type { CorporateAdministrationApprovalPort } from "../kernel/execution/approval";
import type { CorporateAdministrationAuthorizationPort } from "../kernel/execution/authorization";
import type { MutationReceiptStore } from "../kernel/execution/idempotency";

export interface CorporateAdministrationCommandOptions {
	/** Optional: absence makes approval-required operations fail closed. */
	approval?: CorporateAdministrationApprovalPort;
	authorization?: CorporateAdministrationAuthorizationPort;
	mutationReceipts?: MutationReceiptStore;
	store?: CorporateAdministrationStore;
}

/**
 * Corporate Administration keeps required-options facade semantics: there is
 * no default store, authorization, or idempotency resolution; the composition
 * root must supply every port. `approval` stays optional here — its absence is
 * a valid, fail-closed production state for approval-required operations, not
 * a facade-level error.
 */
export function resolveOpts(
	options: CorporateAdministrationCommandOptions | undefined,
): Result<{
	store: CorporateAdministrationStore;
	authorization: CorporateAdministrationAuthorizationPort;
	approval: CorporateAdministrationApprovalPort | undefined;
	mutationReceipts: MutationReceiptStore;
}> {
	if (!options?.store) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "CorporateAdministrationStore is required",
		});
	}
	if (!options?.authorization) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Authorization port is required",
		});
	}
	if (!options?.mutationReceipts) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "MutationReceiptStore is required",
		});
	}
	return errorResult.ok({
		store: options.store,
		authorization: options.authorization,
		approval: options.approval,
		mutationReceipts: options.mutationReceipts,
	});
}
