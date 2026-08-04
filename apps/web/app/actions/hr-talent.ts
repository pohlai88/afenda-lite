"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanListPage,
	CareerPlanWithActions,
	Competency,
	CompetencyAssessment,
	CompetencyListPage,
	JobCompetency,
	JobCompetencyListPage,
	PositionSuccessionCoverage,
	ProjectedEmployeeCompetencyProfile,
	ProjectedSuccessionCandidateListPage,
	ProjectedTalentCriticalRoleReadinessListPage,
	ProjectedTalentProfileAssessmentListPage,
	ProjectedTalentProfileMobilityListPage,
	SuccessionCandidate,
	SuccessionPlan,
	SuccessionPlanListPage,
	TalentCriticalRoleReadiness,
	TalentPool,
	TalentPoolMember,
	TalentPoolMemberListPage,
	TalentProfile,
	TalentProfileAssessment,
	TalentProfileMobility,
} from "@afenda/human-resources";
import {
	acknowledgeCareerPlan,
	acknowledgeCareerPlanInputSchema,
	addCareerPlanAction as addCareerPlanActionCommand,
	addCareerPlanActionInputSchema,
	approveSuccessionCandidate,
	approveSuccessionCandidateInputSchema,
	approveTalentPoolMember,
	approveTalentPoolMemberInputSchema,
	archiveTalentProfile,
	archiveTalentProfileInputSchema,
	assessEmployeeCompetency,
	assessEmployeeCompetencyInputSchema,
	assessSuccessionReadiness,
	assessSuccessionReadinessInputSchema,
	closeCareerPlan,
	closeCareerPlanInputSchema,
	closeSuccessionPlan,
	closeTalentPool,
	closeTalentPoolInputSchema,
	completeCareerPlanAction as completeCareerPlanActionCommand,
	completeCareerPlanActionInputSchema,
	confirmTalentProfileAssessment,
	confirmTalentProfileAssessmentInputSchema,
	createCareerPlan,
	createCareerPlanInputSchema,
	createCompetency,
	createCompetencyInputSchema,
	createSuccessionPlan,
	createSuccessionPlanInputSchema,
	createTalentPool,
	createTalentPoolInputSchema,
	createTalentProfile,
	createTalentProfileInputSchema,
	expireCompetencyAssessment,
	expireCompetencyAssessmentInputSchema,
	getCareerPlanById,
	getCareerPlanByIdInputSchema,
	getCompetencyById,
	getCompetencyByIdInputSchema,
	getEmployeeCompetencyProfile,
	getEmployeeCompetencyProfileInputSchema,
	getPositionSuccessionCoverage,
	getPositionSuccessionCoverageInputSchema,
	getSuccessionPlanById,
	getSuccessionPlanByIdInputSchema,
	getTalentProfileByEmployee,
	getTalentProfileByEmployeeInputSchema,
	listCompetencies,
	listCompetenciesInputSchema,
	listCriticalRoleReadiness,
	listCriticalRoleReadinessInputSchema,
	listEmployeeCareerPlans,
	listEmployeeCareerPlansInputSchema,
	listJobCompetencies,
	listJobCompetenciesInputSchema,
	listSuccessionCandidates,
	listSuccessionCandidatesInputSchema,
	listSuccessionPlans,
	listSuccessionPlansInputSchema,
	listTalentPoolMembers,
	listTalentPoolMembersInputSchema,
	listTalentProfileAssessments,
	listTalentProfileAssessmentsInputSchema,
	listTalentProfileMobility,
	listTalentProfileMobilityInputSchema,
	mapCompetencyToJob,
	mapCompetencyToJobInputSchema,
	nominateSuccessionCandidate,
	nominateSuccessionCandidateInputSchema,
	nominateTalentPoolMember,
	nominateTalentPoolMemberInputSchema,
	recordCriticalRoleReadiness,
	recordCriticalRoleReadinessInputSchema,
	recordTalentProfileAssessment,
	recordTalentProfileAssessmentInputSchema,
	recordTalentProfileMobility,
	recordTalentProfileMobilityInputSchema,
	removeCompetencyFromJob,
	removeCompetencyFromJobInputSchema,
	removeSuccessionCandidate,
	removeSuccessionCandidateInputSchema,
	removeTalentPoolMember,
	removeTalentPoolMemberInputSchema,
	retireCompetency,
	retireCompetencyInputSchema,
	successionPlanStatusTransitionInputSchema,
	supersedeCompetencyAssessment,
	supersedeCompetencyAssessmentInputSchema,
	updateCareerPlan,
	updateCareerPlanInputSchema,
	updateCompetency,
	updateCompetencyInputSchema,
	updateSuccessionPlan,
	updateSuccessionPlanInputSchema,
	updateTalentPool,
	updateTalentPoolInputSchema,
	updateTalentProfile,
	updateTalentProfileInputSchema,
} from "@afenda/human-resources";

