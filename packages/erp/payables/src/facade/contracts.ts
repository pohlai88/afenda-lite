import type { PayablesStore } from "../composition/store/contract";
import type { PayablesEffects } from "../kernel/contracts/effects";
import type {
	GoodsReceiptMatchQueryPort,
	PostedPaymentQueryPort,
	PurchaseOrderMatchQueryPort,
} from "../kernel/contracts/ports";
import type { PayablesAuthorizationPort } from "../kernel/execution/authorization";

export interface PayablesCommandOptions {
	authorization?: PayablesAuthorizationPort;
	effects?: PayablesEffects;
	goodsReceiptMatch?: GoodsReceiptMatchQueryPort;
	postedPayment?: PostedPaymentQueryPort;
	purchaseOrderMatch?: PurchaseOrderMatchQueryPort;
	store?: PayablesStore;
}
