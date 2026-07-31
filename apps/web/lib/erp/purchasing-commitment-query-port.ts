import {
	database as afendaDatabase,
	and,
	eq,
	goodsReceipt,
	goodsReceiptLine,
	inArray,
	purchaseOrderLine,
	sql,
	supplierInvoice,
	supplierInvoiceLine,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	PurchaseOrderCommitmentQueryPort,
	PurchaseOrderCommitmentStatus,
} from "@afenda/purchasing";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

/**
 * Composition-root SQL adapter — purchasing package only sees the port interface.
 * Receipts: source_type = purchase_order, status posted|closed.
 * Invoices: purchase_order_id set, status matched|posted.
 */
export function createPurchasingCommitmentQueryPort(): PurchaseOrderCommitmentQueryPort {
	return {
		async getCommitmentStatus(input: {
			organizationId: string;
			purchaseOrderId: string;
		}): Promise<Result<PurchaseOrderCommitmentStatus>> {
			try {
				const [orderedRow] = await afendaDatabase.client
					.select({
						orderedQuantity: sql<string>`coalesce(sum(${purchaseOrderLine.quantity}::numeric), 0)::text`,
					})
					.from(purchaseOrderLine)
					.where(
						and(
							eq(purchaseOrderLine.organizationId, input.organizationId),
							eq(purchaseOrderLine.orderId, input.purchaseOrderId),
						),
					);

				const receiptHeaders = await afendaDatabase.client
					.select({ id: goodsReceipt.id, status: goodsReceipt.status })
					.from(goodsReceipt)
					.where(
						and(
							eq(goodsReceipt.organizationId, input.organizationId),
							eq(goodsReceipt.sourceType, "purchase_order"),
							eq(goodsReceipt.sourceId, input.purchaseOrderId),
							inArray(goodsReceipt.status, ["posted", "closed"]),
						),
					);

				const receiptIds = receiptHeaders.map((row) => row.id);
				let receivedQuantity = "0";
				if (receiptIds.length > 0) {
					const [receivedRow] = await afendaDatabase.client
						.select({
							receivedQuantity: sql<string>`coalesce(sum(${goodsReceiptLine.quantityReceived}::numeric), 0)::text`,
						})
						.from(goodsReceiptLine)
						.where(
							and(
								eq(goodsReceiptLine.organizationId, input.organizationId),
								inArray(goodsReceiptLine.goodsReceiptId, receiptIds),
							),
						);
					receivedQuantity = receivedRow?.receivedQuantity ?? "0";
				}

				const invoiceHeaders = await afendaDatabase.client
					.select({ id: supplierInvoice.id })
					.from(supplierInvoice)
					.where(
						and(
							eq(supplierInvoice.organizationId, input.organizationId),
							eq(supplierInvoice.purchaseOrderId, input.purchaseOrderId),
							inArray(supplierInvoice.status, ["matched", "posted"]),
						),
					);

				const invoiceIds = invoiceHeaders.map((row) => row.id);
				let invoicedQuantity = "0";
				if (invoiceIds.length > 0) {
					const [invoicedRow] = await afendaDatabase.client
						.select({
							invoicedQuantity: sql<string>`coalesce(sum(${supplierInvoiceLine.quantity}::numeric), 0)::text`,
						})
						.from(supplierInvoiceLine)
						.where(
							and(
								eq(supplierInvoiceLine.organizationId, input.organizationId),
								inArray(supplierInvoiceLine.invoiceId, invoiceIds),
							),
						);
					invoicedQuantity = invoicedRow?.invoicedQuantity ?? "0";
				}

				return errorResult.ok({
					orderedQuantity: orderedRow?.orderedQuantity ?? "0",
					receivedQuantity,
					invoicedQuantity,
					hasPostedReceipt: receiptHeaders.length > 0,
					hasPostedSupplierInvoice: invoiceHeaders.length > 0,
				});
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to load purchase order commitment status",
				);
			}
		},
	};
}
