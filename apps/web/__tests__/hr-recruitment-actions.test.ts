/**
 * HR Recruitment Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-recruitment-operator",
	orgId: "org-hr-recruitment-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrRecruitmentMocks = vi.hoisted(() => ({
	createDraftRequisition: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-recruitment-test" } },
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createDraftRequisition: hrRecruitmentMocks.createDraftRequisition,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import { createDraftRequisitionAction } from "../app/actions/hr-recruitment";

describe("HR Recruitment Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrRecruitmentMocks.createDraftRequisition.mockResolvedValue({
			ok: true,
			data: { id: "req-1", code: "REQ-001", title: "Engineer" },
		});
	});

	it("denies createDraftRequisitionAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await createDraftRequisitionAction({
			idempotencyKey: "idem-req-1",
			code: "REQ-001",
			title: "Engineer",
		});

		expect(result.ok).toBe(false);
		expect(hrRecruitmentMocks.createDraftRequisition).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.requisition.create",
		);
	});

	it("rejects invalid createDraftRequisitionAction input before calling the domain", async () => {
		const result = await createDraftRequisitionAction({
			idempotencyKey: "",
			code: "REQ-001",
			title: "Engineer",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrRecruitmentMocks.createDraftRequisition).not.toHaveBeenCalled();
	});

	it("stamps org and actor on createDraftRequisitionAction", async () => {
		const result = await createDraftRequisitionAction({
			idempotencyKey: "idem-req-1",
			code: "REQ-001",
			title: "Engineer",
		});

		expect(result.ok).toBe(true);
		expect(hrRecruitmentMocks.createDraftRequisition).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-recruitment-test",
				idempotencyKey: "idem-req-1",
				code: "REQ-001",
				title: "Engineer",
			}),
			expect.any(Object),
		);
	});
});
