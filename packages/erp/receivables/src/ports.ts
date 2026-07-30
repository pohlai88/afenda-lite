import type { Result } from "@afenda/errors/result";
import type { ReceivablesEventType } from "@afenda/events/schemas";

export interface ReceivablesEvent {
	actorUserId: string;
	correlationId: string;
	organizationId: string;
	payload: Record<string, unknown>;
	type: ReceivablesEventType;
}

export interface ReceivablesEffects {
	emit: (event: ReceivablesEvent) => Promise<Result<void>>;
}

export interface InvoiceableSalesOrderLine {
	authorizedQuantity: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	remainingInvoiceableQuantity: string;
	salesOrderLineId: string;
}

export interface InvoiceableSalesOrder {
	currencyCode: string;
	customerPartyCode: string;
	customerPartyId: string;
	customerPartyName: string;
	lines: InvoiceableSalesOrderLine[];
	salesOrderId: string;
	status: string;
}

export interface InvoiceableDeliveryLine {
	authorizedQuantity: string;
	deliveryLineId: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	remainingInvoiceableQuantity: string;
	salesOrderLineId: string | null;
}

export interface InvoiceableDelivery {
	customerPartyCode: string;
	customerPartyId: string;
	customerPartyName: string;
	deliveryId: string;
	lines: InvoiceableDeliveryLine[];
	salesOrderId: string | null;
	status: string;
}

export interface SalesInvoiceSourceQueryPort {
	getInvoiceableSalesOrder: (input: {
		organizationId: string;
		salesOrderId: string;
		actorUserId: string;
	}) => Promise<Result<InvoiceableSalesOrder | null>>;
}

export interface DeliveryInvoiceSourceQueryPort {
	getInvoiceableDelivery: (input: {
		organizationId: string;
		deliveryId: string;
		actorUserId: string;
	}) => Promise<Result<InvoiceableDelivery | null>>;
}

export interface PaymentApplicationQueryPort {
	getInstructionAvailability: (input: {
		organizationId: string;
		paymentId: string;
		paymentApplicationInstructionId: string;
		actorUserId: string;
	}) => Promise<
		Result<{
			paymentStatus: string;
			instructionStatus: string;
			currencyCode: string;
			availableAmount: string;
			targetDocumentId: string;
		} | null>
	>;
}
