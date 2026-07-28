import { afterAll, expect, it } from "vitest";

import { createPerson } from "../../src/workforce-foundation/person";
import {
	addPersonContact,
	addPersonIdentifier,
} from "../../src/workforce-foundation/person-management";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./hr-parity-harness";
import { createNeonOrgTracker } from "./neon-cleanup";

export function definePersonManagementParity(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const neonOrgs = createNeonOrgTracker();
	const organizationId = neonOrgs.trackOrg(`org-person-parity-${suffix}`);
	const actorUserId = `user-person-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
		}
	});

	it("creates person contact and identifier with parity store", async () => {
		const ready = createHrParityHarness(adapter);
		const person = await createPerson(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-parity-person-${suffix}`,
				idempotencyKey: `idem-parity-person-${suffix}`,
				legalName: "Parity Person",
				preferredName: "Parity",
			},
			ready,
		);
		expect(person.ok).toBe(true);
		if (!person.ok) return;

		const contact = await addPersonContact(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-parity-contact-${suffix}`,
				idempotencyKey: `idem-parity-contact-${suffix}`,
				personId: person.data.id,
				contactType: "email",
				valueText: "parity@example.com",
				isPrimary: true,
			},
			ready,
		);
		expect(contact.ok).toBe(true);

		const identifier = await addPersonIdentifier(
			{
				organizationId,
				actorUserId,
				correlationId: `corr-parity-id-${suffix}`,
				idempotencyKey: `idem-parity-id-${suffix}`,
				personId: person.data.id,
				identifierType: "passport",
				identifierValue: "P123456789",
				effectiveFrom: "2026-01-01",
			},
			ready,
		);
		expect(identifier.ok).toBe(true);
	});
}