import { defineAction } from "@/app/actions/_runtime/define-action";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import { runHrTalentOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";

const talentAdminPermission = "human-resources.talent.admin";
const talentSensitiveReadPermission =
	"human-resources.talent.profile.sensitive.read";
const successionAdminPermission = "human-resources.succession.admin";
const successionExecutiveReadPermission =
	"human-resources.succession.executive.read";

export async function createTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(createTalentProfileInputSchema),
		path: "createTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create talent profile.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile.",
			}),
		invoke: (stamped) =>
			createTalentProfile(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (profile: TalentProfile) => ({ profile }),
	});
}

export async function updateTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(updateTalentProfileInputSchema),
		path: "updateTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update talent profile.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile update.",
			}),
		invoke: (stamped) =>
			updateTalentProfile(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ profile: value }),
	});
}

export async function archiveTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(archiveTalentProfileInputSchema),
		path: "archiveTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not archive talent profile.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile archive request.",
			}),
		invoke: (stamped) =>
			archiveTalentProfile(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ profile: value }),
	});
}

export async function getTalentProfileByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile | null }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getTalentProfileByEmployeeInputSchema),
		path: "getTalentProfileByEmployeeAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get talent profile.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile lookup.",
			}),
		invoke: (stamped) =>
			getTalentProfileByEmployee(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ profile: value }),
	});
}

export async function recordTalentProfileAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: TalentProfileAssessment }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(recordTalentProfileAssessmentInputSchema),
		path: "recordTalentProfileAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not record talent profile assessment.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile assessment.",
			}),
		invoke: (stamped) =>
			recordTalentProfileAssessment(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ assessment: value }),
	});
}

export async function confirmTalentProfileAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: TalentProfileAssessment }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(confirmTalentProfileAssessmentInputSchema),
		path: "confirmTalentProfileAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not confirm talent profile assessment.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent profile assessment confirmation.",
			}),
		invoke: (stamped) =>
			confirmTalentProfileAssessment(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ assessment: value }),
	});
}

export async function listTalentProfileAssessmentsAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedTalentProfileAssessmentListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listTalentProfileAssessmentsInputSchema),
		path: "listTalentProfileAssessmentsAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent profile assessments.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid talent profile assessment filters.",
			}),
		invoke: (stamped) =>
			listTalentProfileAssessments(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function recordTalentProfileMobilityAction(
	input: unknown,
): Promise<ActionResult<{ mobility: TalentProfileMobility }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(recordTalentProfileMobilityInputSchema),
		path: "recordTalentProfileMobilityAction",
		permission: talentAdminPermission,
		safeMessage: "Could not record talent mobility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent mobility record.",
			}),
		invoke: (stamped) =>
			recordTalentProfileMobility(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ mobility: value }),
	});
}

