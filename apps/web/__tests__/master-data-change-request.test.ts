/**
 * MDG change-request Actions — permission wiring + session org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-cr-operator",
	orgId: "org-cr",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const crMocks = vi.hoisted(() => ({
	submitChangeRequest: vi.fn(),
	approveChangeRequest: vi.fn(),
	rejectChangeRequest: vi.fn(),
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
		submitChangeRequest: crMocks.submitChangeRequest,
		approveChangeRequest: crMocks.approveChangeRequest,
		rejectChangeRequest: crMocks.rejectChangeRequest,
	};
});

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { approveChangeRequestAction } from "../app/actions/approve-change-request";
import { rejectChangeRequestAction } from "../app/actions/reject-change-request";
import { submitChangeRequestAction } from "../app/actions/submit-change-request";

const sampleCr = {
	id: "55555555-5555-4555-8555-555555555555",
	organizationId: "org-cr",
	code: "CR-1",
	commandKind: "activate_party" as const,
	status: "submitted" as const,
	version: 1,
	payload: { partyId: "11111111-1111-4111-8111-111111111111" },
	submittedBy: "user-cr-operator",
};

describe("master-data change-request Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
	});

	it("denies submit without master_data.manage", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "denied",
		});

		const formData = new FormData();
		formData.set("commandKind", "activate_party");
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");

		const result = await submitChangeRequestAction(null, formData);
		expect(result?.ok).toBe(false);
		expect(crMocks.submitChangeRequest).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.manage",
		);
	});

	it("submits activate_party CR with session org stamp", async () => {
		crMocks.submitChangeRequest.mockResolvedValue({
			ok: true,
			data: sampleCr,
		});

		const formData = new FormData();
		formData.set("commandKind", "activate_party");
		formData.set("partyId", "11111111-1111-4111-8111-111111111111");

		const result = await submitChangeRequestAction(null, formData);
		expect(result?.ok).toBe(true);
		expect(crMocks.submitChangeRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-cr",
				actorUserId: "user-cr-operator",
				commandKind: "activate_party",
				payload: { partyId: "11111111-1111-4111-8111-111111111111" },
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("denies approve without master_data.approve", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "denied",
		});

		const formData = new FormData();
		formData.set("changeRequestId", "55555555-5555-4555-8555-555555555555");
		formData.set("expectedVersion", "1");

		const result = await approveChangeRequestAction(null, formData);
		expect(result?.ok).toBe(false);
		expect(crMocks.approveChangeRequest).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.approve",
		);
	});

	it("approves CR with session org stamp", async () => {
		crMocks.approveChangeRequest.mockResolvedValue({
			ok: true,
			data: { ...sampleCr, status: "approved", version: 2 },
		});

		const formData = new FormData();
		formData.set("changeRequestId", "55555555-5555-4555-8555-555555555555");
		formData.set("expectedVersion", "1");

		const result = await approveChangeRequestAction(null, formData);
		expect(result?.ok).toBe(true);
		expect(crMocks.approveChangeRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-cr",
				actorUserId: "user-cr-operator",
				id: "55555555-5555-4555-8555-555555555555",
				expectedVersion: 1,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});

	it("rejects CR with master_data.approve", async () => {
		crMocks.rejectChangeRequest.mockResolvedValue({
			ok: true,
			data: { ...sampleCr, status: "rejected", version: 2 },
		});

		const formData = new FormData();
		formData.set("changeRequestId", "55555555-5555-4555-8555-555555555555");
		formData.set("expectedVersion", "1");
		formData.set("reviewNote", "Incomplete roles");

		const result = await rejectChangeRequestAction(null, formData);
		expect(result?.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"master_data.approve",
		);
		expect(crMocks.rejectChangeRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-cr",
				reviewNote: "Incomplete roles",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
