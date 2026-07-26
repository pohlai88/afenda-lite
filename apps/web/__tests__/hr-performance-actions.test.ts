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
	acknowledgeImprovementPlan: vi.fn(),
	acknowledgePerformanceReview: vi.fn(),
	activatePerformanceGoal: vi.fn(),
	addCycleParticipant: vi.fn(),
	alignPerformanceGoal: vi.fn(),
	amendImprovementPlan: vi.fn(),
	approvePerformanceGoal: vi.fn(),
	calibratePerformanceReview: vi.fn(),
	cancelImprovementPlan: vi.fn(),
	cancelPerformanceCycle: vi.fn(),
	cancelPerformanceGoal: vi.fn(),
	closeImprovementPlanUnsuccessful: vi.fn(),
	closePerformanceCycle: vi.fn(),
	closePerformanceGoal: vi.fn(),
	completeImprovementPlan: vi.fn(),
	createPerformanceCycle: vi.fn(),
	openPerformanceCycle: vi.fn(),
	getPerformanceCycleById: vi.fn(),
	listPerformanceCycles: vi.fn(),
	createPerformanceGoal: vi.fn(),
	enrollEligibleCycleParticipants: vi.fn(),
	finalizePerformanceReview: vi.fn(),
	getImprovementPlanById: vi.fn(),
	getPerformanceCycleEligibility: vi.fn(),
	getPerformanceGoalById: vi.fn(),
	listEmployeeGoals: vi.fn(),
	listGoalProgress: vi.fn(),
	listImprovementPlanCheckpoints: vi.fn(),
	listPerformanceCycleReviewPeriods: vi.fn(),
	startPerformanceReview: vi.fn(),
	submitSelfAssessment: vi.fn(),
	submitManagerAssessment: vi.fn(),
	submitPerformanceGoal: vi.fn(),
	updatePerformanceCycle: vi.fn(),
	updatePerformanceGoal: vi.fn(),
	listActiveImprovementPlans: vi.fn(),
	listCycleParticipants: vi.fn(),
	getPerformanceReviewById: vi.fn(),
	listEmployeePerformanceReviews: vi.fn(),
	listReviewsPendingManagerAction: vi.fn(),
	createImprovementPlan: vi.fn(),
	getEmployeePerformanceHistory: vi.fn(),
	openImprovementPlan: vi.fn(),
	publishPerformanceCycle: vi.fn(),
	recordGoalProgress: vi.fn(),
	recordImprovementCheckpoint: vi.fn(),
	rejectPerformanceGoal: vi.fn(),
	removeCycleParticipant: vi.fn(),
	reopenPerformanceReview: vi.fn(),
	returnPerformanceReviewForCorrection: vi.fn(),
	setPerformanceCycleEligibility: vi.fn(),
	setPerformanceCycleReviewPeriods: vi.fn(),
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
		...hrPerfMocks,
		createPerformanceCycle: hrPerfMocks.createPerformanceCycle,
		openPerformanceCycle: hrPerfMocks.openPerformanceCycle,
		getPerformanceCycleById: hrPerfMocks.getPerformanceCycleById,
		listPerformanceCycles: hrPerfMocks.listPerformanceCycles,
		createPerformanceGoal: hrPerfMocks.createPerformanceGoal,
		listEmployeeGoals: hrPerfMocks.listEmployeeGoals,
		startPerformanceReview: hrPerfMocks.startPerformanceReview,
		getPerformanceReviewById: hrPerfMocks.getPerformanceReviewById,
		listEmployeePerformanceReviews: hrPerfMocks.listEmployeePerformanceReviews,
		listReviewsPendingManagerAction:
			hrPerfMocks.listReviewsPendingManagerAction,
		createImprovementPlan: hrPerfMocks.createImprovementPlan,
		getEmployeePerformanceHistory: hrPerfMocks.getEmployeePerformanceHistory,
	};
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	acknowledgeImprovementPlanAction,
	acknowledgePerformanceReviewAction,
	activatePerformanceGoalAction,
	addCycleParticipantAction,
	alignPerformanceGoalAction,
	amendImprovementPlanAction,
	approvePerformanceGoalAction,
	calibratePerformanceReviewAction,
	cancelImprovementPlanAction,
	cancelPerformanceCycleAction,
	cancelPerformanceGoalAction,
	closeImprovementPlanUnsuccessfulAction,
	closePerformanceCycleAction,
	closePerformanceGoalAction,
	completeImprovementPlanAction,
	createPerformanceCycleAction,
	createPerformanceGoalAction,
	enrollEligibleCycleParticipantsAction,
	finalizePerformanceReviewAction,
	getEmployeePerformanceHistoryAction,
	getImprovementPlanByIdAction,
	getPerformanceCycleByIdAction,
	getPerformanceCycleEligibilityAction,
	getPerformanceGoalByIdAction,
	listActiveImprovementPlansAction,
	listCycleParticipantsAction,
	listEmployeeGoalsAction,
	listGoalProgressAction,
	listImprovementPlanCheckpointsAction,
	listPerformanceCycleReviewPeriodsAction,
	listPerformanceCyclesAction,
	listReviewsPendingManagerActionAction,
	openImprovementPlanAction,
	openPerformanceCycleAction,
	publishPerformanceCycleAction,
	recordGoalProgressAction,
	recordImprovementCheckpointAction,
	rejectPerformanceGoalAction,
	removeCycleParticipantAction,
	reopenPerformanceReviewAction,
	returnPerformanceReviewForCorrectionAction,
	setPerformanceCycleEligibilityAction,
	setPerformanceCycleReviewPeriodsAction,
	startPerformanceReviewAction,
	submitManagerAssessmentAction,
	submitPerformanceGoalAction,
	submitSelfAssessmentAction,
	updatePerformanceCycleAction,
	updatePerformanceGoalAction,
} from "../app/actions/hr-performance";

