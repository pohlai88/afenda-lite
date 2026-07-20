/**
 * Receiving-owned semantic error codes — package authority.
 * Platform `Result` still uses `@afenda/errors` ErrorCode; attach via details.receivingCode.
 */

export const RECEIVING_ERROR_RECEIPT_NOT_FOUND =
	"receiving.receipt.not_found" as const;
export const RECEIVING_ERROR_RECEIPT_ALREADY_POSTED =
	"receiving.receipt.already_posted" as const;
export const RECEIVING_ERROR_RECEIPT_VERSION_CONFLICT =
	"receiving.receipt.version_conflict" as const;
export const RECEIVING_ERROR_PURCHASE_ORDER_NOT_RECEIVABLE =
	"receiving.purchase_order.not_receivable" as const;
export const RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE =
	"receiving.quantity.exceeds_tolerance" as const;
export const RECEIVING_ERROR_INVALID_PURCHASE_ORDER_LINE =
	"receiving.purchase_order_line.invalid" as const;
export const RECEIVING_ERROR_DISCREPANCY_INVALID =
	"receiving.discrepancy.invalid" as const;
export const RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL =
	"receiving.receipt.posted_cannot_cancel" as const;
export const RECEIVING_ERROR_DUPLICATE_SOURCE_POSTING =
	"receiving.source.duplicate" as const;
export const RECEIVING_ERROR_IDEMPOTENCY_CONFLICT =
	"receiving.idempotency.conflict" as const;
export const RECEIVING_ERROR_RECEIPT_ALREADY_REVERSED =
	"receiving.receipt.already_reversed" as const;
export const RECEIVING_ERROR_QUANTITY_SPLIT_INVALID =
	"receiving.quantity.split_invalid" as const;

export const RECEIVING_ERROR_CODES = [
	RECEIVING_ERROR_RECEIPT_NOT_FOUND,
	RECEIVING_ERROR_RECEIPT_ALREADY_POSTED,
	RECEIVING_ERROR_RECEIPT_VERSION_CONFLICT,
	RECEIVING_ERROR_PURCHASE_ORDER_NOT_RECEIVABLE,
	RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE,
	RECEIVING_ERROR_INVALID_PURCHASE_ORDER_LINE,
	RECEIVING_ERROR_DISCREPANCY_INVALID,
	RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL,
	RECEIVING_ERROR_DUPLICATE_SOURCE_POSTING,
	RECEIVING_ERROR_IDEMPOTENCY_CONFLICT,
	RECEIVING_ERROR_RECEIPT_ALREADY_REVERSED,
	RECEIVING_ERROR_QUANTITY_SPLIT_INVALID,
] as const;

export type ReceivingErrorCode = (typeof RECEIVING_ERROR_CODES)[number];

export function receivingErrorDetails(receivingCode: ReceivingErrorCode): {
	receivingCode: ReceivingErrorCode;
} {
	return { receivingCode };
}
