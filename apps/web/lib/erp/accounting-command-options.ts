import {
	type AccountingCommandOptions,
	createDrizzleAccountingStore,
} from "@afenda/accounting";
import { errorResult } from "@afenda/errors";

import { createAccountingAuthorizationPort } from "@/lib/erp/accounting-authorization-port";

export function createAccountingCommandOptions(): AccountingCommandOptions {
	return {
		store: createDrizzleAccountingStore(),
		authorization: createAccountingAuthorizationPort(),
		effects: {
			async emit() {
				return await errorResult.ok(undefined);
			},
		},
	};
}
