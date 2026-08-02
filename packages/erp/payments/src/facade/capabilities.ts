import type { Result } from "@afenda/errors";

import { resolvePaymentsStore } from "../composition/store/resolve-store";
import {
	addPaymentApplicationInstructionOperation,
	getPaymentApplicationAvailabilityOperation,
	markApplicationInstructionAppliedOperation,
	markApplicationInstructionRejectedOperation,
} from "../features/application-instructions/instructions.operations";
import {
	createPaymentAccountOperation,
	listPaymentAccountsOperation,
} from "../features/payment-accounts/accounts.operations";
import {
	createAndPostPaymentTransferOperation,
	createDraftPaymentOperation,
	getPaymentByIdOperation,
	listPaymentsOperation,
	postPaymentOperation,
	postRefundOperation,
	reversePaymentOperation,
	updateInstrumentClearanceOperation,
} from "../features/payment-lifecycle/lifecycle.operations";
import {
	createPaymentMethodOperation,
	deactivatePaymentMethodOperation,
	listPaymentMethodsOperation,
	seedDefaultPaymentMethods as seedDefaultPaymentMethodsOperation,
	updatePaymentMethodOperation,
} from "../features/payment-methods/methods.operations";
import type {
	Payment,
	PaymentAccount,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentMethod,
} from "../kernel/contracts/domain";
import type { PaymentsCommandOptions } from "./contracts";

function lifecycleDeps(options: PaymentsCommandOptions) {
	const store = resolvePaymentsStore(options.store);
	return {
		authorization: options.authorization,
		store,
		accounts: store,
		methods: store,
	};
}

export function createPaymentMethod(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentMethod>> {
	return createPaymentMethodOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function updatePaymentMethod(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentMethod>> {
	return updatePaymentMethodOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function deactivatePaymentMethod(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentMethod>> {
	return deactivatePaymentMethodOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function listPaymentMethods(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentMethod[]>> {
	return listPaymentMethodsOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function seedDefaultPaymentMethods(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentMethod[]>> {
	return seedDefaultPaymentMethodsOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function createPaymentAccount(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentAccount>> {
	return createPaymentAccountOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function listPaymentAccounts(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentAccount[]>> {
	return listPaymentAccountsOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function createDraftPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return createDraftPaymentOperation(input, lifecycleDeps(options));
}

export function addPaymentApplicationInstruction(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	return addPaymentApplicationInstructionOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function postPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return postPaymentOperation(input, lifecycleDeps(options));
}

export function reversePayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return reversePaymentOperation(input, lifecycleDeps(options));
}

export function createAndPostPaymentTransfer(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
	return createAndPostPaymentTransferOperation(input, lifecycleDeps(options));
}

export function postRefund(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return postRefundOperation(input, lifecycleDeps(options));
}

export function updateInstrumentClearance(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return updateInstrumentClearanceOperation(input, lifecycleDeps(options));
}

export function markApplicationInstructionApplied(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	return markApplicationInstructionAppliedOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function markApplicationInstructionRejected(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	return markApplicationInstructionRejectedOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function getPaymentById(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment | null>> {
	return getPaymentByIdOperation(input, lifecycleDeps(options));
}

export function listPayments(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment[]>> {
	return listPaymentsOperation(input, lifecycleDeps(options));
}

export function getPaymentApplicationAvailability(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationAvailability>> {
	return getPaymentApplicationAvailabilityOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}
