import type { PaymentsCommandOptions } from "@afenda/payments";

import { createPaymentsAuthorizationPort } from "@/lib/erp/payments-authorization-port";

/** Composition-root options for `@afenda/payments` public APIs. */
export function createPaymentsCommandOptions(): PaymentsCommandOptions {
	return {
		authorization: createPaymentsAuthorizationPort(),
	};
}
