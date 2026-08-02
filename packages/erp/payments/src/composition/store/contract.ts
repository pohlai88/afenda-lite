import type { PaymentApplicationInstructionsStore } from "../../features/application-instructions/instructions.store";
import type { PaymentAccountsStore } from "../../features/payment-accounts/accounts.store";
import type { PaymentsLifecycleStore } from "../../features/payment-lifecycle/lifecycle.store";

export type { PaymentApplicationInstructionsStore } from "../../features/application-instructions/instructions.store";
export type { PaymentAccountsStore } from "../../features/payment-accounts/accounts.store";
export type {
	PaymentCreateRecord,
	PaymentsLifecycleStore,
} from "../../features/payment-lifecycle/lifecycle.store";

/** Composite package store: the intersection of every feature store slice. */
export type PaymentsStore = PaymentAccountsStore &
	PaymentsLifecycleStore &
	PaymentApplicationInstructionsStore;
