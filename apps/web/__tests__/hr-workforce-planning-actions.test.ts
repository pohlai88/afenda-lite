/**
 * HR Workforce Planning Server Actions — permission, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-wfp-operator",
	orgId: "org-hr-wfp-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrWorkforcePlanningMocks = vi.hoisted(() => ({
	getWorkforcePlanVariance: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-wfp-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrWorkforcePlanningMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import { getWorkforcePlanVarianceAction } from "../app/actions/hr-workforce-planning";

const planId = "11111111-1111-4111-8111-111111111111";

describe("HR Workforce Planning Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrWorkforcePlanningMocks.getWorkforcePlanVariance.mockResolvedValue({
			ok: true,
			data: { planId, asOf: "2026-07-01", lines: [] },
		});
	});

	it("stamps org and actor on getWorkforcePlanVarianceAction", async () => {
		const result = await getWorkforcePlanVarianceAction({
			planId,
			asOf: "2026-07-01",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.workforce-plan.read",
		);
		expect(
			hrWorkforcePlanningMocks.getWorkforcePlanVariance,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-wfp-test",
				planId,
				asOf: "2026-07-01",
			}),
			expect.any(Object),
		);
	});
});
