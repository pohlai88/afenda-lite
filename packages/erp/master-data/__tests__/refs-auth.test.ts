import { describe, expect, it } from "vitest";

import {
	MASTER_DATA_PERMISSION_IMPORT_APPROVE,
	MASTER_DATA_PERMISSION_MANAGE,
	MASTER_DATA_PERMISSION_READ,
} from "../src/permissions";
import { getRefCountryByCode, listRefUoms } from "../src/refs";
import { createGrantingMasterAuthorization } from "./helpers/memory-authorization";
import { createMasterDataTestHarness } from "./helpers/harness";
import {
	upsertPartiesByCode,
	validatePartyImportBatch,
} from "../src/import-bulk";
import { randomUUID } from "node:crypto";

describe("@afenda/master-data ref query auth", () => {
	it("rejects ref queries without authorization port", async () => {
		const { store } = createMasterDataTestHarness();
		const denied = await getRefCountryByCode(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				code: "MY",
			},
			{ store },
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("UNAUTHORIZED");
		}
	});

	it("rejects ref queries without master_data.read", async () => {
		const { store } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_MANAGE,
		]);
		const denied = await listRefUoms(
			{ organizationId: "org-1", actorUserId: "user-1" },
			{ store, authorization },
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("FORBIDDEN");
		}
	});

	it("allows ref queries with master_data.read", async () => {
		const { options } = createMasterDataTestHarness();
		const listed = await listRefUoms(
			{ organizationId: "org-1", actorUserId: "user-1" },
			options,
		);
		expect(listed.ok).toBe(true);
	});
});

describe("@afenda/master-data import permission mapping", () => {
	it("allows validate with manage only (no import_approve)", async () => {
		const { store, ports } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_MANAGE,
			MASTER_DATA_PERMISSION_READ,
		]);
		const options = { store, ports, authorization };
		const report = await validatePartyImportBatch(
			{
				organizationId: "org-import-auth",
				actorUserId: "user-1",
				correlationId: randomUUID(),
				sourceSystem: "erp-test",
				rows: [
					{
						code: "VAL1",
						name: "Validate Only",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(report.ok).toBe(true);
		if (report.ok) {
			expect(report.data.dryRun).toBe(true);
		}
	});

	it("denies apply without import_approve even when manage is granted", async () => {
		const { store, ports } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_MANAGE,
			MASTER_DATA_PERMISSION_READ,
		]);
		const options = { store, ports, authorization };
		const denied = await upsertPartiesByCode(
			{
				organizationId: "org-import-auth",
				actorUserId: "user-1",
				correlationId: randomUUID(),
				sourceSystem: "erp-test",
				dryRun: false,
				approved: true,
				rows: [
					{
						code: "APP1",
						name: "Apply Denied",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(denied.ok).toBe(false);
		if (!denied.ok) {
			expect(denied.code).toBe("FORBIDDEN");
		}
	});

	it("allows apply with import_approve", async () => {
		const { store, ports } = createMasterDataTestHarness();
		const authorization = createGrantingMasterAuthorization([
			MASTER_DATA_PERMISSION_MANAGE,
			MASTER_DATA_PERMISSION_READ,
			MASTER_DATA_PERMISSION_IMPORT_APPROVE,
		]);
		const options = { store, ports, authorization };
		const applied = await upsertPartiesByCode(
			{
				organizationId: "org-import-auth",
				actorUserId: "user-1",
				correlationId: randomUUID(),
				sourceSystem: "erp-test",
				dryRun: false,
				approved: true,
				idempotencyKey: randomUUID(),
				rows: [
					{
						code: "APP2",
						name: "Apply Allowed",
						partyKind: "organization",
					},
				],
			},
			options,
		);
		expect(applied.ok).toBe(true);
	});
});
