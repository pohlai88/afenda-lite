export const PAYMENTS_ERROR_PAYMENT_NOT_FOUND =
	"payments.payment.not_found" as const;
export const PAYMENTS_ERROR_ACCOUNT_NOT_FOUND =
	"payments.account.not_found" as const;
export const PAYMENTS_ERROR_IDEMPOTENCY_CONFLICT =
	"payments.idempotency.conflict" as const;
export const PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND =
	"payments.application_instruction.not_found" as const;
export const PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY =
	"payments.availability.insufficient" as const;
export const PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED =
	"payments.refund.limit_exceeded" as const;
export const PAYMENTS_ERROR_TRANSFER_INVALID =
	"payments.transfer.invalid" as const;
export const PAYMENTS_ERROR_CODES = [
	PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
	PAYMENTS_ERROR_ACCOUNT_NOT_FOUND,
	PAYMENTS_ERROR_IDEMPOTENCY_CONFLICT,
	PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
	PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY,
	PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
	PAYMENTS_ERROR_TRANSFER_INVALID,
] as const;
export type PaymentsErrorCode = (typeof PAYMENTS_ERROR_CODES)[number];
export function paymentsErrorDetails(paymentsCode: PaymentsErrorCode) {
	return { paymentsCode };
}
