/**
 * Master-data import Actions — dry-run vs apply, permission, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-import",
	orgId: "org-import",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const importMocks = vi.hoisted(() => ({
	validatePartyImportBatch: vi.fn(),
	upsertPartiesByCode: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/master-data", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@afenda/master-data")>();
	return {
		...actual,
		validatePartyImportBatch: importMocks.validatePartyImportBatch,
		upsertPartiesByCode: importMocks.upsertPartiesByCode,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { applyMasterDataImportAction } from "../app/actions/apply-master-data-import";
import { validateMasterDataImportAction } from "../app/actions/validate-master-data-import";

describe("master-data import Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("denies validate without master_data.manage", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "denied",
		});

		const result = await validateMasterDataImportAction({
			sourceSystem: "erp",
			entity: "party",
			rows: [{ code: "A", name: "A", partyKind: "organization" }],
		});

		expect(result.ok).toBe(false);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
		expect(importMocks.validatePartyImportBatch).not.toHaveBeenCalled();
	});

	it("stamps session org on dry-run validate", async () => {
		importMocks.validatePartyImportBatch.mockResolvedValue({
			ok: true,
			data: {
				sourceSystem: "erp",
				dryRun: true,
				organizationId: "org-import",
				total: 1,
				created: 1,
				updated: 0,
				unchanged: 0,
				rejected: 0,
				conflicted: 0,
				rows: [],
			},
		});

		const result = await validateMasterDataImportAction({
			sourceSystem: "erp",
			entity: "party",
			rows: [{ code: "A", name: "A", partyKind: "organization" }],
		});

		expect(result.ok).toBe(true);
		expect(importMocks.validatePartyImportBatch).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-import",
				actorUserId: "user-import",
				sourceSystem: "erp",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies apply without master_data.import_approve", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "denied",
		});

		const result = await applyMasterDataImportAction({
			sourceSystem: "erp",
			entity: "party",
			rows: [{ code: "A", name: "A", partyKind: "organization" }],
		});

		expect(result.ok).toBe(false);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.import_approve",
		);
		expect(importMocks.upsertPartiesByCode).not.toHaveBeenCalled();
	});

	it("applies with dryRun false and stamps approved true", async () => {
		importMocks.upsertPartiesByCode.mockResolvedValue({
			ok: true,
			data: {
				sourceSystem: "erp",
				dryRun: false,
				organizationId: "org-import",
				total: 1,
				created: 1,
				updated: 0,
				unchanged: 0,
				rejected: 0,
				conflicted: 0,
				rows: [],
			},
		});

		const result = await applyMasterDataImportAction({
			sourceSystem: "erp",
			entity: "party",
			rows: [{ code: "A", name: "A", partyKind: "organization" }],
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.import_approve",
		);
		expect(importMocks.upsertPartiesByCode).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-import",
				dryRun: false,
				approved: true,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
