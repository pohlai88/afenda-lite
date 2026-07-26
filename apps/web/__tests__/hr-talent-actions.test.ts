/**
 * HR Talent Server Actions — permission deny, validation, org stamp, delegate.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-hr-talent-operator",
	orgId: "org-hr-talent-active",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const permissionMocks = vi.hoisted(() => ({
	forbidUnlessPermission: vi.fn(),
}));

const hrTalentMocks = vi.hoisted(() => ({
	acknowledgeCareerPlan: vi.fn(),
	addCareerPlanAction: vi.fn(),
	approveSuccessionCandidate: vi.fn(),
	approveTalentPoolMember: vi.fn(),
	archiveTalentProfile: vi.fn(),
	assessEmployeeCompetency: vi.fn(),
	assessSuccessionReadiness: vi.fn(),
	closeCareerPlan: vi.fn(),
	closeSuccessionPlan: vi.fn(),
	closeTalentPool: vi.fn(),
	completeCareerPlanAction: vi.fn(),
	confirmTalentProfileAssessment: vi.fn(),
	createCareerPlan: vi.fn(),
	createCompetency: vi.fn(),
	createSuccessionPlan: vi.fn(),
	createTalentPool: vi.fn(),
	createTalentProfile: vi.fn(),
	expireCompetencyAssessment: vi.fn(),
	getCareerPlanById: vi.fn(),
	getCompetencyById: vi.fn(),
	getEmployeeCompetencyProfile: vi.fn(),
	getPositionSuccessionCoverage: vi.fn(),
	getSuccessionPlanById: vi.fn(),
	getTalentProfileByEmployee: vi.fn(),
	listCompetencies: vi.fn(),
	listCriticalRoleReadiness: vi.fn(),
	listEmployeeCareerPlans: vi.fn(),
	listJobCompetencies: vi.fn(),
	listSuccessionCandidates: vi.fn(),
	listSuccessionPlans: vi.fn(),
	listTalentPoolMembers: vi.fn(),
	listTalentProfileAssessments: vi.fn(),
	listTalentProfileMobility: vi.fn(),
	mapCompetencyToJob: vi.fn(),
	nominateSuccessionCandidate: vi.fn(),
	nominateTalentPoolMember: vi.fn(),
	recordCriticalRoleReadiness: vi.fn(),
	recordTalentProfileAssessment: vi.fn(),
	recordTalentProfileMobility: vi.fn(),
	removeCompetencyFromJob: vi.fn(),
	removeSuccessionCandidate: vi.fn(),
	removeTalentPoolMember: vi.fn(),
	retireCompetency: vi.fn(),
	supersedeCompetencyAssessment: vi.fn(),
	updateCareerPlan: vi.fn(),
	updateCompetency: vi.fn(),
	updateSuccessionPlan: vi.fn(),
	updateTalentPool: vi.fn(),
	updateTalentProfile: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@/app/actions/permission-gate", () => ({
	forbidUnlessPermission: permissionMocks.forbidUnlessPermission,
}));

vi.mock("@afenda/http", () => ({
	createCorrelationId: () => "corr-hr-talent-test",
}));

vi.mock("@afenda/human-resources", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@afenda/human-resources")>();
	return { ...actual, ...hrTalentMocks };
});

vi.mock("@/lib/erp/human-resources-command-options", () => ({
	createHumanResourcesCommandOptions: () => ({
		authorization: { can: vi.fn() },
	}),
}));

import {
	acknowledgeCareerPlanAction,
	addCareerPlanItemAction,
	approveSuccessionCandidateAction,
	approveTalentPoolMemberAction,
	archiveTalentProfileAction,
	assessEmployeeCompetencyAction,
	assessSuccessionReadinessAction,
	closeCareerPlanAction,
	closeSuccessionPlanAction,
	closeTalentPoolAction,
	completeCareerPlanItemAction,
	confirmTalentProfileAssessmentAction,
	createCareerPlanAction,
	createCompetencyAction,
	createSuccessionPlanAction,
	createTalentPoolAction,
	createTalentProfileAction,
	expireCompetencyAssessmentAction,
	getCareerPlanByIdAction,
	getCompetencyByIdAction,
	getEmployeeCompetencyProfileAction,
	getPositionSuccessionCoverageAction,
	getSuccessionPlanByIdAction,
	getTalentProfileByEmployeeAction,
	listCompetenciesAction,
	listCriticalRoleReadinessAction,
	listEmployeeCareerPlansAction,
	listJobCompetenciesAction,
	listSuccessionCandidatesAction,
	listSuccessionPlansAction,
	listTalentPoolMembersAction,
	listTalentProfileAssessmentsAction,
	listTalentProfileMobilityAction,
	mapCompetencyToJobAction,
	nominateSuccessionCandidateAction,
	nominateTalentPoolMemberAction,
	recordCriticalRoleReadinessAction,
	recordTalentProfileAssessmentAction,
	recordTalentProfileMobilityAction,
	removeCompetencyFromJobAction,
	removeSuccessionCandidateAction,
	removeTalentPoolMemberAction,
	retireCompetencyAction,
	supersedeCompetencyAssessmentAction,
	updateCareerPlanAction,
	updateCompetencyAction,
	updateSuccessionPlanAction,
	updateTalentPoolAction,
	updateTalentProfileAction,
} from "../app/actions/hr-talent";

const employeeId = "11111111-1111-4111-8111-111111111111";

describe("HR Talent Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
		permissionMocks.forbidUnlessPermission.mockResolvedValue(null);
		hrTalentMocks.createTalentProfile.mockResolvedValue({
			ok: true,
			data: { id: "22222222-2222-4222-8222-222222222222", employeeId },
		});
	});

	it("denies talent and succession Actions before package invocation", async () => {
		const cases = [
			[
				createTalentProfileAction,
				hrTalentMocks.createTalentProfile,
				"human-resources.talent.admin",
			],
			[
				updateTalentProfileAction,
				hrTalentMocks.updateTalentProfile,
				"human-resources.talent.admin",
			],
			[
				archiveTalentProfileAction,
				hrTalentMocks.archiveTalentProfile,
				"human-resources.talent.admin",
			],
			[
				getTalentProfileByEmployeeAction,
				hrTalentMocks.getTalentProfileByEmployee,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				recordTalentProfileAssessmentAction,
				hrTalentMocks.recordTalentProfileAssessment,
				"human-resources.talent.admin",
			],
			[
				confirmTalentProfileAssessmentAction,
				hrTalentMocks.confirmTalentProfileAssessment,
				"human-resources.talent.admin",
			],
			[
				listTalentProfileAssessmentsAction,
				hrTalentMocks.listTalentProfileAssessments,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				recordTalentProfileMobilityAction,
				hrTalentMocks.recordTalentProfileMobility,
				"human-resources.talent.admin",
			],
			[
				listTalentProfileMobilityAction,
				hrTalentMocks.listTalentProfileMobility,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				createCompetencyAction,
				hrTalentMocks.createCompetency,
				"human-resources.talent.admin",
			],
			[
				updateCompetencyAction,
				hrTalentMocks.updateCompetency,
				"human-resources.talent.admin",
			],
			[
				retireCompetencyAction,
				hrTalentMocks.retireCompetency,
				"human-resources.talent.admin",
			],
			[
				mapCompetencyToJobAction,
				hrTalentMocks.mapCompetencyToJob,
				"human-resources.talent.admin",
			],
			[
				removeCompetencyFromJobAction,
				hrTalentMocks.removeCompetencyFromJob,
				"human-resources.talent.admin",
			],
			[
				assessEmployeeCompetencyAction,
				hrTalentMocks.assessEmployeeCompetency,
				"human-resources.talent.admin",
			],
			[
				supersedeCompetencyAssessmentAction,
				hrTalentMocks.supersedeCompetencyAssessment,
				"human-resources.talent.admin",
			],
			[
				expireCompetencyAssessmentAction,
				hrTalentMocks.expireCompetencyAssessment,
				"human-resources.talent.admin",
			],
			[
				getCompetencyByIdAction,
				hrTalentMocks.getCompetencyById,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				listCompetenciesAction,
				hrTalentMocks.listCompetencies,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				listJobCompetenciesAction,
				hrTalentMocks.listJobCompetencies,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				getEmployeeCompetencyProfileAction,
				hrTalentMocks.getEmployeeCompetencyProfile,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				createCareerPlanAction,
				hrTalentMocks.createCareerPlan,
				"human-resources.talent.admin",
			],
			[
				updateCareerPlanAction,
				hrTalentMocks.updateCareerPlan,
				"human-resources.talent.admin",
			],
			[
				acknowledgeCareerPlanAction,
				hrTalentMocks.acknowledgeCareerPlan,
				"human-resources.talent.admin",
			],
			[
				addCareerPlanItemAction,
				hrTalentMocks.addCareerPlanAction,
				"human-resources.talent.admin",
			],
			[
				completeCareerPlanItemAction,
				hrTalentMocks.completeCareerPlanAction,
				"human-resources.talent.admin",
			],
			[
				closeCareerPlanAction,
				hrTalentMocks.closeCareerPlan,
				"human-resources.talent.admin",
			],
			[
				getCareerPlanByIdAction,
				hrTalentMocks.getCareerPlanById,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				listEmployeeCareerPlansAction,
				hrTalentMocks.listEmployeeCareerPlans,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				recordCriticalRoleReadinessAction,
				hrTalentMocks.recordCriticalRoleReadiness,
				"human-resources.succession.admin",
			],
			[
				listCriticalRoleReadinessAction,
				hrTalentMocks.listCriticalRoleReadiness,
				"human-resources.succession.executive.read",
			],
			[
				createTalentPoolAction,
				hrTalentMocks.createTalentPool,
				"human-resources.talent.admin",
			],
			[
				updateTalentPoolAction,
				hrTalentMocks.updateTalentPool,
				"human-resources.talent.admin",
			],
			[
				closeTalentPoolAction,
				hrTalentMocks.closeTalentPool,
				"human-resources.talent.admin",
			],
			[
				nominateTalentPoolMemberAction,
				hrTalentMocks.nominateTalentPoolMember,
				"human-resources.talent.admin",
			],
			[
				approveTalentPoolMemberAction,
				hrTalentMocks.approveTalentPoolMember,
				"human-resources.talent.admin",
			],
			[
				removeTalentPoolMemberAction,
				hrTalentMocks.removeTalentPoolMember,
				"human-resources.talent.admin",
			],
			[
				listTalentPoolMembersAction,
				hrTalentMocks.listTalentPoolMembers,
				"human-resources.talent.profile.sensitive.read",
			],
			[
				createSuccessionPlanAction,
				hrTalentMocks.createSuccessionPlan,
				"human-resources.succession.admin",
			],
			[
				updateSuccessionPlanAction,
				hrTalentMocks.updateSuccessionPlan,
				"human-resources.succession.admin",
			],
			[
				closeSuccessionPlanAction,
				hrTalentMocks.closeSuccessionPlan,
				"human-resources.succession.admin",
			],
			[
				nominateSuccessionCandidateAction,
				hrTalentMocks.nominateSuccessionCandidate,
				"human-resources.succession.admin",
			],
			[
				assessSuccessionReadinessAction,
				hrTalentMocks.assessSuccessionReadiness,
				"human-resources.succession.admin",
			],
			[
				approveSuccessionCandidateAction,
				hrTalentMocks.approveSuccessionCandidate,
				"human-resources.succession.admin",
			],
			[
				removeSuccessionCandidateAction,
				hrTalentMocks.removeSuccessionCandidate,
				"human-resources.succession.admin",
			],
			[
				getSuccessionPlanByIdAction,
				hrTalentMocks.getSuccessionPlanById,
				"human-resources.succession.executive.read",
			],
			[
				listSuccessionPlansAction,
				hrTalentMocks.listSuccessionPlans,
				"human-resources.succession.executive.read",
			],
			[
				listSuccessionCandidatesAction,
				hrTalentMocks.listSuccessionCandidates,
				"human-resources.succession.executive.read",
			],
			[
				getPositionSuccessionCoverageAction,
				hrTalentMocks.getPositionSuccessionCoverage,
				"human-resources.succession.executive.read",
			],
		] as const;

		for (const [invoke, mock, permission] of cases) {
			vi.clearAllMocks();
			permissionMocks.forbidUnlessPermission.mockResolvedValue({
				ok: false,
				code: "FORBIDDEN",
				message: "Talent is not permitted.",
			});

			const result = await invoke({});
			expect(result).toEqual({
				ok: false,
				code: "FORBIDDEN",
				message: "Talent is not permitted.",
			});
			expect(mock).not.toHaveBeenCalled();
			expect(permissionMocks.forbidUnlessPermission).toHaveBeenCalledWith(
				operatorSession,
				permission,
			);
		}
	});

	it("stamps org and actor on createTalentProfileAction", async () => {
		const result = await createTalentProfileAction({
			idempotencyKey: "idem-talent-profile-1",
			employeeId,
			summary: "Ready for broader role.",
		});

		expect(result.ok).toBe(true);
		expect(hrTalentMocks.createTalentProfile).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: operatorSession.orgId,
				actorUserId: operatorSession.userId,
				correlationId: "corr-hr-talent-test",
				employeeId,
			}),
			expect.objectContaining({ authorization: expect.anything() }),
		);
	});
});
