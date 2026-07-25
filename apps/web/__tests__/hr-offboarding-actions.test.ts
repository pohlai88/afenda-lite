/**
 * HR Offboarding Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-offboarding-operator",
	orgId: "org-hr-offboarding-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrOffboardingMocks = vi.hoisted(() => ({
	startOffboarding: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-offboarding-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		startOffboarding: hrOffboardingMocks.startOffboarding,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import { startOffboardingAction } from "../app/actions/hr-offboarding";

const employmentId = "55555555-5555-4555-8555-555555555555";

const offboardingInput = {
	idempotencyKey: "idem-offboard-1",
	employmentId,
	tasks: [{ code: "exit-interview", title: "Exit interview", mandatory: true }],
};

describe("HR Offboarding Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrOffboardingMocks.startOffboarding.mockResolvedValue({
			ok: true,
			data: { id: "offboard-case-1", employmentId, status: "open" },
		});
	});

	it("denies startOffboardingAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await startOffboardingAction(offboardingInput);

		expect(result.ok).toBe(false);
		expect(hrOffboardingMocks.startOffboarding).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.offboarding.manage",
		);
	});

	it("rejects invalid startOffboardingAction input before calling the domain", async () => {
		const result = await startOffboardingAction({
			...offboardingInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrOffboardingMocks.startOffboarding).not.toHaveBeenCalled();
	});

	it("stamps org and actor on startOffboardingAction", async () => {
		const result = await startOffboardingAction(offboardingInput);

		expect(result.ok).toBe(true);
		expect(hrOffboardingMocks.startOffboarding).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-offboarding-test",
				idempotencyKey: "idem-offboard-1",
				employmentId,
			}),
			expect.any(Object),
		);
	});
});