const employeeId = "11111111-1111-4111-8111-111111111111";
const employmentId = "22222222-2222-4222-8222-222222222222";
const cycleId = "33333333-3333-4333-8333-333333333333";
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
					getEmployeePerformanceHistoryAction({
						employeeId,
						includeConfidential: false,
					}),
				mock: hrPerfMocks.getEmployeePerformanceHistory,
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
			{
				invoke: () => updatePerformanceCycleAction({}),
				mock: hrPerfMocks.updatePerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => publishPerformanceCycleAction({}),
				mock: hrPerfMocks.publishPerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => closePerformanceCycleAction({}),
				mock: hrPerfMocks.closePerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => cancelPerformanceCycleAction({}),
				mock: hrPerfMocks.cancelPerformanceCycle,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => setPerformanceCycleReviewPeriodsAction({}),
				mock: hrPerfMocks.setPerformanceCycleReviewPeriods,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => listPerformanceCycleReviewPeriodsAction({}),
				mock: hrPerfMocks.listPerformanceCycleReviewPeriods,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => setPerformanceCycleEligibilityAction({}),
				mock: hrPerfMocks.setPerformanceCycleEligibility,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => getPerformanceCycleEligibilityAction({}),
				mock: hrPerfMocks.getPerformanceCycleEligibility,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => enrollEligibleCycleParticipantsAction({}),
				mock: hrPerfMocks.enrollEligibleCycleParticipants,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => addCycleParticipantAction({}),
				mock: hrPerfMocks.addCycleParticipant,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => removeCycleParticipantAction({}),
				mock: hrPerfMocks.removeCycleParticipant,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => listCycleParticipantsAction({}),
				mock: hrPerfMocks.listCycleParticipants,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => updatePerformanceGoalAction({}),
				mock: hrPerfMocks.updatePerformanceGoal,
				permission: "human-resources.performance.goal.own.manage",
			},
			{
				invoke: () => submitPerformanceGoalAction({}),
				mock: hrPerfMocks.submitPerformanceGoal,
				permission: "human-resources.performance.goal.own.manage",
			},
			{
				invoke: () => approvePerformanceGoalAction({}),
				mock: hrPerfMocks.approvePerformanceGoal,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => rejectPerformanceGoalAction({}),
				mock: hrPerfMocks.rejectPerformanceGoal,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => recordGoalProgressAction({}),
				mock: hrPerfMocks.recordGoalProgress,
				permission: "human-resources.performance.goal.own.manage",
			},
			{
				invoke: () => activatePerformanceGoalAction({}),
				mock: hrPerfMocks.activatePerformanceGoal,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => alignPerformanceGoalAction({}),
				mock: hrPerfMocks.alignPerformanceGoal,
				permission: "human-resources.performance.manage",
			},
			{
				invoke: () => closePerformanceGoalAction({}),
				mock: hrPerfMocks.closePerformanceGoal,
				permission: "human-resources.performance.goal.own.manage",
			},
			{
				invoke: () => cancelPerformanceGoalAction({}),
				mock: hrPerfMocks.cancelPerformanceGoal,
				permission: "human-resources.performance.goal.own.manage",
			},
			{
				invoke: () => getPerformanceGoalByIdAction({}),
				mock: hrPerfMocks.getPerformanceGoalById,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () => listGoalProgressAction({}),
				mock: hrPerfMocks.listGoalProgress,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () => submitSelfAssessmentAction({}),
				mock: hrPerfMocks.submitSelfAssessment,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () => submitManagerAssessmentAction({}),
				mock: hrPerfMocks.submitManagerAssessment,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => returnPerformanceReviewForCorrectionAction({}),
				mock: hrPerfMocks.returnPerformanceReviewForCorrection,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => acknowledgePerformanceReviewAction({}),
				mock: hrPerfMocks.acknowledgePerformanceReview,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () => finalizePerformanceReviewAction({}),
				mock: hrPerfMocks.finalizePerformanceReview,
				permission: "human-resources.performance.manager.manage",
			},
			{
				invoke: () => reopenPerformanceReviewAction({}),
				mock: hrPerfMocks.reopenPerformanceReview,
				permission: "human-resources.performance.review.reopen",
			},
			{
				invoke: () => calibratePerformanceReviewAction({}),
				mock: hrPerfMocks.calibratePerformanceReview,
				permission: "human-resources.performance.confidential.read",
			},
			{
				invoke: () => openImprovementPlanAction({}),
				mock: hrPerfMocks.openImprovementPlan,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => acknowledgeImprovementPlanAction({}),
				mock: hrPerfMocks.acknowledgeImprovementPlan,
				permission: "human-resources.performance.own.read",
			},
			{
				invoke: () => recordImprovementCheckpointAction({}),
				mock: hrPerfMocks.recordImprovementCheckpoint,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => amendImprovementPlanAction({}),
				mock: hrPerfMocks.amendImprovementPlan,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => completeImprovementPlanAction({}),
				mock: hrPerfMocks.completeImprovementPlan,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => closeImprovementPlanUnsuccessfulAction({}),
				mock: hrPerfMocks.closeImprovementPlanUnsuccessful,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => cancelImprovementPlanAction({}),
				mock: hrPerfMocks.cancelImprovementPlan,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => getImprovementPlanByIdAction({}),
				mock: hrPerfMocks.getImprovementPlanById,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => listActiveImprovementPlansAction({}),
				mock: hrPerfMocks.listActiveImprovementPlans,
				permission: "human-resources.performance.improvement-plan.manage",
			},
			{
				invoke: () => listImprovementPlanCheckpointsAction({}),
				mock: hrPerfMocks.listImprovementPlanCheckpoints,
				permission: "human-resources.performance.improvement-plan.manage",
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
