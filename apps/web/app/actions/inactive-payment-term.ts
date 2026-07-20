"use server";

import {
	type PaymentTermLifecycleActionState,
	runPaymentTermLifecycle,
} from "@/app/actions/payment-term-lifecycle";

export type {
	PaymentTermLifecycleActionData as InactivePaymentTermActionData,
	PaymentTermLifecycleActionState as InactivePaymentTermActionState,
} from "@/app/actions/payment-term-lifecycle";

/**
 * Master-data payment term inactive — `expectedVersion` CAS + `master_data.manage`.
 */
export async function inactivePaymentTermAction(
	_prev: PaymentTermLifecycleActionState,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	return runPaymentTermLifecycle("inactive", formData);
}