export async function listTalentProfileMobilityAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedTalentProfileMobilityListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listTalentProfileMobilityInputSchema),
		path: "listTalentProfileMobilityAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent mobility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid talent mobility filters.",
			}),
		invoke: (stamped) =>
			listTalentProfileMobility(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function createCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(createCompetencyInputSchema),
		path: "createCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create competency.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency.",
			}),
		invoke: (stamped) =>
			createCompetency(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ competency: value }),
	});
}

export async function updateCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(updateCompetencyInputSchema),
		path: "updateCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update competency.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency update.",
			}),
		invoke: (stamped) =>
			updateCompetency(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ competency: value }),
	});
}

export async function retireCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(retireCompetencyInputSchema),
		path: "retireCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not retire competency.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency retire request.",
			}),
		invoke: (stamped) =>
			retireCompetency(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ competency: value }),
	});
}

export async function mapCompetencyToJobAction(
	input: unknown,
): Promise<ActionResult<{ jobCompetency: JobCompetency }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(mapCompetencyToJobInputSchema),
		path: "mapCompetencyToJobAction",
		permission: talentAdminPermission,
		safeMessage: "Could not map competency to job.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency job mapping.",
			}),
		invoke: (stamped) =>
			mapCompetencyToJob(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ jobCompetency: value }),
	});
}

export async function removeCompetencyFromJobAction(
	input: unknown,
): Promise<ActionResult<{ jobCompetency: JobCompetency }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(removeCompetencyFromJobInputSchema),
		path: "removeCompetencyFromJobAction",
		permission: talentAdminPermission,
		safeMessage: "Could not remove competency from job.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency job removal.",
			}),
		invoke: (stamped) =>
			removeCompetencyFromJob(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ jobCompetency: value }),
	});
}

export async function assessEmployeeCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(assessEmployeeCompetencyInputSchema),
		path: "assessEmployeeCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not assess employee competency.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee competency assessment.",
			}),
		invoke: (stamped) =>
			assessEmployeeCompetency(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ assessment: value }),
	});
}

export async function supersedeCompetencyAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(supersedeCompetencyAssessmentInputSchema),
		path: "supersedeCompetencyAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not supersede competency assessment.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency assessment supersession.",
			}),
		invoke: (stamped) =>
			supersedeCompetencyAssessment(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ assessment: value }),
	});
}

export async function expireCompetencyAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(expireCompetencyAssessmentInputSchema),
		path: "expireCompetencyAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not expire competency assessment.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency assessment expiry.",
			}),
		invoke: (stamped) =>
			expireCompetencyAssessment(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ assessment: value }),
	});
}

export async function getCompetencyByIdAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency | null }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getCompetencyByIdInputSchema),
		path: "getCompetencyByIdAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get competency.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid competency lookup.",
			}),
		invoke: (stamped) =>
			getCompetencyById(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ competency: value }),
	});
}

export async function listCompetenciesAction(
	input: unknown,
): Promise<ActionResult<{ page: CompetencyListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listCompetenciesInputSchema),
		path: "listCompetenciesAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list competencies.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid competency filters.",
			}),
		invoke: (stamped) =>
			listCompetencies(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ page: value }),
	});
}

export async function listJobCompetenciesAction(
	input: unknown,
): Promise<ActionResult<{ page: JobCompetencyListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listJobCompetenciesInputSchema),
		path: "listJobCompetenciesAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list job competencies.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid job competency filters.",
			}),
		invoke: (stamped) =>
			listJobCompetencies(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function getEmployeeCompetencyProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: ProjectedEmployeeCompetencyProfile }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getEmployeeCompetencyProfileInputSchema),
		path: "getEmployeeCompetencyProfileAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get employee competency profile.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee competency profile lookup.",
			}),
		invoke: (stamped) =>
			getEmployeeCompetencyProfile(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ profile: value }),
	});
}

export async function createCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(createCareerPlanInputSchema),
		path: "createCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create career plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan.",
			}),
		invoke: (stamped) =>
			createCareerPlan(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ plan: value }),
	});
}

export async function updateCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(updateCareerPlanInputSchema),
		path: "updateCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update career plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan update.",
			}),
		invoke: (stamped) =>
			updateCareerPlan(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ plan: value }),
	});
}

