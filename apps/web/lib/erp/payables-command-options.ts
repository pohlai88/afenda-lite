import type { PayablesCommandOptions } from "@afenda/payables";

import { createPayablesAuthorizationPort } from "@/lib/erp/payables-authorization-port";

/** Composition-root options for `@afenda/payables` public APIs. */
export function createPayablesCommandOptions(): PayablesCommandOptions {
	return {
		authorization: createPayablesAuthorizationPort(),
	};
}
