import type { CorporateAdministrationCommandOptions } from "@afenda/corporate-administration";

import { createCorporateAdministrationAuthorizationPort } from "@/lib/erp/corporate-administration-authorization-port";
import { createCorporateAdministrationMasterLookupPort } from "@/lib/erp/corporate-administration-master-lookup-port";

/** Composition-root options for `@afenda/corporate-administration` public APIs. */
export function createCorporateAdministrationCommandOptions(): CorporateAdministrationCommandOptions {
	return {
		authorization: createCorporateAdministrationAuthorizationPort(),
		masters: createCorporateAdministrationMasterLookupPort(),
	};
}
