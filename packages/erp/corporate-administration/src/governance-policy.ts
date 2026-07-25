import { ok } from "@afenda/errors/result";

import type { CorporateAdministrationGovernancePolicyPort } from "./ports";

/**
 * Generic multi-jurisdiction policy. Universal overlap and tenancy invariants
 * stay in the domain; jurisdiction adapters may add exclusive-role rules.
 */
export function createGenericGovernancePolicy(): CorporateAdministrationGovernancePolicyPort {
	return {
		async validateOfficerAppointment() {
			return ok(undefined);
		},
	};
}