export async function acknowledgeCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(acknowledgeCareerPlanInputSchema),
		path: "acknowledgeCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not acknowledge career plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan acknowledgement.",
			}),
		invoke: (stamped) =>
			acknowledgeCareerPlan(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ plan: value }),
	});
}

export async function addCareerPlanItemAction(
	input: unknown,
): Promise<ActionResult<{ action: CareerPlanAction }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(addCareerPlanActionInputSchema),
		path: "addCareerPlanItemAction",
		permission: talentAdminPermission,
		safeMessage: "Could not add career plan action.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan action.",
			}),
		invoke: (stamped) =>
			addCareerPlanActionCommand(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ action: value }),
	});
}

export async function completeCareerPlanItemAction(
	input: unknown,
): Promise<ActionResult<{ action: CareerPlanAction }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(completeCareerPlanActionInputSchema),
		path: "completeCareerPlanItemAction",
		permission: talentAdminPermission,
		safeMessage: "Could not complete career plan action.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan action completion.",
			}),
		invoke: (stamped) =>
			completeCareerPlanActionCommand(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ action: value }),
	});
}

export async function closeCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(closeCareerPlanInputSchema),
		path: "closeCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not close career plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan closure.",
			}),
		invoke: (stamped) =>
			closeCareerPlan(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ plan: value }),
	});
}

export async function getCareerPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlanWithActions | null }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getCareerPlanByIdInputSchema),
		path: "getCareerPlanByIdAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get career plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid career plan lookup.",
			}),
		invoke: (stamped) =>
			getCareerPlanById(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ plan: value }),
	});
}

export async function listEmployeeCareerPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: CareerPlanListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listEmployeeCareerPlansInputSchema),
		path: "listEmployeeCareerPlansAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list employee career plans.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid employee career plan filters.",
			}),
		invoke: (stamped) =>
			listEmployeeCareerPlans(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function recordCriticalRoleReadinessAction(
	input: unknown,
): Promise<ActionResult<{ readiness: TalentCriticalRoleReadiness }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(recordCriticalRoleReadinessInputSchema),
		path: "recordCriticalRoleReadinessAction",
		permission: successionAdminPermission,
		safeMessage: "Could not record critical role readiness.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid critical role readiness record.",
			}),
		invoke: (stamped) =>
			recordCriticalRoleReadiness(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ readiness: value }),
	});
}

export async function listCriticalRoleReadinessAction(
	input: unknown,
): Promise<
	ActionResult<{ page: ProjectedTalentCriticalRoleReadinessListPage }>
> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listCriticalRoleReadinessInputSchema),
		path: "listCriticalRoleReadinessAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list critical role readiness.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid critical role readiness filters.",
			}),
		invoke: (stamped) =>
			listCriticalRoleReadiness(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function createTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(createTalentPoolInputSchema),
		path: "createTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create talent pool.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool.",
			}),
		invoke: (stamped) =>
			createTalentPool(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ pool: value }),
	});
}

export async function updateTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(updateTalentPoolInputSchema),
		path: "updateTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update talent pool.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool update.",
			}),
		invoke: (stamped) =>
			updateTalentPool(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ pool: value }),
	});
}

export async function closeTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(closeTalentPoolInputSchema),
		path: "closeTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not close talent pool.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool closure.",
			}),
		invoke: (stamped) =>
			closeTalentPool(stamped as never, createHumanResourcesCommandOptions()),
		project: (value) => ({ pool: value }),
	});
}

export async function nominateTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(nominateTalentPoolMemberInputSchema),
		path: "nominateTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not nominate talent pool member.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool nomination.",
			}),
		invoke: (stamped) =>
			nominateTalentPoolMember(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ member: value }),
	});
}

export async function approveTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(approveTalentPoolMemberInputSchema),
		path: "approveTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not approve talent pool member.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool approval.",
			}),
		invoke: (stamped) =>
			approveTalentPoolMember(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ member: value }),
	});
}

