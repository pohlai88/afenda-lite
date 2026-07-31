import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { upsertPartiesByCode, validatePartyImportBatch } from "../src";
import { createParty } from "../src/capabilities/core-organization-masters/party";
import {
	hashImportPayload,
	hashImportRow,
} from "../src/capabilities/data-governance-workflows/import-idempotency";
import { createMasterDataTestHarness } from "./helpers/harness";

function ctx(organizationId = "org-import") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
		sourceSystem: "erp-test",
	};
}

function applyBase(organizationId = "org-import") {
	return {
		...ctx(organizationId),
		dryRun: false as const,
		approved: true as const,
		idempotencyKey: randomUUID(),
	};
}

describe("@afenda/master-data import bulk", () => {
	it("hashes canonical payloads independently of object key order", () => {
		expect(hashImportRow({ code: "A", nested: { b: 2, a: 1 } })).toBe(
			hashImportRow({ nested: { a: 1, b: 2 }, code: "A" }),
		);
		expect(hashImportRow({ code: "A" })).not.toBe(hashImportRow({ code: "B" }));
	});

	it("dry-run reports create/update/unchanged without writing", async () => {
		const { options, store } = createMasterDataTestHarness();

		const existing = await createParty(
			{
				...ctx(),
				code: "EXIST",
				name: "Existing Co",
				partyKind: "organization",
			},
			options,
		);
		expect(existing.ok).toBe(true);
		if (!existing.ok) {
			return;
		}

		const report = await validatePartyImportBatch(
			{
				...ctx(),
				rows: [
					{
						code: "NEW1",
						name: "New Co",
						partyKind: "organization",
					},
					{
						code: "EXIST",
						name: "Existing Co",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(report.ok).toBe(true);
		if (!report.ok) {
			return;
		}
		expect(report.data.dryRun).toBe(true);
		expect(report.data.created).toBe(1);
		expect(report.data.unchanged).toBe(1);
		expect(report.data.rows[0]).toMatchObject({
			sourceRowNumber: 1,
			code: "NEW1",
			rawPayload: {
				code: "NEW1",
				name: "New Co",
				partyKind: "organization",
			},
			normalizedPayload: {
				code: "NEW1",
				normalizedCode: "NEW1",
			},
			matchedTargetId: null,
			intendedOperation: "create",
			validationErrors: [],
			applicationResult: {
				outcome: "create",
				message: "Would create party",
				reason: null,
			},
			resultingEntityId: null,
			resultingEntityVersion: null,
		});

		const updatePreview = await validatePartyImportBatch(
			{
				...ctx(),
				rows: [
					{
						code: "EXIST",
						name: "Renamed Co",
						partyKind: "organization",
						expectedVersion: existing.data.version,
					},
				],
			},
			options,
		);
		expect(updatePreview.ok).toBe(true);
		if (!updatePreview.ok) {
			return;
		}
		expect(updatePreview.data.updated).toBe(1);

		const stillMissing = await store.getPartyByCode("org-import", "NEW1");
		expect(stillMissing.ok && stillMissing.data === null).toBe(true);
	});

	it("denies apply without approved (explicit false or omitted)", async () => {
		const { options, store } = createMasterDataTestHarness();
		const rows = [
			{
				code: "NOAP",
				name: "No Approve Co",
				partyKind: "organization" as const,
			},
		];

		const deniedExplicit = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: false,
				idempotencyKey: "deny-explicit",
				rows,
			},
			options,
		);
		expect(deniedExplicit.ok).toBe(false);

		const deniedOmitted = await upsertPartiesByCode(
			{ ...ctx(), dryRun: false, idempotencyKey: "deny-omitted", rows },
			options,
		);
		expect(deniedOmitted.ok).toBe(false);

		const missing = await store.getPartyByCode("org-import", "NOAP");
		expect(missing.ok && missing.data === null).toBe(true);
	});

	it("rejects apply without idempotencyKey", async () => {
		const { options } = createMasterDataTestHarness();
		const denied = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
				rows: [
					{
						code: "NOKEY",
						name: "No Key",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(denied.ok).toBe(false);
	});

	it("enforces four-eyes approval policy when required", async () => {
		const { options } = createMasterDataTestHarness();
		const rows = [
			{
				code: "FOUR1",
				name: "Four Eyes Co",
				partyKind: "organization" as const,
			},
		];

		const missingApprover = await upsertPartiesByCode(
			{
				...applyBase(),
				requireSegregatedApproval: true,
				rows,
			},
			options,
		);
		expect(missingApprover.ok).toBe(false);

		const sameActor = await upsertPartiesByCode(
			{
				...applyBase(),
				requireSegregatedApproval: true,
				approvedByActorUserId: "user-1",
				rows,
			},
			options,
		);
		expect(sameActor.ok).toBe(false);

		const differentActor = await upsertPartiesByCode(
			{
				...applyBase(),
				requireSegregatedApproval: true,
				approvedByActorUserId: "approver-1",
				rows,
			},
			options,
		);
		expect(differentActor.ok).toBe(true);
	});

	it("rejects duplicate codes in file and CAS conflicts", async () => {
		const { options } = createMasterDataTestHarness();

		const existing = await createParty(
			{
				...ctx(),
				code: "CAS1",
				name: "Cas Co",
				partyKind: "organization",
			},
			options,
		);
		expect(existing.ok).toBe(true);
		if (!existing.ok) {
			return;
		}

		const report = await upsertPartiesByCode(
			{
				...applyBase(),
				rows: [
					{
						code: "DUP",
						name: "Dup A",
						partyKind: "organization",
					},
					{
						code: "dup",
						name: "Dup B",
						partyKind: "organization",
					},
					{
						code: "CAS1",
						name: "Cas Renamed",
						partyKind: "organization",
						expectedVersion: 99,
					},
				],
			},
			options,
		);
		expect(report.ok).toBe(true);
		if (!report.ok) {
			return;
		}
		expect(report.data.conflicted).toBe(3);
		expect(report.data.rows[2]).toMatchObject({
			sourceRowNumber: 3,
			code: "CAS1",
			matchedTargetId: existing.data.id,
			intendedOperation: "update",
			validationErrors: [
				"MASTER_VERSION_CONFLICT",
				"Version conflict: expected 99, found 1",
			],
			applicationResult: {
				outcome: "conflict",
				reason: "MASTER_VERSION_CONFLICT",
			},
			resultingEntityId: existing.data.id,
		});
		expect(
			report.data.rows.every(
				(row) =>
					row.outcome === "conflict" ||
					row.reason === "MASTER_DUPLICATE" ||
					row.reason === "MASTER_VERSION_CONFLICT",
			),
		).toBe(true);
	});

	it("applies create then unchanged on second apply (row-level)", async () => {
		const { options } = createMasterDataTestHarness();

		const first = await upsertPartiesByCode(
			{
				...applyBase(),
				rows: [
					{
						code: "IDEM",
						name: "Idem Co",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.created).toBe(1);
		expect(first.data.rows[0]).toMatchObject({
			sourceRowNumber: 1,
			matchedTargetId: null,
			intendedOperation: "create",
			applicationResult: {
				outcome: "create",
				message: null,
				reason: null,
			},
		});
		expect(first.data.rows[0]?.resultingEntityId).toBeTypeOf("string");
		expect(first.data.rows[0]?.resultingEntityVersion).toBe(1);

		const second = await upsertPartiesByCode(
			{
				...applyBase(),
				rows: [
					{
						code: "IDEM",
						name: "Idem Co",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data.unchanged).toBe(1);
		expect(second.data.created).toBe(0);
	});

	it("replays stored report for the same idempotencyKey", async () => {
		const { options, store } = createMasterDataTestHarness();
		const idempotencyKey = "batch-key-1";

		const first = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [
					{
						code: "REPLAY1",
						name: "Replay Co",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}
		expect(first.data.created).toBe(1);

		const second = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [
					{
						code: "REPLAY1",
						name: "Replay Co",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		expect(second.data).toEqual(first.data);

		const party = await store.getPartyByCode("org-import", "REPLAY1");
		expect(party.ok && party.data?.name === "Replay Co").toBe(true);
	});

	it("rejects an idempotency key reused with a different payload", async () => {
		const { options, store } = createMasterDataTestHarness();
		const idempotencyKey = "batch-key-conflict";
		const first = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [
					{
						code: "REPLAY2",
						name: "Original Name",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(first.ok).toBe(true);

		const conflicting = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [
					{
						code: "REPLAY2",
						name: "Changed Payload",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(conflicting.ok).toBe(false);
		if (conflicting.ok) {
			return;
		}

		const party = await store.getPartyByCode("org-import", "REPLAY2");
		expect(party.ok && party.data?.name === "Original Name").toBe(true);
	});

	it("resumes an expired lease without rerunning an applied row", async () => {
		const { options, store } = createMasterDataTestHarness();
		const batchId = randomUUID();
		const idempotencyKey = "batch-key-recovery";
		const row = {
			code: "RECOVER1",
			name: "Recovered Co",
			partyKind: "organization" as const,
		};
		const payloadHash = hashImportPayload({
			operationType: "upsert_party_by_code",
			entityType: "party",
			sourceSystem: "erp-test",
			mode: "create_or_update",
			rows: [row],
		});
		const claimed = await store.claimImportBatch({
			id: batchId,
			organizationId: "org-import",
			idempotencyKey,
			payloadHash,
			operationType: "upsert_party_by_code",
			entityType: "party",
			sourceSystem: "erp-test",
			mode: "create_or_update",
			actorUserId: "user-1",
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
		const leaseOwner = randomUUID();
		const leased = await store.acquireImportBatchLease({
			organizationId: "org-import",
			batchId,
			leaseOwner,
			leaseExpiresAt: new Date(Date.now() - 1000),
		});
		expect(leased.ok).toBe(true);
		const initiallyApplied = await createParty(
			{
				...ctx(),
				code: row.code,
				name: row.name,
				partyKind: row.partyKind,
			},
			{
				...options,
				importMutation: {
					organizationId: "org-import",
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
				...ctx(),
				dryRun: false,
				approved: true,
				idempotencyKey,
				rows: [row],
			},
			options,
		);
		expect(resumed.ok).toBe(true);
		if (!resumed.ok) {
			return;
		}
		expect(resumed.data.created).toBe(1);
		const parties = await store.listParties({
			organizationId: "org-import",
			page: 1,
			pageSize: 100,
		});
		expect(
			parties.ok && parties.data.filter((party) => party.code === row.code),
		).toHaveLength(1);
		const ledger = await store.listImportBatchRows("org-import", batchId);
		expect(ledger.ok && ledger.data[0]?.status).toBe("applied");
	});

	it("creates a party and its external ID as one import-row operation", async () => {
		const { options, store } = createMasterDataTestHarness();
		const applied = await upsertPartiesByCode(
			{
				...applyBase(),
				rows: [
					{
						code: "EXTIMP1",
						name: "External Import Co",
						partyKind: "organization",
						externalId: {
							sourceSystem: "legacy.erp",
							externalIdType: "customer",
							externalValue: " Customer-42 ",
							caseSensitivity: "insensitive",
						},
					},
				],
			},
			options,
		);
		expect(applied.ok).toBe(true);
		const party = await store.findPartyByExternalId({
			organizationId: "org-import",
			sourceSystem: "legacy.erp",
			externalIdType: "customer",
			normalizedValue: "CUSTOMER-42",
			caseSensitivity: "insensitive",
		});
		expect(party.ok && party.data?.code).toBe("EXTIMP1");
	});

	it("allows only one executor for concurrent matching claims", async () => {
		const { options, store } = createMasterDataTestHarness();
		const request = {
			...ctx(),
			dryRun: false as const,
			approved: true as const,
			idempotencyKey: "batch-key-concurrent",
			rows: [
				{
					code: "CONCURRENT1",
					name: "Concurrent Co",
					partyKind: "organization" as const,
				},
			],
		};
		const results = await Promise.all([
			upsertPartiesByCode(request, options),
			upsertPartiesByCode(request, options),
		]);
		expect(results.some((result) => result.ok)).toBe(true);
		const parties = await store.listParties({
			organizationId: "org-import",
			page: 1,
			pageSize: 100,
		});
		expect(
			parties.ok &&
				parties.data.filter((party) => party.code === "CONCURRENT1"),
		).toHaveLength(1);
	});

	it("honors import mode create_only and update_existing", async () => {
		const { options } = createMasterDataTestHarness();

		const existing = await createParty(
			{
				...ctx(),
				code: "MODE1",
				name: "Mode Co",
				partyKind: "organization",
			},
			options,
		);
		expect(existing.ok).toBe(true);
		if (!existing.ok) {
			return;
		}

		const createOnlyUpdate = await upsertPartiesByCode(
			{
				...applyBase(),
				mode: "create_only",
				rows: [
					{
						code: "MODE1",
						name: "Renamed Mode",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(createOnlyUpdate.ok).toBe(true);
		if (!createOnlyUpdate.ok) {
			return;
		}
		expect(createOnlyUpdate.data.mode).toBe("create_only");
		expect(createOnlyUpdate.data.rejected).toBe(1);
		expect(createOnlyUpdate.data.rows[0]?.reason).toBe(
			"MASTER_VALIDATION_FAILED",
		);

		const updateExistingCreate = await upsertPartiesByCode(
			{
				...applyBase(),
				mode: "update_existing",
				rows: [
					{
						code: "MODE2",
						name: "New Mode",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(updateExistingCreate.ok).toBe(true);
		if (!updateExistingCreate.ok) {
			return;
		}
		expect(updateExistingCreate.data.rejected).toBe(1);

		const updateExistingApply = await upsertPartiesByCode(
			{
				...applyBase(),
				mode: "update_existing",
				rows: [
					{
						code: "MODE1",
						name: "Renamed Mode",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(updateExistingApply.ok).toBe(true);
		if (!updateExistingApply.ok) {
			return;
		}
		expect(updateExistingApply.data.updated).toBe(1);
	});

	it("rejects immutable partyKind changes on import update", async () => {
		const { options } = createMasterDataTestHarness();

		const existing = await createParty(
			{
				...ctx(),
				code: "KIND1",
				name: "Kind Co",
				partyKind: "organization",
			},
			options,
		);
		expect(existing.ok).toBe(true);
		if (!existing.ok) {
			return;
		}

		const report = await upsertPartiesByCode(
			{
				...applyBase(),
				rows: [
					{
						code: "KIND1",
						name: "Kind Co",
						partyKind: "person",
					},
				],
			},
			options,
		);
		expect(report.ok).toBe(true);
		if (!report.ok) {
			return;
		}
		expect(report.data.rejected).toBe(1);
		expect(report.data.rows[0]?.reason).toBe("MASTER_VALIDATION_FAILED");
	});

	it("binds org from input and does not cross tenants", async () => {
		const { options, store } = createMasterDataTestHarness();

		await upsertPartiesByCode(
			{
				...applyBase("org-a"),
				rows: [
					{
						code: "T1",
						name: "Tenant A",
						partyKind: "organization",
					},
				],
			},
			options,
		);

		const foreign = await store.getPartyByCode("org-b", "T1");
		expect(foreign.ok && foreign.data === null).toBe(true);
		const local = await store.getPartyByCode("org-a", "T1");
		expect(local.ok && local.data?.name === "Tenant A").toBe(true);
	});
});
