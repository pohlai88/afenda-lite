"use server";

import {
	runTaxRegistrationLifecycle,
	type TaxRegistrationLifecycleActionState,
} from "@/app/actions/tax-registration-lifecycle";

export type {
	TaxRegistrationLifecycleActionData as RestoreTaxRegistrationActionData,
	TaxRegistrationLifecycleActionState as RestoreTaxRegistrationActionState,
} from "@/app/actions/tax-registration-lifecycle";

/**
 * Master-data tax registration restore — `expectedVersion` CAS + `master_data.manage`.
 */
export async function restoreTaxRegistrationAction(
	_prev: TaxRegistrationLifecycleActionState,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	return runTaxRegistrationLifecycle("restore", formData);
}
