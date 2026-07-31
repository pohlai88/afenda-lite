"use server";

import {
	runTaxRegistrationLifecycle,
	type TaxRegistrationLifecycleActionState,
} from "@/app/actions/tax-registration-lifecycle";

export type {
	TaxRegistrationLifecycleActionData as RetireTaxRegistrationActionData,
	TaxRegistrationLifecycleActionState as RetireTaxRegistrationActionState,
} from "@/app/actions/tax-registration-lifecycle";

/**
 * Master-data tax registration retire — package-authorized `expectedVersion` CAS.
 */
export async function retireTaxRegistrationAction(
	_prev: TaxRegistrationLifecycleActionState,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	return await runTaxRegistrationLifecycle("retire", formData);
}
