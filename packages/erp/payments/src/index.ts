import "server-only";

export type { PaymentsStore } from "./composition/store/contract";
export {
	addPaymentApplicationInstruction,
	createAndPostPaymentTransfer,
	createDraftPayment,
	createPaymentAccount,
	createPaymentMethod,
	deactivatePaymentMethod,
	getPaymentApplicationAvailability,
	getPaymentById,
	listPaymentAccounts,
	listPaymentMethods,
	listPayments,
	markApplicationInstructionApplied,
	markApplicationInstructionRejected,
	postPayment,
	postRefund,
	reversePayment,
	seedDefaultPaymentMethods,
	updateInstrumentClearance,
	updatePaymentMethod,
} from "./facade/capabilities";
export type { PaymentsCommandOptions } from "./facade/contracts";
export * from "./features/application-instructions/instructions.schema";
export * from "./features/payment-accounts/accounts.schema";
export * from "./features/payment-lifecycle/lifecycle.schema";
export * from "./features/payment-methods/methods.schema";
export {
	type PaymentMatchingProjection,
	paymentMatchingProjection,
	reconcilePayments,
} from "./features/reconciliation/reconcile";
export type {
	InstrumentClearanceStatus,
	InstrumentRequirement,
	Payment,
	PaymentAccount,
	PaymentAccountKind,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentDeduction,
	PaymentDeductionEffect,
	PaymentDeductionKind,
	PaymentDirection,
	PaymentFxContext,
	PaymentInstrument,
	PaymentInstrumentKind,
	PaymentMethod,
	PaymentMethodKind,
	PaymentMethodSnapshot,
	PaymentPurpose,
	PaymentStatus,
	RefundSource,
} from "./kernel/contracts/domain";
export type { PaymentsEffects } from "./kernel/contracts/effects";
export type { PaymentsAuthorizationPort } from "./kernel/execution/authorization";
export * from "./kernel/execution/permissions";
export { money } from "./kernel/validation/common.schema";
