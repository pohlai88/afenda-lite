import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
	upsertPartiesByCode,
	validatePartyImportBatch,
} from "../src/import-bulk";
import { createParty } from "../src/party";
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
		if (!deniedExplicit.ok) {
			expect(deniedExplicit.details).toMatchObject({
				reason: "MASTER_IMPORT_NOT_APPROVED",
			});
		}

		const deniedOmitted = await upsertPartiesByCode(
			{ ...ctx(), dryRun: false, idempotencyKey: "deny-omitted", rows },
			options,
		);
		expect(deniedOmitted.ok).toBe(false);
		if (!deniedOmitted.ok) {
			expect(deniedOmitted.details).toMatchObject({
				reason: "MASTER_IMPORT_NOT_APPROVED",
			});
		}

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
		if (!denied.ok) {
			expect(denied.details).toMatchObject({
				reason: "MASTER_VALIDATION_FAILED",
			});
		}
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
						name: "Different Name Should Not Apply",
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
