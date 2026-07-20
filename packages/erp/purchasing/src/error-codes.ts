/**
 * Purchasing-owned semantic error codes — package authority.
 * Platform `Result` still uses `@afenda/errors` ErrorCode; attach these via details.purchasingCode.
 */

export const PURCHASING_ERROR_ORDER_NOT_FOUND =
	"purchasing.order.not_found" as const;
export const PURCHASING_ERROR_ORDER_ALREADY_POSTED =
	"purchasing.order.already_posted" as const;
export const PURCHASING_ERROR_ORDER_ALREADY_CANCELLED =
	"purchasing.order.already_cancelled" as const;
export const PURCHASING_ERROR_ORDER_ALREADY_CLOSED =
	"purchasing.order.already_closed" as const;
export const PURCHASING_ERROR_ORDER_VERSION_CONFLICT =
	"purchasing.order.version_conflict" as const;
export const PURCHASING_ERROR_ORDER_NOT_DRAFT =
	"purchasing.order.not_draft" as const;
export const PURCHASING_ERROR_ORDER_NOT_POSTED =
	"purchasing.order.not_posted" as const;
export const PURCHASING_ERROR_ORDER_EMPTY_LINES =
	"purchasing.order.empty_lines" as const;
export const PURCHASING_ERROR_SUPPLIER_NOT_ELIGIBLE =
	"purchasing.supplier.not_eligible" as const;
export const PURCHASING_ERROR_ITEM_NOT_PURCHASABLE =
	"purchasing.item.not_purchasable" as const;
export const PURCHASING_ERROR_IDEMPOTENCY_CONFLICT =
	"purchasing.idempotency.conflict" as const;
export const PURCHASING_ERROR_CODE_CONFLICT =
	"purchasing.order.code_conflict" as const;
export const PURCHASING_ERROR_COMMITMENT_PORT_REQUIRED =
	"purchasing.order.commitment_port_required" as const;

export const PURCHASING_ERROR_CODES = [
	PURCHASING_ERROR_ORDER_NOT_FOUND,
	PURCHASING_ERROR_ORDER_ALREADY_POSTED,
	PURCHASING_ERROR_ORDER_ALREADY_CANCELLED,
	PURCHASING_ERROR_ORDER_ALREADY_CLOSED,
	PURCHASING_ERROR_ORDER_VERSION_CONFLICT,
	PURCHASING_ERROR_ORDER_NOT_DRAFT,
	PURCHASING_ERROR_ORDER_NOT_POSTED,
	PURCHASING_ERROR_ORDER_EMPTY_LINES,
	PURCHASING_ERROR_SUPPLIER_NOT_ELIGIBLE,
	PURCHASING_ERROR_ITEM_NOT_PURCHASABLE,
	PURCHASING_ERROR_IDEMPOTENCY_CONFLICT,
	PURCHASING_ERROR_CODE_CONFLICT,
	PURCHASING_ERROR_COMMITMENT_PORT_REQUIRED,
] as const;

export type PurchasingErrorCode = (typeof PURCHASING_ERROR_CODES)[number];

export function purchasingErrorDetails(purchasingCode: PurchasingErrorCode): {
	purchasingCode: PurchasingErrorCode;
} {
	return { purchasingCode };
}
