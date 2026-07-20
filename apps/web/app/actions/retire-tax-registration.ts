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
 * Master-data tax registration retire — `expectedVersion` CAS + `master_data.manage`.
 */
export async function retireTaxRegistrationAction(
	_prev: TaxRegistrationLifecycleActionState,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	return runTaxRegistrationLifecycle("retire", formData);
}
