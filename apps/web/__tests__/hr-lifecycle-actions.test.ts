/**
 * HR Lifecycle Server Actions — permission deny, validation, org stamp.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-lifecycle-operator",
	orgId: "org-hr-lifecycle-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrLifecycleMocks = vi.hoisted(() => ({
	proposeTermination: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	authServer: { session: { requireRole: authMocks.requireRole } },
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	http: { correlation: { create: () => "corr-hr-lifecycle-test" } },
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		proposeTermination: hrLifecycleMocks.proposeTermination,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
		resourceAwareAuthorization: { canWithContext: vi.fn() },
	}),
}));

import { proposeTerminationAction } from "../app/actions/hr-lifecycle";

const employmentId = "44444444-4444-4444-8444-444444444444";

const terminationInput = {
	idempotencyKey: "idem-term-1",
	employmentId,
	reasonCode: "redundancy",
	reasonDetail: "Role eliminated",
	effectiveOn: "2026-04-01",
	rehireEligible: false,
};

describe("HR Lifecycle Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrLifecycleMocks.proposeTermination.mockResolvedValue({
			ok: true,
			data: { id: "term-1", employmentId, status: "proposed" },
		});
	});

	it("denies proposeTerminationAction when permission gate fails", async () => {
		permissionMocks.forbidUnlessPermission.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Denied.",
		});

		const result = await proposeTerminationAction(terminationInput);

		expect(result.ok).toBe(false);
		expect(hrLifecycleMocks.proposeTermination).not.toHaveBeenCalled();
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employment.manage",
		);
	});

	it("rejects invalid proposeTerminationAction input before calling the domain", async () => {
		const result = await proposeTerminationAction({
			...terminationInput,
			idempotencyKey: "",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(hrLifecycleMocks.proposeTermination).not.toHaveBeenCalled();
	});

	it("stamps org and actor on proposeTerminationAction", async () => {
		const result = await proposeTerminationAction(terminationInput);

		expect(result.ok).toBe(true);
		expect(hrLifecycleMocks.proposeTermination).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-lifecycle-test",
				idempotencyKey: "idem-term-1",
				employmentId,
			}),
			expect.any(Object),
		);
	});
});
