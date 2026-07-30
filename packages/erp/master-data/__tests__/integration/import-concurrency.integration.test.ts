import { randomUUID } from "node:crypto";

import { expect, it } from "vitest";

import { createParty, upsertPartiesByCode } from "../../src";
import {
	hashImportPayload,
	hashImportRow,
} from "../../src/capabilities/data-governance-workflows/import-idempotency";
import { createDrizzleHarness } from "../parity/parity-harness";

it("serializes identical import claims and rejects changed payloads", async () => {
	const harness = await createDrizzleHarness();
	try {
		const request = {
			...harness.context(),
			sourceSystem: "parity-integration",
			dryRun: false as const,
			approved: true as const,
			idempotencyKey: "import-claim-race",
			rows: [
				{
					code: "IMPORT-RACE",
					name: "Import Race",
					partyKind: "organization" as const,
				},
			],
		};
		const results = await Promise.all([
			upsertPartiesByCode(request, harness.options),
			upsertPartiesByCode(request, harness.options),
		]);
		expect(results.some((result) => result.ok)).toBe(true);

		const parties = await harness.store.listParties({
			organizationId: harness.organizationId,
			page: 1,
			pageSize: 100,
		});
		expect(parties.ok).toBe(true);
		if (!parties.ok) {
			return;
		}
		expect(
			parties.data.filter((party) => party.code === "IMPORT-RACE"),
		).toHaveLength(1);

		const conflict = await upsertPartiesByCode(
			{
				...request,
				correlationId: harness.context().correlationId,
				rows: [{ ...request.rows[0], name: "Changed Import Race" }],
			},
			harness.options,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.details).toMatchObject({
			reason: "MASTER_IDEMPOTENCY_CONFLICT",
			errorCode: "MASTER_DATA_IDEMPOTENCY_CONFLICT",
		});
	} finally {
		await harness.cleanup();
	}
});

it("resumes an expired lease without reapplying an applied row", async () => {
	const harness = await createDrizzleHarness();
	try {
		const batchId = randomUUID();
		const leaseOwner = randomUUID();
		const idempotencyKey = "import-recovery";
		const row = {
			code: "IMPORT-RECOVERY",
			name: "Import Recovery",
			partyKind: "organization" as const,
		};
		const payloadHash = hashImportPayload({
			operationType: "upsert_party_by_code",
			entityType: "party",
			sourceSystem: "parity-integration",
			mode: "create_or_update",
			rows: [row],
		});
		const claimed = await harness.store.claimImportBatch({
			id: batchId,
			organizationId: harness.organizationId,
			idempotencyKey,
			payloadHash,
			operationType: "upsert_party_by_code",
			entityType: "party",
			sourceSystem: "parity-integration",
			mode: "create_or_update",
			actorUserId: harness.actorUserId,
			correlationId: randomUUID(),
			rows: [
				{
					id: randomUUID(),
					sourceRowNumber: 1,
					payloadHash: hashImportRow(row),
					normalizedPayload: row,
				},
			],
		});
		expect(claimed.ok).toBe(true);
		const leased = await harness.store.acquireImportBatchLease({
			organizationId: harness.organizationId,
			batchId,
			leaseOwner,
			leaseExpiresAt: new Date(Date.now() - 1000),
		});
		expect(leased.ok).toBe(true);

		const initiallyApplied = await createParty(
			{ ...harness.context(), ...row },
			{
				...harness.options,
				importMutation: {
					organizationId: harness.organizationId,
					batchId,
					sourceRowNumber: 1,
					leaseOwner,
					intendedOperation: "create",
					matchedEntityId: null,
				},
			},
		);
		expect(initiallyApplied.ok).toBe(true);

		const resumed = await upsertPartiesByCode(
			{
				...harness.context(),
				sourceSystem: "parity-integration",
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [row],
			},
			harness.options,
		);
		expect(resumed.ok).toBe(true);
		if (!resumed.ok) {
			return;
		}
		expect(resumed.data.created).toBe(1);

		const parties = await harness.store.listParties({
			organizationId: harness.organizationId,
			page: 1,
			pageSize: 100,
		});
		expect(parties.ok).toBe(true);
		if (!parties.ok) {
			return;
		}
		expect(
			parties.data.filter((party) => party.code === row.code),
		).toHaveLength(1);
		const ledger = await harness.store.listImportBatchRows(
			harness.organizationId,
			batchId,
		);
		expect(ledger.ok && ledger.data[0]?.status).toBe("applied");
	} finally {
		await harness.cleanup();
	}
});
