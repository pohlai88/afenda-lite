import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-ca-share",
	orgId: "org-ca-share",
	role: "operator" as const,
	email: "share@example.com",
};

const authMocks = vi.hoisted(() => ({ requireRole: vi.fn() }));
const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));
const cacheMocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const caMocks = vi.hoisted(() => ({
	createShareClass: vi.fn(),
	createShareTransaction: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({ requireRole: authMocks.requireRole }));
vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));
vi.mock("next/cache", () => ({ revalidatePath: cacheMocks.revalidatePath }));
vi.mock("@afenda/corporate-administration", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/corporate-administration")>();
	return {
		...actual,
		createShareClass: caMocks.createShareClass,
		createShareTransaction: caMocks.createShareTransaction,
	};
});

import {
	createShareClassAction,
	createShareTransactionAction,
} from "../app/actions/corporate-administration-share-capital";

const companyId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000001";
const txnId = "30000000-0000-4000-8000-000000000001";

describe("corporate-administration share capital Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("stamps tenant, actor, correlation, and durable request identity for share class create", async () => {
		caMocks.createShareClass.mockResolvedValue({
			ok: true,
			data: { id: classId, version: 1 },
		});
		const formData = new FormData();
		formData.set("requestId", "request-class-1");
		formData.set("legalCompanyId", companyId);
		formData.set("code", "ORD");
		formData.set("classType", "ordinary");
		formData.set("currencyCode", "MYR");
		formData.set("parValue", "1.00");
		formData.set("authorizedQuantity", "1000000");

		const result = await createShareClassAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: { entity: { id: classId, version: 1 } },
		});
		expect(caMocks.createShareClass).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				idempotencyKey: "createShareClassAction:request-class-1",
				legalCompanyId: companyId,
				code: "ORD",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"corporate-administration.share-capital.manage",
		);
		expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
	});

	it("posts share transaction with parsed legs JSON", async () => {
		caMocks.createShareTransaction.mockResolvedValue({
			ok: true,
			data: { id: txnId, legs: [] },
		});
		const formData = new FormData();
		formData.set("requestId", "request-txn-1");
		formData.set("legalCompanyId", companyId);
		formData.set("shareClassId", classId);
		formData.set("transactionReference", "ISS-001");
		formData.set("transactionType", "issuance");
		formData.set("transactionDate", "2026-07-25");
		formData.set(
			"legs",
			JSON.stringify([
				{
					holderPartyId: "40000000-0000-4000-8000-000000000001",
					quantityDelta: "100",
				},
			]),
		);

		const result = await createShareTransactionAction(null, formData);

		expect(result?.ok).toBe(true);
		expect(caMocks.createShareTransaction).toHaveBeenCalledWith(
			expect.objectContaining({
				transactionReference: "ISS-001",
				legs: [
					expect.objectContaining({
						quantityDelta: "100",
					}),
				],
			}),
			expect.anything(),
		);
	});
});
