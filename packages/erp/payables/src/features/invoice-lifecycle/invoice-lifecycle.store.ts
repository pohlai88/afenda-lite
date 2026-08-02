import type { Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
	ThreeWayMatchEvidence,
	ThreeWayMatchStatus,
} from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";

export interface PayablesInvoiceLifecycleStore {
	addLine: (record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		description: string;
		quantity: string;
		unitPrice: string;
		actorUserId: string;
	}) => Promise<Result<SupplierInvoiceLine>>;
	cancel: (record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	createInvoice: (
		record: SupplierInvoiceCreateRecord,
	) => Promise<Result<SupplierInvoice>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<SupplierInvoice | null>>;
	list: (filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: SupplierInvoiceStatus | undefined;
		supplierId?: string | undefined;
		currencyCode?: string | undefined;
		documentType?: SupplierInvoice["documentType"] | undefined;
	}) => Promise<Result<SupplierInvoice[]>>;
	matchInvoice: (record: {
		organizationId: string;
		invoiceId: string;
		purchaseOrderId: string;
		goodsReceiptId: string;
		matchStatus: ThreeWayMatchStatus;
		evidence: ThreeWayMatchEvidence;
		purchaseOrderVersion: number;
		goodsReceiptVersion: number;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
	postInvoice: (record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: PayablesEffects;
	}) => Promise<Result<SupplierInvoice>>;
}
