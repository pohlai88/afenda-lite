"use server";

import {
	type PaymentTermLifecycleActionState,
	runPaymentTermLifecycle,
} from "@/app/actions/payment-term-lifecycle";

export type {
	PaymentTermLifecycleActionData as RetirePaymentTermActionData,
	PaymentTermLifecycleActionState as RetirePaymentTermActionState,
} from "@/app/actions/payment-term-lifecycle";

/**
 * Master-data payment term retire — `expectedVersion` CAS + `master_data.manage`.
 */
export async function retirePaymentTermAction(
	_prev: PaymentTermLifecycleActionState,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	return runPaymentTermLifecycle("retire", formData);
}
