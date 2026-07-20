"use server";

import {
	runTaxRegistrationLifecycle,
	type TaxRegistrationLifecycleActionState,
} from "@/app/actions/tax-registration-lifecycle";

export type {
	TaxRegistrationLifecycleActionData as ActivateTaxRegistrationActionData,
	TaxRegistrationLifecycleActionState as ActivateTaxRegistrationActionState,
} from "@/app/actions/tax-registration-lifecycle";

/**
 * Master-data tax registration activate — `expectedVersion` CAS + `master_data.manage`.
 */
export async function activateTaxRegistrationAction(
	_prev: TaxRegistrationLifecycleActionState,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	return runTaxRegistrationLifecycle("activate", formData);
}
