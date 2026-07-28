import { expect, it } from "vitest";

import {
	createParty,
	createTaxRegistration,
	getSensitiveTaxRegistration,
	getTaxRegistration,
} from "../../src";
import { createGrantingMasterAuthorization } from "../helpers/memory-authorization";
import { createDrizzleHarness } from "../parity/parity-harness";

it("masks ordinary SQL projections and requires sensitive-read permission", async () => {
	const harness = await createDrizzleHarness();
	try {
		const party = await createParty(
			{
				...harness.context(),
				code: "SQL-SENSITIVE",
				name: "SQL Sensitive",
				partyKind: "organization",
			},
			harness.options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) return;
		const created = await createTaxRegistration(
			{
				...harness.context(),
				partyId: party.data.id,
				jurisdictionCountryId: harness.countryId,
				registrationType: "vat_gst",
				registrationNumber: "MY-9876-5432",
			},
			harness.options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const ordinaryAuthorization = createGrantingMasterAuthorization([
			"master_data.tax_registration_read",
		]);
		const sensitiveAuthorization = createGrantingMasterAuthorization([
			"master_data.tax_registration_sensitive_read",
		]);
		const input = { ...harness.queryContext(), id: created.data.id };
		const ordinary = await getTaxRegistration(input, {
			store: harness.store,
			authorization: ordinaryAuthorization,
		});
		expect(ordinary.ok).toBe(true);
		if (!ordinary.ok || ordinary.data === null) return;
		expect(ordinary.data.maskedRegistrationNumber).toBe("********5432");
		expect(ordinary.data).not.toHaveProperty("registrationNumber");
		expect(ordinary.data).not.toHaveProperty("normalizedRegistrationNumber");

		const denied = await getSensitiveTaxRegistration(input, {
			store: harness.store,
			authorization: ordinaryAuthorization,
		});
		expect(denied.ok).toBe(false);
		if (!denied.ok) expect(denied.code).toBe("FORBIDDEN");

		const sensitive = await getSensitiveTaxRegistration(input, {
			store: harness.store,
			authorization: sensitiveAuthorization,
		});
		expect(sensitive.ok).toBe(true);
		if (!sensitive.ok || sensitive.data === null) return;
		expect(sensitive.data.registrationNumber).toBe("MY-9876-5432");
		expect(sensitive.data).not.toHaveProperty("normalizedRegistrationNumber");
	} finally {
		await harness.cleanup();
	}
});
