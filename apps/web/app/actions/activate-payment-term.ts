"use server";

import {
	type PaymentTermLifecycleActionState,
	runPaymentTermLifecycle,
} from "@/app/actions/payment-term-lifecycle";

export type {
	PaymentTermLifecycleActionData as ActivatePaymentTermActionData,
	PaymentTermLifecycleActionState as ActivatePaymentTermActionState,
} from "@/app/actions/payment-term-lifecycle";

/**
 * Master-data payment term activate — package-authorized `expectedVersion` CAS.
 */
export async function activatePaymentTermAction(
	_prev: PaymentTermLifecycleActionState,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	return await runPaymentTermLifecycle("activate", formData);
}
