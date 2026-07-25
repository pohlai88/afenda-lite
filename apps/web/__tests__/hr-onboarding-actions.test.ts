/**
 * HR Onboarding Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-onboarding-operator",
	orgId: "org-hr-onboarding-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrOnboardingMocks = vi.hoisted(() => ({
	startOnboarding: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-onboarding-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		startOnboarding: hrOnboardingMocks.startOnboarding,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import { startOnboardingAction } from "../app/actions/hr-onboarding";

const employmentId = "33333333-3333-4333-8333-333333333333";

const onboardingInput = {
	idempotencyKey: "idem-onboard-1",
	employmentId,
	tasks: [{ code: "orientation", title: "Orientation", mandatory: true }],
};

describe("HR Onboarding Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrOnboardingMocks.startOnboarding.mockResolvedValue({
			ok: true,
			data: { id: "onboard-case-1", employmentId, status: "open" },
		});
	});

	it("denies startOnboardingAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await startOnboardingAction(onboardingInput);

		expect(result.ok).toBe(false);
		expect(hrOnboardingMocks.startOnboarding).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.onboarding.manage",
		);
	});

	it("rejects invalid startOnboardingAction input before calling the domain", async () => {
		const result = await startOnboardingAction({
			...onboardingInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrOnboardingMocks.startOnboarding).not.toHaveBeenCalled();
	});

	it("stamps org and actor on startOnboardingAction", async () => {
		const result = await startOnboardingAction(onboardingInput);

		expect(result.ok).toBe(true);
		expect(hrOnboardingMocks.startOnboarding).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-onboarding-test",
				idempotencyKey: "idem-onboard-1",
				employmentId,
			}),
			expect.any(Object),
		);
	});
});
