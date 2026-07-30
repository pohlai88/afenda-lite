import { randomUUID } from "node:crypto";

import { describe, expect, expectTypeOf, it } from "vitest";
import {
	createParty,
	createPartyContact,
	createTaxRegistration,
	getSensitiveTaxRegistration,
	getTaxRegistration,
	listPartyContacts,
	listSensitivePartyContacts,
	type PartyContactProjection,
	type SensitivePartyContactProjection,
	type SensitiveTaxRegistrationProjection,
	type TaxRegistrationProjection,
} from "../src/index";
import { createMasterDataTestHarness } from "./helpers/harness";
import { createGrantingMasterAuthorization } from "./helpers/memory-authorization";

const COUNTRY_ID = "c1000000-0000-4000-8000-000000000001";

function context() {
	return {
		organizationId: "org-sensitive-projections",
		actorUserId: "user-sensitive-projections",
		correlationId: randomUUID(),
	};
}

describe("sensitive master-data projections", () => {
	it("enforces masked and sensitive tax-registration operations independently", async () => {
		const harness = createMasterDataTestHarness();
		const party = await createParty(
			{
				...context(),
				code: "SENSITIVE-TAX",
				name: "Sensitive Tax Party",
				partyKind: "organization",
			},
			harness.options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const created = await createTaxRegistration(
			{
				...context(),
				partyId: party.data.id,
				jurisdictionCountryId: COUNTRY_ID,
				registrationType: "vat_gst",
				registrationNumber: "MY-1234-5678",
			},
			harness.options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data).toMatchObject({
			maskedRegistrationNumber: "********5678",
		});
		expect(created.data).not.toHaveProperty("registrationNumber");
		expect(created.data).not.toHaveProperty("normalizedRegistrationNumber");

		const ordinaryAuthorization = createGrantingMasterAuthorization([
			"master_data.tax_registration_read",
		]);
		const sensitiveAuthorization = createGrantingMasterAuthorization([
			"master_data.tax_registration_sensitive_read",
		]);
		const input = {
			organizationId: context().organizationId,
			actorUserId: context().actorUserId,
			id: created.data.id,
		};

		const ordinary = await getTaxRegistration(input, {
			store: harness.store,
			authorization: ordinaryAuthorization,
		});
		expect(ordinary.ok).toBe(true);
		if (!ordinary.ok || ordinary.data === null) {
			return;
		}
		expect(ordinary.data.maskedRegistrationNumber).toBe("********5678");
		expect(ordinary.data).not.toHaveProperty("registrationNumber");

		const ordinaryWithSensitiveGrant = await getTaxRegistration(input, {
			store: harness.store,
			authorization: sensitiveAuthorization,
		});
		expect(ordinaryWithSensitiveGrant).toEqual(ordinary);

		const deniedSensitive = await getSensitiveTaxRegistration(input, {
			store: harness.store,
			authorization: ordinaryAuthorization,
		});
		expect(deniedSensitive.ok).toBe(false);
		if (!deniedSensitive.ok) {
			expect(deniedSensitive.code).toBe("FORBIDDEN");
		}

		const sensitive = await getSensitiveTaxRegistration(input, {
			store: harness.store,
			authorization: sensitiveAuthorization,
		});
		expect(sensitive.ok).toBe(true);
		if (!sensitive.ok || sensitive.data === null) {
			return;
		}
		expect(sensitive.data.registrationNumber).toBe("MY-1234-5678");
		expect(sensitive.data).not.toHaveProperty("normalizedRegistrationNumber");
	});

	it("enforces masked and sensitive party-contact operations independently", async () => {
		const harness = createMasterDataTestHarness();
		const party = await createParty(
			{
				...context(),
				code: "SENSITIVE-CONTACT",
				name: "Sensitive Contact Party",
				partyKind: "organization",
			},
			harness.options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const created = await createPartyContact(
			{
				...context(),
				partyId: party.data.id,
				contactType: "email",
				value: "person@example.com",
				label: "Primary",
				purpose: "billing",
				isPrimary: true,
			},
			harness.options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const ordinaryAuthorization = createGrantingMasterAuthorization([
			"master_data.party_contact_read",
		]);
		const sensitiveAuthorization = createGrantingMasterAuthorization([
			"master_data.party_contact_sensitive_read",
		]);
		const input = {
			organizationId: context().organizationId,
			actorUserId: context().actorUserId,
			parentId: party.data.id,
			page: 1,
			pageSize: 20,
		};

		const ordinary = await listPartyContacts(input, {
			...harness.options,
			authorization: ordinaryAuthorization,
		});
		expect(ordinary.ok).toBe(true);
		if (!ordinary.ok) {
			return;
		}
		expect(ordinary.data[0]?.maskedValue).toBe("**************.com");
		expect(ordinary.data[0]).not.toHaveProperty("value");
		expect(ordinary.data[0]).not.toHaveProperty("normalizedValue");

		const ordinaryWithSensitiveGrant = await listPartyContacts(input, {
			...harness.options,
			authorization: sensitiveAuthorization,
		});
		expect(ordinaryWithSensitiveGrant).toEqual(ordinary);

		const deniedSensitive = await listSensitivePartyContacts(input, {
			...harness.options,
			authorization: ordinaryAuthorization,
		});
		expect(deniedSensitive.ok).toBe(false);
		if (!deniedSensitive.ok) {
			expect(deniedSensitive.code).toBe("FORBIDDEN");
		}

		const sensitive = await listSensitivePartyContacts(input, {
			...harness.options,
			authorization: sensitiveAuthorization,
		});
		expect(sensitive.ok).toBe(true);
		if (!sensitive.ok) {
			return;
		}
		expect(sensitive.data[0]?.value).toBe("person@example.com");
		expect(sensitive.data[0]).not.toHaveProperty("normalizedValue");
	});

	it("excludes normalized sensitive values from public projection types", () => {
		expectTypeOf<TaxRegistrationProjection>().not.toHaveProperty(
			"normalizedRegistrationNumber",
		);
		expectTypeOf<SensitiveTaxRegistrationProjection>().not.toHaveProperty(
			"normalizedRegistrationNumber",
		);
		expectTypeOf<PartyContactProjection>().not.toHaveProperty(
			"normalizedValue",
		);
		expectTypeOf<SensitivePartyContactProjection>().not.toHaveProperty(
			"normalizedValue",
		);
	});
});
