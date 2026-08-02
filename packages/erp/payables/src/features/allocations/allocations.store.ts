import type { Result } from "@afenda/errors";

import type { SupplierAllocation } from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";

export interface PayablesAllocationsStore {
	applyCredit: (record: {
		organizationId: string;
		invoiceId: string;
		creditNoteId: string;
		amount: string;
		actorUserId: string;
		correlationId: string;
		idempotencyKey: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation>>;
	applyPayment: (record: {
		organizationId: string;
		invoiceId: string;
		amount: string;
		paymentId: string;
		paymentApplicationInstructionId: string;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation>>;
	reversePaymentApplication: (record: {
		organizationId: string;
		paymentId: string;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierAllocation[]>>;
}
