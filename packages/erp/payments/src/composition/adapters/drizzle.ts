import { createDrizzleApplicationInstructionMethods } from "../../features/application-instructions/instructions.drizzle";
import { drizzlePaymentAccountMethods } from "../../features/payment-accounts/accounts.drizzle";
import { drizzlePaymentLifecycleMethods } from "../../features/payment-lifecycle/lifecycle.drizzle";
import { composeStoreSlices } from "../store/compose-slices";
import type { PaymentsStore } from "../store/contract";

export type DrizzlePaymentsStore = PaymentsStore;

export function createDrizzlePaymentsStore(): DrizzlePaymentsStore {
	return composeStoreSlices(
		drizzlePaymentAccountMethods,
		drizzlePaymentLifecycleMethods,
		createDrizzleApplicationInstructionMethods({
			getPaymentById: drizzlePaymentLifecycleMethods.getById,
		}),
	) satisfies PaymentsStore;
}
