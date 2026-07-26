/**
 * HR Employee Relations Server Actions — permission, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-er-operator",
	orgId: "org-hr-er-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrEmployeeRelationsMocks = vi.hoisted(() => ({
	openEmployeeCase: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-er-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrEmployeeRelationsMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import { openEmployeeCaseAction } from "../app/actions/hr-employee-relations";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";

describe("HR Employee Relations Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrEmployeeRelationsMocks.openEmployeeCase.mockResolvedValue({
			ok: true,
			data: { id: "33333333-3333-4333-8333-333333333333", status: "open" },
		});
	});

	it("stamps org and actor on openEmployeeCaseAction", async () => {
		const result = await openEmployeeCaseAction({
			idempotencyKey: "idem-er-open",
			employeeId,
			employmentId,
			caseType: "conduct",
			severity: "medium",
			allegationSummary: "Policy concern",
			classificationCode: "CONDUCT",
			ownerActorUserId: "owner-user",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.employee-case.open",
		);
		expect(hrEmployeeRelationsMocks.openEmployeeCase).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-er-test",
				employeeId,
				employmentId,
			}),
			expect.any(Object),
		);
	});
});
