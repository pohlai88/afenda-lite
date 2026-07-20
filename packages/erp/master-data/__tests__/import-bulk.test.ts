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
			{ ...ctx(), dryRun: false, approved: false, rows },
			options,
		);
		expect(deniedExplicit.ok).toBe(false);
		if (!deniedExplicit.ok) {
			expect(deniedExplicit.details).toMatchObject({
				reason: "MASTER_IMPORT_NOT_APPROVED",
			});
		}

		const deniedOmitted = await upsertPartiesByCode(
			{ ...ctx(), dryRun: false, rows },
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
				...ctx(),
				dryRun: false,
				approved: true,
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

	it("applies create then unchanged on second apply (idempotent)", async () => {
		const { options } = createMasterDataTestHarness();

		const first = await upsertPartiesByCode(
			{
				...ctx(),
				dryRun: false,
				approved: true,
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
				...ctx(),
				dryRun: false,
				approved: true,
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

	it("binds org from input and does not cross tenants", async () => {
		const { options, store } = createMasterDataTestHarness();

		await upsertPartiesByCode(
			{
				...ctx("org-a"),
				dryRun: false,
				approved: true,
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
