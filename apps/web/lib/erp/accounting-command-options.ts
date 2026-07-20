import type { AccountingCommandOptions } from "@afenda/accounting";

import { createAccountingAuthorizationPort } from "@/lib/erp/accounting-authorization-port";

/** Composition-root options for `@afenda/accounting` public APIs. */
export function createAccountingCommandOptions(): AccountingCommandOptions {
	return {
		authorization: createAccountingAuthorizationPort(),
	};
}
