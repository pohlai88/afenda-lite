import type { Result } from "@afenda/errors/result";
import type { ReceivablesEventType } from "@afenda/events/schemas";

export type ReceivablesEvent = {
	type: ReceivablesEventType;
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	payload: Record<string, unknown>;
};

export type ReceivablesEffects = {
	emit(event: ReceivablesEvent): Promise<Result<void>>;
};

export type InvoiceableSalesOrderLine = {
	salesOrderLineId: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	authorizedQuantity: string;
	remainingInvoiceableQuantity: string;
};

export type InvoiceableSalesOrder = {
	salesOrderId: string;
	status: string;
	customerPartyId: string;
	customerPartyCode: string;
	customerPartyName: string;
	currencyCode: string;
	lines: InvoiceableSalesOrderLine[];
};

export type InvoiceableDeliveryLine = {
	deliveryLineId: string;
	salesOrderLineId: string | null;
	itemId: string;
	itemCode: string;
	itemName: string;
	authorizedQuantity: string;
	remainingInvoiceableQuantity: string;
};

export type InvoiceableDelivery = {
	deliveryId: string;
	status: string;
	salesOrderId: string | null;
	customerPartyId: string;
	customerPartyCode: string;
	customerPartyName: string;
	lines: InvoiceableDeliveryLine[];
};

export type SalesInvoiceSourceQueryPort = {
	getInvoiceableSalesOrder(input: {
		organizationId: string;
		salesOrderId: string;
		actorUserId: string;
	}): Promise<Result<InvoiceableSalesOrder | null>>;
};

export type DeliveryInvoiceSourceQueryPort = {
	getInvoiceableDelivery(input: {
		organizationId: string;
		deliveryId: string;
		actorUserId: string;
	}): Promise<Result<InvoiceableDelivery | null>>;
};

export type PaymentApplicationQueryPort = {
	getInstructionAvailability(input: {
		organizationId: string;
		paymentId: string;
		paymentApplicationInstructionId: string;
		actorUserId: string;
	}): Promise<
		Result<{
			paymentStatus: string;
			instructionStatus: string;
			currencyCode: string;
			availableAmount: string;
			targetDocumentId: string;
		} | null>
	>;
};
