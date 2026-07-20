import type { Result } from "@afenda/errors/result";

import type { ReceivablesEffects } from "./ports";
import type {
	CustomerAging,
	CustomerAllocation,
	CustomerBalance,
	SalesCreditNote,
	SalesInvoice,
	SalesInvoiceLine,
	SalesInvoiceSource,
	SalesInvoiceStatus,
} from "./types";

export type InvoiceCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	invoiceSource: SalesInvoiceSource;
	customerId: string;
	customerCode: string;
	customerName: string;
	currencyCode: string;
	salesOrderId: string | null;
	deliveryId: string | null;
	invoiceDate: Date | null;
	accountingDate: Date | null;
	dueDate: Date | null;
	paymentTermCode: string | null;
	paymentTermDescription: string | null;
	manualReason: string | null;
	idempotencyKey: string;
	actorUserId: string;
};

export type ReceivablesStore = {
	createInvoice(record: InvoiceCreateRecord): Promise<Result<SalesInvoice>>;
	addLine(record: {
		organizationId: string;
		invoiceId: string;
		itemId: string;
		itemCode: string;
		itemName: string;
		description: string;
		quantity: string;
		unitPrice: string;
		salesOrderLineId: string | null;
		deliveryLineId: string | null;
		idempotencyKey: string;
		actorUserId: string;
	}): Promise<Result<SalesInvoiceLine>>;
	postInvoice(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
		sourceLineChecks?: Array<{
			salesOrderLineId: string | null;
			deliveryLineId: string | null;
			quantity: string;
			remainingInvoiceableQuantity: string;
		}>;
	}): Promise<Result<SalesInvoice>>;
	issueCredit(record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		salesInvoiceId: string;
		customerId: string;
		customerCode: string;
		customerName: string;
		currencyCode: string;
		amount: string;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<SalesCreditNote>>;
	applyReceipt(record: {
		organizationId: string;
		invoiceId: string;
		amount: string;
		paymentId: string;
		paymentApplicationInstructionId: string;
		expectedInvoiceVersion: number;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<CustomerAllocation>>;
	reverseReceiptApplication(record: {
		organizationId: string;
		allocationId: string;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<CustomerAllocation>>;
	reverseAllocationsByPayment(record: {
		organizationId: string;
		paymentId: string;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<CustomerAllocation[]>>;
	cancelDraft(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<SalesInvoice>>;
	closeInvoice(record: {
		organizationId: string;
		invoiceId: string;
		expectedVersion: number;
		idempotencyKey: string;
		actorUserId: string;
		correlationId: string;
		effects: ReceivablesEffects;
	}): Promise<Result<SalesInvoice>>;
	getById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesInvoice | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: SalesInvoiceStatus;
	}): Promise<Result<SalesInvoice[]>>;
	getBalance(
		organizationId: string,
		customerId: string,
		currencyCode?: string,
	): Promise<Result<CustomerBalance[]>>;
	getAging(input: {
		organizationId: string;
		customerId: string;
		currencyCode: string;
		asOfDate: string;
	}): Promise<Result<CustomerAging>>;
	sumPostedQuantityForSourceLine(input: {
		organizationId: string;
		salesOrderLineId?: string;
		deliveryLineId?: string;
		excludeInvoiceId?: string;
	}): Promise<Result<string>>;
	listPostedFactsForReconcile(organizationId: string): Promise<
		Result<{
			invoices: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				totalAmount: string;
				status: SalesInvoiceStatus;
			}>;
			credits: Array<{
				id: string;
				customerId: string;
				currencyCode: string;
				amount: string;
				status: string;
			}>;
			allocations: Array<{
				id: string;
				customerId: string;
				invoiceId: string;
				amount: string;
				status: string;
			}>;
			balances: CustomerBalance[];
		}>
	>;
};
