import { ok, type Result } from "@afenda/errors/result";
import {
	getOrganizationDimensionEffective,
	getPartyAddressById,
	getPartyById,
	getRefCountryByCode,
	getRefCurrencyByCode,
	type OrganizationDimensionReference,
	type Party,
	type PartyAddress,
	type RefCountry,
	type RefCurrency,
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
		async getPartyAddressById(
			input,
		): Promise<Result<PartyAddress | null>> {
			return getPartyAddressById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					partyId: input.partyId,
					id: input.partyAddressId,
				},
				{ authorization: masterAuthorization },
			);
		},
		async getCountryByCode(input): Promise<Result<RefCountry | null>> {
			return getRefCountryByCode(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					code: input.code,
				},
				{ authorization: masterAuthorization },
			);
		},
		async getCurrencyByCode(input): Promise<Result<RefCurrency | null>> {
			return getRefCurrencyByCode(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					code: input.code,
				},
				{ authorization: masterAuthorization },
			);
		},
	};
}
