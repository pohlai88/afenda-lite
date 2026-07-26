/**
 * HR Benefits Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-benefits-operator",
	orgId: "org-hr-benefits-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrBenefitsMocks = vi.hoisted(() => ({
	createBenefitPlan: vi.fn(),
	updateBenefitPlan: vi.fn(),
	archiveBenefitPlan: vi.fn(),
	setBenefitPlanEligibility: vi.fn(),
	getBenefitPlanEligibility: vi.fn(),
	enrolBenefit: vi.fn(),
	waiveBenefit: vi.fn(),
	endBenefitEnrollment: vi.fn(),
	cancelBenefitEnrollment: vi.fn(),
	addBenefitEnrollmentDependent: vi.fn(),
	endBenefitEnrollmentDependent: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-benefits-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrBenefitsMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	addBenefitEnrollmentDependentAction,
	archiveBenefitPlanAction,
	cancelBenefitEnrollmentAction,
	createBenefitPlanAction,
	endBenefitEnrollmentAction,
	endBenefitEnrollmentDependentAction,
	enrolBenefitAction,
	getBenefitPlanEligibilityAction,
	setBenefitPlanEligibilityAction,
	updateBenefitPlanAction,
	waiveBenefitAction,
} from "../app/actions/hr-benefits";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";
const enrollmentId = "44444444-4444-4444-8444-444444444444";
const dependentId = "55555555-5555-4555-8555-555555555555";

describe("HR Benefits Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrBenefitsMocks.createBenefitPlan.mockResolvedValue({
			ok: true,
			data: { id: planId, code: "HEALTH", status: "active" },
		});
	});

	it("denies benefits Actions before package invocation", async () => {
		const cases = [
			{
				invoke: () =>
					createBenefitPlanAction({ code: "HEALTH", name: "Health Plan" }),
				mock: hrBenefitsMocks.createBenefitPlan,
			},
			{
				invoke: () =>
					updateBenefitPlanAction({
						planId,
						name: "Health Plan Plus",
						expectedVersion: 1,
					}),
				mock: hrBenefitsMocks.updateBenefitPlan,
			},
			{
				invoke: () => archiveBenefitPlanAction({ planId, expectedVersion: 1 }),
				mock: hrBenefitsMocks.archiveBenefitPlan,
			},
			{
				invoke: () =>
					setBenefitPlanEligibilityAction({
						planId,
						minTenureDays: 90,
						allowedEmploymentStatuses: ["active"],
					}),
				mock: hrBenefitsMocks.setBenefitPlanEligibility,
			},
			{
				invoke: () => getBenefitPlanEligibilityAction({ planId }),
				mock: hrBenefitsMocks.getBenefitPlanEligibility,
			},
			{
				invoke: () =>
					enrolBenefitAction({
						idempotencyKey: "idem-enrol",
						employeeId,
						employmentId,
						planId,
						effectiveFrom: "2026-01-01",
					}),
				mock: hrBenefitsMocks.enrolBenefit,
			},
			{
				invoke: () =>
					waiveBenefitAction({
						enrollmentId,
						waiverReason: "Covered elsewhere",
						expectedVersion: 1,
					}),
				mock: hrBenefitsMocks.waiveBenefit,
			},
			{
				invoke: () =>
					endBenefitEnrollmentAction({
						enrollmentId,
						endsOn: "2026-12-31",
						expectedVersion: 1,
					}),
				mock: hrBenefitsMocks.endBenefitEnrollment,
			},
			{
				invoke: () =>
					cancelBenefitEnrollmentAction({
						enrollmentId,
						expectedVersion: 1,
					}),
				mock: hrBenefitsMocks.cancelBenefitEnrollment,
			},
			{
				invoke: () =>
					addBenefitEnrollmentDependentAction({
						enrollmentId,
						dependentName: "Alex Dependent",
						relationship: "child",
						effectiveFrom: "2026-01-01",
					}),
				mock: hrBenefitsMocks.addBenefitEnrollmentDependent,
			},
			{
				invoke: () =>
					endBenefitEnrollmentDependentAction({
						dependentId,
						endsOn: "2026-12-31",
						expectedVersion: 1,
					}),
				mock: hrBenefitsMocks.endBenefitEnrollmentDependent,
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			authMocks.requireRole.mockResolvedValue(operatorSession);
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Benefits is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Benefits is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				"human-resources.benefits.manage",
			);
		}
	});

	it("stamps org and actor on createBenefitPlanAction", async () => {
		const result = await createBenefitPlanAction({
			code: "HEALTH",
			name: "Health Plan",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.benefits.manage",
		);
		expect(hrBenefitsMocks.createBenefitPlan).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-benefits-test",
				code: "HEALTH",
				name: "Health Plan",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
