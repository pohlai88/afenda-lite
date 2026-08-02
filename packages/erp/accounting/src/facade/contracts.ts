import { errorResult, type Result } from "@afenda/errors";

import type { AccountingStore } from "../composition/store/contract";
import type { AccountingEffects } from "../kernel/contracts/domain";
import type { AccountingAuthorizationPort } from "../kernel/execution/authorization";

export interface AccountingCommandOptions {
	authorization?: AccountingAuthorizationPort;
	effects?: AccountingEffects;
	store?: AccountingStore;
}

/**
 * Accounting keeps required-options facade semantics: there is no default
 * store or effects resolution; the composition root must supply every port.
 */
export function resolveOpts(
	options: AccountingCommandOptions | undefined,
): Result<{
	store: AccountingStore;
	authorization: AccountingAuthorizationPort;
	effects: AccountingEffects;
}> {
	if (!options?.store) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "AccountingStore is required",
		});
	}
	if (!options?.authorization) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Authorization port is required",
		});
	}
	if (!options?.effects) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Effects port is required",
		});
	}
	return errorResult.ok({
		store: options.store,
		authorization: options.authorization,
		effects: options.effects,
	});
}