export async function removeTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(removeTalentPoolMemberInputSchema),
		path: "removeTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not remove talent pool member.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid talent pool member removal.",
			}),
		invoke: (stamped) =>
			removeTalentPoolMember(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ member: value }),
	});
}

export async function listTalentPoolMembersAction(
	input: unknown,
): Promise<ActionResult<{ page: TalentPoolMemberListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listTalentPoolMembersInputSchema),
		path: "listTalentPoolMembersAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent pool members.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid talent pool member filters.",
			}),
		invoke: (stamped) =>
			listTalentPoolMembers(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function createSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(createSuccessionPlanInputSchema),
		path: "createSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not create succession plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession plan.",
			}),
		invoke: (stamped) =>
			createSuccessionPlan(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ plan: value }),
	});
}

export async function updateSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(updateSuccessionPlanInputSchema),
		path: "updateSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not update succession plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession plan update.",
			}),
		invoke: (stamped) =>
			updateSuccessionPlan(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ plan: value }),
	});
}

export async function closeSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(successionPlanStatusTransitionInputSchema),
		path: "closeSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not close succession plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession plan closure.",
			}),
		invoke: (stamped) =>
			closeSuccessionPlan(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ plan: value }),
	});
}

export async function nominateSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(nominateSuccessionCandidateInputSchema),
		path: "nominateSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not nominate succession candidate.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession candidate nomination.",
			}),
		invoke: (stamped) =>
			nominateSuccessionCandidate(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ candidate: value }),
	});
}

export async function assessSuccessionReadinessAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(assessSuccessionReadinessInputSchema),
		path: "assessSuccessionReadinessAction",
		permission: successionAdminPermission,
		safeMessage: "Could not assess succession readiness.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession readiness assessment.",
			}),
		invoke: (stamped) =>
			assessSuccessionReadiness(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ candidate: value }),
	});
}

export async function approveSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(approveSuccessionCandidateInputSchema),
		path: "approveSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not approve succession candidate.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession candidate approval.",
			}),
		invoke: (stamped) =>
			approveSuccessionCandidate(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ candidate: value }),
	});
}

export async function removeSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(removeSuccessionCandidateInputSchema),
		path: "removeSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not remove succession candidate.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession candidate removal.",
			}),
		invoke: (stamped) =>
			removeSuccessionCandidate(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ candidate: value }),
	});
}

export async function getSuccessionPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan | null }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getSuccessionPlanByIdInputSchema),
		path: "getSuccessionPlanByIdAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not get succession plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid succession plan lookup.",
			}),
		invoke: (stamped) =>
			getSuccessionPlanById(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ plan: value }),
	});
}

export async function listSuccessionPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: SuccessionPlanListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listSuccessionPlansInputSchema),
		path: "listSuccessionPlansAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list succession plans.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid succession plan filters.",
			}),
		invoke: (stamped) =>
			listSuccessionPlans(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function listSuccessionCandidatesAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedSuccessionCandidateListPage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(listSuccessionCandidatesInputSchema),
		path: "listSuccessionCandidatesAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list succession candidates.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid succession candidate filters.",
			}),
		invoke: (stamped) =>
			listSuccessionCandidates(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ page: value }),
	});
}

export async function getPositionSuccessionCoverageAction(
	input: unknown,
): Promise<ActionResult<{ coverage: PositionSuccessionCoverage }>> {
	return await defineAction({
		runner: runOperatorPermissionAction,
		input,
		schema: hrActionSchema(getPositionSuccessionCoverageInputSchema),
		path: "getPositionSuccessionCoverageAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not get position succession coverage.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid position succession coverage request.",
			}),
		invoke: (stamped) =>
			getPositionSuccessionCoverage(
				stamped as never,
				createHumanResourcesCommandOptions(),
			),
		project: (value) => ({ coverage: value }),
	});
}
