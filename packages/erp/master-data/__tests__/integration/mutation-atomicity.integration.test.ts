import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	eq,
	mdParty,
	platformAuditLog,
	platformDomainEvent,
} from "@afenda/db";
import { expect, it } from "vitest";

import { createParty } from "../../src";
import { createDrizzleMasterDataStore } from "../../src/drizzle-store";
import { createDrizzleHarness } from "../parity/parity-harness";

it("rolls back entity and audit when the outbox write fails", async () => {
	const harness = await createDrizzleHarness();
	try {
		const partyId = randomUUID();
		const auditId = randomUUID();
		const collidingEventId = randomUUID();
		const generatedIds = [
			partyId,
			auditId,
			collidingEventId,
			randomUUID(),
			randomUUID(),
		];
		const store = createDrizzleMasterDataStore({
			generateId: () => generatedIds.shift() ?? randomUUID(),
		});
		await afendaDatabase.client.insert(platformDomainEvent).values({
			id: collidingEventId,
			organizationId: harness.organizationId,
			type: "master_data.atomicity.sentinel.v1",
			sourceModule: "master_data",
			correlationId: randomUUID(),
			actorUserId: harness.actorUserId,
			payload: { sentinel: true },
			status: "pending",
			attempts: 0,
		});

		const result = await createParty(
			{
				...harness.context(),
				code: "ATOMIC-FAIL",
				name: "Atomic Failure",
				partyKind: "organization",
			},
			{ ...harness.options, store },
		);
		expect(result.ok).toBe(false);

		const parties = await afendaDatabase.client
			.select({ id: mdParty.id })
			.from(mdParty)
			.where(
				and(
					eq(mdParty.organizationId, harness.organizationId),
					eq(mdParty.id, partyId),
				),
			);
		const audits = await afendaDatabase.client
			.select({ id: platformAuditLog.id })
			.from(platformAuditLog)
			.where(
				and(
					eq(platformAuditLog.organizationId, harness.organizationId),
					eq(platformAuditLog.id, auditId),
				),
			);
		const events = await afendaDatabase.client
			.select({ id: platformDomainEvent.id })
			.from(platformDomainEvent)
			.where(
				and(
					eq(platformDomainEvent.organizationId, harness.organizationId),
					eq(platformDomainEvent.id, collidingEventId),
				),
			);
		expect(parties).toEqual([]);
		expect(audits).toEqual([]);
		expect(events).toEqual([{ id: collidingEventId }]);
	} finally {
		await harness.cleanup();
	}
});
