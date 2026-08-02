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
} from "../features/payment-lifecycle/lifecycle.operations";
import type {
	Payment,
	PaymentAccount,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
} from "../kernel/contracts/domain";
import type { PaymentsCommandOptions } from "./contracts";

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
	return createDraftPaymentOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
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
	return postPaymentOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function reversePayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return reversePaymentOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function createAndPostPaymentTransfer(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
	return createAndPostPaymentTransferOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function postRefund(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	return postRefundOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
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
	return getPaymentByIdOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
}

export function listPayments(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment[]>> {
	return listPaymentsOperation(input, {
		authorization: options.authorization,
		store: resolvePaymentsStore(options.store),
	});
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
