/**
 * HR Compliance Server Actions — permission, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-compliance-operator",
	orgId: "org-hr-compliance-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrComplianceMocks = vi.hoisted(() => ({
	detectComplianceExpiryOperations: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-compliance-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrComplianceMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import { detectComplianceExpiryOperationsAction } from "../app/actions/hr-compliance";

describe("HR Compliance Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrComplianceMocks.detectComplianceExpiryOperations.mockResolvedValue({
			ok: true,
			data: {
				asOf: "2026-07-01",
				withinDays: 30,
				expiringDocuments: {
					documents: [],
					totalCount: 0,
					page: 1,
					pageSize: 25,
				},
				workEligibilityRisks: {
					eligibilities: [],
					totalCount: 0,
					page: 1,
					pageSize: 25,
				},
				overduePolicyAcknowledgements: {
					acknowledgements: [],
					totalCount: 0,
					page: 1,
					pageSize: 25,
				},
				expiringCertifications: {
					certifications: [],
					totalCount: 0,
					page: 1,
					pageSize: 25,
				},
			},
		});
	});

	it("stamps org and actor on compliance expiry detection", async () => {
		const result = await detectComplianceExpiryOperationsAction({
			asOf: "2026-07-01",
			withinDays: 30,
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.compliance.administer",
		);
		expect(
			hrComplianceMocks.detectComplianceExpiryOperations,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-compliance-test",
				asOf: "2026-07-01",
			}),
			expect.any(Object),
		);
	});
});
