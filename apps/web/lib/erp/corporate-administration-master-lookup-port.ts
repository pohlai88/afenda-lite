import { ok, type Result } from "@afenda/errors/result";
import {
	getOrganizationDimensionEffective,
	getPartyById,
	type OrganizationDimensionReference,
	type Party,
} from "@afenda/master-data";

import type { CorporateAdministrationMasterLookupPort } from "@afenda/corporate-administration";

import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

export function createCorporateAdministrationMasterLookupPort(): CorporateAdministrationMasterLookupPort {
	const masterAuthorization = createMasterDataAuthorizationPort();
	return {
		async getEffectiveLegalEntity(input): Promise<
			Result<OrganizationDimensionReference | null>
		> {
			return getOrganizationDimensionEffective(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					kind: "legal_entity",
					id: input.id,
					asOf: input.asOf,
				},
				{ authorization: masterAuthorization },
			);
		},
		async getPartyById(input): Promise<Result<Party | null>> {
			const result = await getPartyById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					partyId: input.partyId,
				},
				{ authorization: masterAuthorization },
			);
			if (!result.ok) return result;
			return ok(result.data);
		},
	};
}
