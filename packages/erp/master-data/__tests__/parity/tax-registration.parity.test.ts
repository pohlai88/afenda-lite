import {
	createParty,
	createTaxRegistration,
	getTaxRegistration,
	updateTaxRegistration,
} from "../../src";
import type { TaxRegistrationProjection } from "../../src/capabilities/core-organization-masters/tax-registration-number";
import {
	createDrizzleHarness,
	createMemoryHarness,
	defineRootParityTests,
	type RootParityContract,
} from "./parity-harness";

const contract: RootParityContract<TaxRegistrationProjection> = {
	create: async (harness) => {
		const party = await createParty(
			{
				...harness.context(),
				code: "PARITY-TAX-PARTY",
				name: "Parity Tax Party",
				partyKind: "organization",
			},
			harness.options,
		);
		if (!party.ok) return party;
		return createTaxRegistration(
			{
				...harness.context(),
				partyId: party.data.id,
				jurisdictionCountryId: harness.countryId,
				registrationType: "vat_gst",
				registrationNumber: "PARITY-VAT-001",
			},
			harness.options,
		);
	},
	get: (harness, id, organizationId) =>
		getTaxRegistration(
			{ ...harness.queryContext(organizationId), id },
			harness.options,
		),
	update: (harness, row, expectedVersion) =>
		updateTaxRegistration(
			{
				...harness.context(),
				id: row.id,
				expectedVersion,
				name: "Parity Tax Updated",
			},
			harness.options,
		),
};

defineRootParityTests(
	"MemoryMasterDataStore tax registration",
	createMemoryHarness,
	contract,
);
defineRootParityTests(
	"DrizzleMasterDataStore tax registration",
	createDrizzleHarness,
	contract,
);
