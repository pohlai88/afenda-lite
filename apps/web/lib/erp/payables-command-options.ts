import type { PayablesCommandOptions } from "@afenda/payables";

import { createPayablesAuthorizationPort } from "@/lib/erp/payables-authorization-port";
import {
	createGoodsReceiptMatchQueryPort,
	createPurchaseOrderMatchQueryPort,
} from "@/lib/erp/payables-match-ports";
import { createPostedPaymentQueryPort } from "@/lib/erp/payables-posted-payment-port";

/**
 * Composition-root options for `@afenda/payables` public APIs.
 * Match and payment ports are actor-scoped for peer package reads.
 */
export function createPayablesCommandOptions(
	actorUserId: string,
): PayablesCommandOptions {
	return {
		authorization: createPayablesAuthorizationPort(),
		postedPayment: createPostedPaymentQueryPort(actorUserId),
		purchaseOrderMatch: createPurchaseOrderMatchQueryPort(actorUserId),
		goodsReceiptMatch: createGoodsReceiptMatchQueryPort(actorUserId),
	};
}
