import { ok, type Result } from "@afenda/errors/result";
import type {
	OrganizationDimensionReference,
	Party,
	PartyAddress,
	RefCountry,
	RefCurrency,
} from "@afenda/master-data";

import type { CorporateAdministrationMasterLookupPort } from "../../src/ports";

type MemoryLegalEntityDimension = OrganizationDimensionReference & {
	organizationId: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

export function seedLegalEntityDimension(
	id: string,
	key: string,
	name: string,
	options: {
		organizationId?: string;
		effectiveFrom?: string;
		effectiveTo?: string | null;
	} = {},
): MemoryLegalEntityDimension {
	return {
		id,
		kind: "legal_entity",
		key,
		name,
		organizationId: options.organizationId ?? "org-a",
		effectiveFrom: options.effectiveFrom ?? "1900-01-01",
		effectiveTo: options.effectiveTo ?? null,
	};
}

export function seedOrganizationParty(
	organizationId: string,
	id: string,
	code: string,
	status: Party["status"] = "active",
): Party {
	const now = new Date();
	return {
		id,
		organizationId,
		code,
		normalizedCode: code.toLowerCase(),
		name: `Party ${code}`,
		status,
		version: 1,
		createdBy: "test",
		updatedBy: "test",
		activatedAt: status === "active" ? now : null,
		activatedBy: status === "active" ? "test" : null,
		retiredAt: null,
		retiredBy: null,
		createdAt: now,
		updatedAt: now,
		partyKind: "organization",
		legalName: null,
		tradingName: null,
		registrationNumber: null,
		registrationCountryId: null,
		preferredLanguageId: null,
		defaultCurrencyId: null,
		mergedIntoId: null,
		blockedAt: null,
		blockedBy: null,
	};
}

export function createMemoryCaMasterLookup(input: {
	dimensions: MemoryLegalEntityDimension[];
	parties: Party[];
	addresses?: PartyAddress[];
	countries?: RefCountry[];
	currencies?: RefCurrency[];
}): CorporateAdministrationMasterLookupPort {
	return {
		async getEffectiveLegalEntity({
			organizationId,
			id,
			asOf,
		}): Promise<Result<OrganizationDimensionReference | null>> {
			const match = input.dimensions.find(
				(row) =>
					row.organizationId === organizationId &&
					row.id === id &&
					row.kind === "legal_entity" &&
					row.effectiveFrom <= asOf &&
					(row.effectiveTo === null || row.effectiveTo >= asOf),
			);
			return ok(match ?? null);
		},
		async getPartyById({ organizationId, partyId }) {
			const match = input.parties.find(
				(row) => row.organizationId === organizationId && row.id === partyId,
			);
			return ok(match ?? null);
		},
		async getPartyAddressById({ organizationId, partyId, partyAddressId }) {
			const match = input.addresses?.find(
				(row) =>
					row.organizationId === organizationId &&
					row.partyId === partyId &&
					row.id === partyAddressId,
			);
			return ok(match ?? null);
		},
		async getCountryByCode({ code }) {
			const match = input.countries?.find(
				(row) => row.active && row.code === code.toUpperCase(),
			);
			return ok(match ?? null);
		},
		async getCurrencyByCode({ code }) {
			const match = input.currencies?.find(
				(row) => row.active && row.code === code.toUpperCase(),
			);
			return ok(match ?? null);
		},
	};
}
