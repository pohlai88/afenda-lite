import { composeStoreSlices } from "../composition/store/compose-slices";
import type { PaymentsStore } from "../composition/store/contract";
import { createMemoryApplicationInstructionMethods } from "../features/application-instructions/instructions.memory";
import { createMemoryPaymentAccountMethods } from "../features/payment-accounts/accounts.memory";
import { createMemoryPaymentLifecycleMethods } from "../features/payment-lifecycle/lifecycle.memory";
import { createMemoryPaymentMethodMethods } from "../features/payment-methods/methods.memory";
import type {
	Payment,
	PaymentAccount,
	PaymentMethod,
} from "../kernel/contracts/domain";

interface MemoryPaymentsState {
	accounts: Map<string, PaymentAccount>;
	methods: Map<string, PaymentMethod>;
	mutationKeys: Map<string, string>;
	payments: Map<string, Payment>;
}

function createMemoryPaymentsState(): MemoryPaymentsState {
	return {
		accounts: new Map(),
		methods: new Map(),
		mutationKeys: new Map(),
		payments: new Map(),
	};
}

export type MemoryPaymentsStore = PaymentsStore;

export function createMemoryPaymentsStore(): MemoryPaymentsStore {
	const state = createMemoryPaymentsState();
	return composeStoreSlices(
		createMemoryPaymentAccountMethods(state),
		createMemoryPaymentMethodMethods(state),
		createMemoryPaymentLifecycleMethods(state),
		createMemoryApplicationInstructionMethods(state),
	) satisfies PaymentsStore;
}
