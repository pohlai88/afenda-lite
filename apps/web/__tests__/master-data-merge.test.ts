/**
 * Master-data merge Action — permission, org stamp, Result map.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-merge",
	orgId: "org-merge",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const mergeMocks = vi.hoisted(() => ({
	mergeParties: vi.fn(),
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
		mergeParties: mergeMocks.mergeParties,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { mergePartiesAction } from "../app/actions/merge-parties";

describe("mergePartiesAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("denies without master_data.manage", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "denied",
		});

		const formData = new FormData();
		formData.set("changeRequestId", "33333333-3333-4333-8333-333333333333");
		formData.set("sourceParty", "11111111-1111-4111-8111-111111111111:1");
		formData.set("targetParty", "22222222-2222-4222-8222-222222222222:1");

		const result = await mergePartiesAction(null, formData);
		expect(result?.ok).toBe(false);
		expect(mergeMocks.mergeParties).not.toHaveBeenCalled();
	});

	it("stamps session org and maps success", async () => {
		mergeMocks.mergeParties.mockResolvedValue({
			ok: true,
			data: {
				survivor: { id: "22222222-2222-4222-8222-222222222222", code: "T" },
				merged: {
					id: "11111111-1111-4111-8111-111111111111",
					code: "S",
					mergedIntoId: "22222222-2222-4222-8222-222222222222",
				},
			},
		});

		const formData = new FormData();
		formData.set("changeRequestId", "33333333-3333-4333-8333-333333333333");
		formData.set("sourceParty", "11111111-1111-4111-8111-111111111111:1");
		formData.set("targetParty", "22222222-2222-4222-8222-222222222222:2");
		formData.set("nameDecision", "source");

		const result = await mergePartiesAction(null, formData);
		expect(result?.ok).toBe(true);
		expect(mergeMocks.mergeParties).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-merge",
				actorUserId: "user-merge",
				changeRequestId: "33333333-3333-4333-8333-333333333333",
				sourcePartyId: "11111111-1111-4111-8111-111111111111",
				targetPartyId: "22222222-2222-4222-8222-222222222222",
				sourceExpectedVersion: 1,
				targetExpectedVersion: 2,
				fieldDecisions: { name: "source" },
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
