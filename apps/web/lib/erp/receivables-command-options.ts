import type { ReceivablesCommandOptions } from "@afenda/receivables";

import { createReceivablesAuthorizationPort } from "@/lib/erp/receivables-authorization-port";

/** Composition-root options for `@afenda/receivables` public APIs. */
export function createReceivablesCommandOptions(): ReceivablesCommandOptions {
	return {
		authorization: createReceivablesAuthorizationPort(),
	};
}
