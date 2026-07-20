import {
	type AccountingCommandOptions,
	createDrizzleAccountingStore,
} from "@afenda/accounting";
import { ok } from "@afenda/errors/result";

import { createAccountingAuthorizationPort } from "@/lib/erp/accounting-authorization-port";

export function createAccountingCommandOptions(): AccountingCommandOptions {
	return {
		store: createDrizzleAccountingStore(),
		authorization: createAccountingAuthorizationPort(),
		effects: {
			async emit() {
				return ok(undefined);
			},
		},
	};
}
