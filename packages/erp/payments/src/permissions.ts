export const PAYMENTS_PERMISSION_PAYMENT_READ =
	"payments.payment.read" as const;
export const PAYMENTS_PERMISSION_PAYMENT_CREATE =
	"payments.payment.create" as const;
export const PAYMENTS_PERMISSION_PAYMENT_UPDATE =
	"payments.payment.update" as const;
export const PAYMENTS_PERMISSION_PAYMENT_POST =
	"payments.payment.post" as const;
export const PAYMENTS_PERMISSION_PAYMENT_REVERSE =
	"payments.payment.reverse" as const;
export const PAYMENTS_PERMISSION_REFUND_CREATE =
	"payments.refund.create" as const;
export const PAYMENTS_PERMISSION_REFUND_POST = "payments.refund.post" as const;
export const PAYMENTS_PERMISSION_TRANSFER_CREATE =
	"payments.transfer.create" as const;
export const PAYMENTS_PERMISSION_TRANSFER_POST =
	"payments.transfer.post" as const;
export const PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE =
	"payments.application_instruction.manage" as const;
export const PAYMENTS_PERMISSION_ACCOUNT_MANAGE =
	"payments.account.manage" as const;
export const PAYMENTS_PERMISSION_ACCOUNT_READ =
	"payments.account.read" as const;
export const PAYMENTS_PERMISSION_AVAILABILITY_READ =
	"payments.availability.read" as const;
export const PAYMENTS_PERMISSION_CODES = [
	PAYMENTS_PERMISSION_PAYMENT_READ,
	PAYMENTS_PERMISSION_PAYMENT_CREATE,
	PAYMENTS_PERMISSION_PAYMENT_UPDATE,
	PAYMENTS_PERMISSION_PAYMENT_POST,
	PAYMENTS_PERMISSION_PAYMENT_REVERSE,
	PAYMENTS_PERMISSION_REFUND_CREATE,
	PAYMENTS_PERMISSION_REFUND_POST,
	PAYMENTS_PERMISSION_TRANSFER_CREATE,
	PAYMENTS_PERMISSION_TRANSFER_POST,
	PAYMENTS_PERMISSION_APPLICATION_INSTRUCTION_MANAGE,
	PAYMENTS_PERMISSION_ACCOUNT_MANAGE,
	PAYMENTS_PERMISSION_ACCOUNT_READ,
	PAYMENTS_PERMISSION_AVAILABILITY_READ,
] as const;
export type PaymentsPermission = (typeof PAYMENTS_PERMISSION_CODES)[number];
