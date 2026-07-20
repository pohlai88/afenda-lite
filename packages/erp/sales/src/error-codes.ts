/**
 * Sales-owned semantic error codes — package authority.
 * Platform `Result` still uses `@afenda/errors` ErrorCode; attach these via details.salesCode.
 */

export const SALES_ERROR_ORDER_NOT_FOUND = "sales.order.not_found" as const;
export const SALES_ERROR_ORDER_ALREADY_POSTED =
	"sales.order.already_posted" as const;
export const SALES_ERROR_ORDER_ALREADY_CANCELLED =
	"sales.order.already_cancelled" as const;
export const SALES_ERROR_ORDER_VERSION_CONFLICT =
	"sales.order.version_conflict" as const;
export const SALES_ERROR_ORDER_NOT_DRAFT = "sales.order.not_draft" as const;
export const SALES_ERROR_ORDER_EMPTY_LINES = "sales.order.empty_lines" as const;
export const SALES_ERROR_CUSTOMER_NOT_ELIGIBLE =
	"sales.customer.not_eligible" as const;
export const SALES_ERROR_PARTY_INACTIVE = "sales.party.inactive" as const;
export const SALES_ERROR_ITEM_NOT_SELLABLE = "sales.item.not_sellable" as const;
export const SALES_ERROR_PAYMENT_TERM_INACTIVE =
	"sales.payment_term.inactive" as const;
export const SALES_ERROR_IDEMPOTENCY_CONFLICT =
	"sales.idempotency.conflict" as const;
export const SALES_ERROR_CODE_CONFLICT = "sales.order.code_conflict" as const;

export const SALES_ERROR_CODES = [
	SALES_ERROR_ORDER_NOT_FOUND,
	SALES_ERROR_ORDER_ALREADY_POSTED,
	SALES_ERROR_ORDER_ALREADY_CANCELLED,
	SALES_ERROR_ORDER_VERSION_CONFLICT,
	SALES_ERROR_ORDER_NOT_DRAFT,
	SALES_ERROR_ORDER_EMPTY_LINES,
	SALES_ERROR_CUSTOMER_NOT_ELIGIBLE,
	SALES_ERROR_PARTY_INACTIVE,
	SALES_ERROR_ITEM_NOT_SELLABLE,
	SALES_ERROR_PAYMENT_TERM_INACTIVE,
	SALES_ERROR_IDEMPOTENCY_CONFLICT,
	SALES_ERROR_CODE_CONFLICT,
] as const;

export type SalesErrorCode = (typeof SALES_ERROR_CODES)[number];

export function salesErrorDetails(salesCode: SalesErrorCode): {
	salesCode: SalesErrorCode;
} {
	return { salesCode };
}
