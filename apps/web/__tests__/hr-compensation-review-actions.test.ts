/**
 * HR Compensation Review Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-review-operator",
	orgId: "org-hr-review-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrReviewMocks = vi.hoisted(() => ({
	createCompensationReviewCycle: vi.fn(),
	openCompensationReviewCycle: vi.fn(),
	closeCompensationReviewCycle: vi.fn(),
	cancelCompensationReviewCycle: vi.fn(),
	getCompensationReviewCycle: vi.fn(),
	listCompensationReviewCycles: vi.fn(),
	createCompensationReviewDraft: vi.fn(),
	recordCompensationRecommendation: vi.fn(),
	finalizeCompensationReview: vi.fn(),
	applyApprovedCompensationResult: vi.fn(),
	getCompensationReview: vi.fn(),
	listCompensationReviewsByEmployee: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-review-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrReviewMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	applyApprovedCompensationResultAction,
	cancelCompensationReviewCycleAction,
	closeCompensationReviewCycleAction,
	createCompensationReviewCycleAction,
	createCompensationReviewDraftAction,
	finalizeCompensationReviewAction,
	getCompensationReviewAction,
	getCompensationReviewCycleAction,
	listCompensationReviewCyclesAction,
	listCompensationReviewsByEmployeeAction,
	openCompensationReviewCycleAction,
	recordCompensationRecommendationAction,
} from "../app/actions/hr-compensation-review";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const cycleId = "33333333-3333-4333-8333-333333333333";
const reviewId = "44444444-4444-4444-8444-444444444444";

describe("HR Compensation Review Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrReviewMocks.createCompensationReviewCycle.mockResolvedValue({
			ok: true,
			data: { id: cycleId, status: "draft" },
		});
	});

	it("denies compensation review Actions before package invocation", async () => {
		const cases = [
			{
				invoke: () =>
					createCompensationReviewCycleAction({
						idempotencyKey: "idem-cycle",
						code: "FY26",
						name: "FY26 Review",
						periodStart: "2026-01-01",
						periodEnd: "2026-12-31",
						budgetTotalAmount: "100000.0000",
						budgetCurrencyCode: "USD",
					}),
				mock: hrReviewMocks.createCompensationReviewCycle,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					openCompensationReviewCycleAction({
						cycleId,
						expectedVersion: 1,
					}),
				mock: hrReviewMocks.openCompensationReviewCycle,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					closeCompensationReviewCycleAction({
						cycleId,
						expectedVersion: 1,
					}),
				mock: hrReviewMocks.closeCompensationReviewCycle,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					cancelCompensationReviewCycleAction({
						cycleId,
						expectedVersion: 1,
					}),
				mock: hrReviewMocks.cancelCompensationReviewCycle,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () => getCompensationReviewCycleAction({ cycleId }),
				mock: hrReviewMocks.getCompensationReviewCycle,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => listCompensationReviewCyclesAction({}),
				mock: hrReviewMocks.listCompensationReviewCycles,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () =>
					createCompensationReviewDraftAction({
						idempotencyKey: "idem-review",
						cycleId,
						employeeId,
						employmentId,
					}),
				mock: hrReviewMocks.createCompensationReviewDraft,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					recordCompensationRecommendationAction({
						reviewId,
						proposedBaseAmount: "55000.0000",
						proposedCurrencyCode: "USD",
						effectiveFrom: "2026-07-01",
						expectedVersion: 1,
					}),
				mock: hrReviewMocks.recordCompensationRecommendation,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					finalizeCompensationReviewAction({
						reviewId,
						expectedVersion: 1,
					}),
				mock: hrReviewMocks.finalizeCompensationReview,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () =>
					applyApprovedCompensationResultAction({
						reviewId,
						reason: "Approved merit increase",
						idempotencyKey: "idem-apply",
					}),
				mock: hrReviewMocks.applyApprovedCompensationResult,
				permission: "human-resources.compensation.manage",
			},
			{
				invoke: () => getCompensationReviewAction({ reviewId }),
				mock: hrReviewMocks.getCompensationReview,
				permission: "human-resources.compensation.read",
			},
			{
				invoke: () => listCompensationReviewsByEmployeeAction({ employeeId }),
				mock: hrReviewMocks.listCompensationReviewsByEmployee,
				permission: "human-resources.compensation.read",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			authMocks.requireRole.mockResolvedValue(operatorSession);
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Compensation review is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Compensation review is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("stamps org and actor on createCompensationReviewCycleAction", async () => {
		const result = await createCompensationReviewCycleAction({
			idempotencyKey: "idem-cycle-1",
			code: "FY26",
			name: "FY26 Review",
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
			budgetTotalAmount: "100000.0000",
			budgetCurrencyCode: "USD",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.compensation.manage",
		);
		expect(hrReviewMocks.createCompensationReviewCycle).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-review-test",
				code: "FY26",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
