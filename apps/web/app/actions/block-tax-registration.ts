"use server";

import {
	runTaxRegistrationLifecycle,
	type TaxRegistrationLifecycleActionState,
} from "@/app/actions/tax-registration-lifecycle";

export type {
	TaxRegistrationLifecycleActionData as BlockTaxRegistrationActionData,
	TaxRegistrationLifecycleActionState as BlockTaxRegistrationActionState,
} from "@/app/actions/tax-registration-lifecycle";

/**
 * Master-data tax registration block — `expectedVersion` CAS + `master_data.manage`.
 */
export async function blockTaxRegistrationAction(
	_prev: TaxRegistrationLifecycleActionState,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	return runTaxRegistrationLifecycle("block", formData);
}
