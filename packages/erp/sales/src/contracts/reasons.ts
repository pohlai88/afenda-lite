export const SALES_REASONS = [
	"SALES_VALIDATION_FAILED",
	"SALES_NOT_FOUND",
	"SALES_DUPLICATE_CODE",
	"SALES_IDEMPOTENCY_CONFLICT",
	"SALES_VERSION_CONFLICT",
	"SALES_INVALID_STATE",
	"SALES_BLOCKING_HOLD",
	"SALES_MASTER_NOT_USABLE",
	"SALES_PRICE_NOT_FOUND",
	"SALES_PRICE_OVERRIDE_REQUIRES_APPROVAL",
	"SALES_INTEGRATION_REJECTED",
] as const;
export type SalesReason = (typeof SALES_REASONS)[number];
export interface SalesFailureDetails {
	fieldErrors?: Record<string, string[] | undefined>;
	reason: SalesReason;
	[key: string]: unknown;
}
