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
 * Master-data payment term retire — package-authorized `expectedVersion` CAS.
 */
export async function retirePaymentTermAction(
	_prev: PaymentTermLifecycleActionState,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	return await runPaymentTermLifecycle("retire", formData);
}
