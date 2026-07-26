/**
 * HR Performance Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-perf-operator",
	orgId: "org-hr-perf-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrPerfMocks = vi.hoisted(() => ({
	createPerformanceCycle: vi.fn(),
	openPerformanceCycle: vi.fn(),
	getPerformanceCycleById: vi.fn(),
	listPerformanceCycles: vi.fn(),
	createPerformanceGoal: vi.fn(),
	listEmployeeGoals: vi.fn(),
	startPerformanceReview: vi.fn(),
	getPerformanceReviewById: vi.fn(),
	listEmployeePerformanceReviews: vi.fn(),
	listReviewsPendingManagerAction: vi.fn(),
	createImprovementPlan: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-perf-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return {
		...actual,
		createPerformanceCycle: hrPerfMocks.createPerformanceCycle,
		openPerformanceCycle: hrPerfMocks.openPerformanceCycle,
		getPerformanceCycleById: hrPerfMocks.getPerformanceCycleById,
		listPerformanceCycles: hrPerfMocks.listPerformanceCycles,
		createPerformanceGoal: hrPerfMocks.createPerformanceGoal,
		listEmployeeGoals: hrPerfMocks.listEmployeeGoals,
		startPerformanceReview: hrPerfMocks.startPerformanceReview,
		getPerformanceReviewById: hrPerfMocks.getPerformanceReviewById,
		listEmployeePerformanceReviews: hrPerfMocks.listEmployeePerformanceReviews,
		listReviewsPendingManagerAction: hrPerfMocks.listReviewsPendingManagerAction,
		createImprovementPlan: hrPerfMocks.createImprovementPlan,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	createPerformanceCycleAction,
	createPerformanceGoalAction,
	getPerformanceCycleByIdAction,
	listEmployeeGoalsAction,
	listPerformanceCyclesAction,
	listReviewsPendingManagerActionAction,
	openPerformanceCycleAction,
	startPerformanceReviewAction,
} from "../app/actions/hr-performance";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const cycleId = "33333333-3333-4333-8333-333333333333";
const reviewId = "44444444-4444-4444-8444-444444444444";
const participantId = "55555555-5555-4555-8555-555555555555";
const ratingScale = { codes: ["meets", "exceeds"] } as const;

describe("HR Performance Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrPerfMocks.createPerformanceCycle.mockResolvedValue({
			ok: true,
			data: { id: cycleId, status: "draft" },
		});
		hrPerfMocks.listPerformanceCycles.mockResolvedValue({
			ok: true,
			data: { cycles: [], total: 0, page: 1, pageSize: 20 },
		});
	});

	it("denies performance Actions before package invocation", async () => {
		const cases = [
			{
				invoke: () =>
					createPerformanceCycleAction({
						idempotencyKey: "idem-cycle-denied",
						code: "FY26",
						name: "FY26 Cycle",
						periodStart: "2026-01-01",
						periodEnd: "2026-12-31",
						ratingScale,
						weightingModel: "none",
					}),
				mock: hrPerfMocks.createPerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () =>
					openPerformanceCycleAction({
						cycleId,
						expectedVersion: 1,
					}),
				mock: hrPerfMocks.openPerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => getPerformanceCycleByIdAction({ cycleId }),
				mock: hrPerfMocks.getPerformanceCycleById,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => listPerformanceCyclesAction({}),
				mock: hrPerfMocks.listPerformanceCycles,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () =>
					createPerformanceGoalAction({
						idempotencyKey: "idem-goal-denied",
						cycleId,
						employeeId,
						employmentId,
						title: "Goal",
						periodStart: "2026-01-01",
						periodEnd: "2026-12-31",
					}),
				mock: hrPerfMocks.createPerformanceGoal,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => listEmployeeGoalsAction({ employeeId, cycleId }),
				mock: hrPerfMocks.listEmployeeGoals,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () =>
					startPerformanceReviewAction({
						cycleId,
						participantId,
					}),
				mock: hrPerfMocks.startPerformanceReview,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => listReviewsPendingManagerActionAction({}),
				mock: hrPerfMocks.listReviewsPendingManagerAction,
				permission: "human-resources.performance.manager.manage",
			},
		];

		for (const testCase of cases) {
			vi.clearAllMocks();
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Performance is not permitted.",
			});

			const result = await testCase.invoke();
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Performance is not permitted.",
			});
			expect(testCase.mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				testCase.permission,
			);
		}
	});

	it("stamps org and actor on createPerformanceCycleAction", async () => {
		const result = await createPerformanceCycleAction({
			idempotencyKey: "idem-cycle-1",
			code: "FY26",
			name: "FY26 Cycle",
			periodStart: "2026-01-01",
			periodEnd: "2026-12-31",
			ratingScale,
			weightingModel: "none",
		});

		expect(result.ok).toBe(true);
		expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
			operatorSession,
			"human-resources.performance.manage",
		);
		expect(hrPerfMocks.createPerformanceCycle).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-perf-test",
				code: "FY26",
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
