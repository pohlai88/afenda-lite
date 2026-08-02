import type { Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
} from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";

export interface PayablesCreditNotesStore {
	addCreditLine: (record: {
		organizationId: string;
		creditNoteId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}) => Promise<Result<SupplierInvoiceLine>>;
	createCredit: (
		record: SupplierInvoiceCreateRecord,
	) => Promise<Result<SupplierInvoice>>;
	postCredit: (record: {
		organizationId: string;
		creditNoteId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
}
