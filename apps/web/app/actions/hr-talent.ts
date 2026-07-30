"use server";

import type { Result } from "@afenda/errors/result";
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
	addCareerPlanAction as addCareerPlanActionCommand,
	approveSuccessionCandidate,
	approveTalentPoolMember,
	archiveTalentProfile,
	assessEmployeeCompetency,
	assessSuccessionReadiness,
	closeCareerPlan,
	closeSuccessionPlan,
	closeTalentPool,
	completeCareerPlanAction as completeCareerPlanActionCommand,
	confirmTalentProfileAssessment,
	createCareerPlan,
	createCompetency,
	createSuccessionPlan,
	createTalentPool,
	createTalentProfile,
	expireCompetencyAssessment,
	getCareerPlanById,
	getCompetencyById,
	getEmployeeCompetencyProfile,
	getPositionSuccessionCoverage,
	getSuccessionPlanById,
	getTalentProfileByEmployee,
	listCompetencies,
	listCriticalRoleReadiness,
	listEmployeeCareerPlans,
	listJobCompetencies,
	listSuccessionCandidates,
	listSuccessionPlans,
	listTalentPoolMembers,
	listTalentProfileAssessments,
	listTalentProfileMobility,
	mapCompetencyToJob,
	nominateSuccessionCandidate,
	nominateTalentPoolMember,
	recordCriticalRoleReadiness,
	recordTalentProfileAssessment,
	recordTalentProfileMobility,
	removeCompetencyFromJob,
	removeSuccessionCandidate,
	removeTalentPoolMember,
	retireCompetency,
	supersedeCompetencyAssessment,
	updateCareerPlan,
	updateCompetency,
	updateSuccessionPlan,
	updateTalentPool,
	updateTalentProfile,
} from "@afenda/human-resources";
import {
	acknowledgeCareerPlanInputSchema,
	addCareerPlanActionInputSchema,
	approveSuccessionCandidateInputSchema,
	approveTalentPoolMemberInputSchema,
	archiveTalentProfileInputSchema,
	assessEmployeeCompetencyInputSchema,
	assessSuccessionReadinessInputSchema,
	closeCareerPlanInputSchema,
	closeTalentPoolInputSchema,
	completeCareerPlanActionInputSchema,
	confirmTalentProfileAssessmentInputSchema,
	createCareerPlanInputSchema,
	createCompetencyInputSchema,
	createSuccessionPlanInputSchema,
	createTalentPoolInputSchema,
	createTalentProfileInputSchema,
	expireCompetencyAssessmentInputSchema,
	getCareerPlanByIdInputSchema,
	getCompetencyByIdInputSchema,
	getEmployeeCompetencyProfileInputSchema,
	getPositionSuccessionCoverageInputSchema,
	getSuccessionPlanByIdInputSchema,
	getTalentProfileByEmployeeInputSchema,
	listCompetenciesInputSchema,
	listCriticalRoleReadinessInputSchema,
	listEmployeeCareerPlansInputSchema,
	listJobCompetenciesInputSchema,
	listSuccessionCandidatesInputSchema,
	listSuccessionPlansInputSchema,
	listTalentPoolMembersInputSchema,
	listTalentProfileAssessmentsInputSchema,
	listTalentProfileMobilityInputSchema,
	mapCompetencyToJobInputSchema,
	nominateSuccessionCandidateInputSchema,
	nominateTalentPoolMemberInputSchema,
	recordCriticalRoleReadinessInputSchema,
	recordTalentProfileAssessmentInputSchema,
	recordTalentProfileMobilityInputSchema,
	removeCompetencyFromJobInputSchema,
	removeSuccessionCandidateInputSchema,
	removeTalentPoolMemberInputSchema,
	retireCompetencyInputSchema,
	successionPlanStatusTransitionInputSchema,
	supersedeCompetencyAssessmentInputSchema,
	updateCareerPlanInputSchema,
	updateCompetencyInputSchema,
	updateSuccessionPlanInputSchema,
	updateTalentPoolInputSchema,
	updateTalentProfileInputSchema,
} from "@afenda/human-resources/schemas";

import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrTalentOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const talentAdminPermission = "human-resources.talent.admin";
const talentSensitiveReadPermission =
	"human-resources.talent.profile.sensitive.read";
const successionAdminPermission = "human-resources.succession.admin";
const successionExecutiveReadPermission =
	"human-resources.succession.executive.read";

type TalentActionData<Key extends string, Value> = {
	[Property in Key]: Value;
};

async function runTalentAction<Key extends string, Value>(config: {
	input: unknown;
	schema: Parameters<typeof parseSchema>[0];
	path: string;
	permission: string;
	safeMessage: string;
	validationMessage: string;
	dataKey: Key;
	execute: (input: never) => Promise<Result<Value>>;
}): Promise<ActionResult<TalentActionData<Key, Value>>> {
	return await runOperatorPermissionAction({
		path: config.path,
		permission: config.permission,
		safeMessage: config.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.schema, config.input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					config.validationMessage,
					parsed.details,
				);
			}
			const result = await config.execute(
				withSessionContext(
					session,
					correlationId,
					parsed.data as Record<string, unknown>,
				) as never,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: { [config.dataKey]: mapped.data } as TalentActionData<Key, Value>,
			};
		},
	});
}

export async function createTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(createTalentProfileInputSchema),
		path: "createTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create talent profile.",
		validationMessage: "Enter a valid talent profile.",
		dataKey: "profile",
		execute: (data) =>
			createTalentProfile(data, createHumanResourcesCommandOptions()),
	});
}

export async function updateTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(updateTalentProfileInputSchema),
		path: "updateTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update talent profile.",
		validationMessage: "Enter a valid talent profile update.",
		dataKey: "profile",
		execute: (data) =>
			updateTalentProfile(data, createHumanResourcesCommandOptions()),
	});
}

export async function archiveTalentProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(archiveTalentProfileInputSchema),
		path: "archiveTalentProfileAction",
		permission: talentAdminPermission,
		safeMessage: "Could not archive talent profile.",
		validationMessage: "Enter a valid talent profile archive request.",
		dataKey: "profile",
		execute: (data) =>
			archiveTalentProfile(data, createHumanResourcesCommandOptions()),
	});
}

export async function getTalentProfileByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ profile: TalentProfile | null }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getTalentProfileByEmployeeInputSchema),
		path: "getTalentProfileByEmployeeAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get talent profile.",
		validationMessage: "Enter a valid talent profile lookup.",
		dataKey: "profile",
		execute: (data) =>
			getTalentProfileByEmployee(data, createHumanResourcesCommandOptions()),
	});
}

export async function recordTalentProfileAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: TalentProfileAssessment }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(recordTalentProfileAssessmentInputSchema),
		path: "recordTalentProfileAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not record talent profile assessment.",
		validationMessage: "Enter a valid talent profile assessment.",
		dataKey: "assessment",
		execute: (data) =>
			recordTalentProfileAssessment(data, createHumanResourcesCommandOptions()),
	});
}

export async function confirmTalentProfileAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: TalentProfileAssessment }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(confirmTalentProfileAssessmentInputSchema),
		path: "confirmTalentProfileAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not confirm talent profile assessment.",
		validationMessage: "Enter a valid talent profile assessment confirmation.",
		dataKey: "assessment",
		execute: (data) =>
			confirmTalentProfileAssessment(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function listTalentProfileAssessmentsAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedTalentProfileAssessmentListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listTalentProfileAssessmentsInputSchema),
		path: "listTalentProfileAssessmentsAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent profile assessments.",
		validationMessage: "Enter valid talent profile assessment filters.",
		dataKey: "page",
		execute: (data) =>
			listTalentProfileAssessments(data, createHumanResourcesCommandOptions()),
	});
}

export async function recordTalentProfileMobilityAction(
	input: unknown,
): Promise<ActionResult<{ mobility: TalentProfileMobility }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(recordTalentProfileMobilityInputSchema),
		path: "recordTalentProfileMobilityAction",
		permission: talentAdminPermission,
		safeMessage: "Could not record talent mobility.",
		validationMessage: "Enter a valid talent mobility record.",
		dataKey: "mobility",
		execute: (data) =>
			recordTalentProfileMobility(data, createHumanResourcesCommandOptions()),
	});
}

export async function listTalentProfileMobilityAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedTalentProfileMobilityListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listTalentProfileMobilityInputSchema),
		path: "listTalentProfileMobilityAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent mobility.",
		validationMessage: "Enter valid talent mobility filters.",
		dataKey: "page",
		execute: (data) =>
			listTalentProfileMobility(data, createHumanResourcesCommandOptions()),
	});
}

export async function createCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(createCompetencyInputSchema),
		path: "createCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create competency.",
		validationMessage: "Enter a valid competency.",
		dataKey: "competency",
		execute: (data) =>
			createCompetency(data, createHumanResourcesCommandOptions()),
	});
}

export async function updateCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(updateCompetencyInputSchema),
		path: "updateCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update competency.",
		validationMessage: "Enter a valid competency update.",
		dataKey: "competency",
		execute: (data) =>
			updateCompetency(data, createHumanResourcesCommandOptions()),
	});
}

export async function retireCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(retireCompetencyInputSchema),
		path: "retireCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not retire competency.",
		validationMessage: "Enter a valid competency retire request.",
		dataKey: "competency",
		execute: (data) =>
			retireCompetency(data, createHumanResourcesCommandOptions()),
	});
}

export async function mapCompetencyToJobAction(
	input: unknown,
): Promise<ActionResult<{ jobCompetency: JobCompetency }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(mapCompetencyToJobInputSchema),
		path: "mapCompetencyToJobAction",
		permission: talentAdminPermission,
		safeMessage: "Could not map competency to job.",
		validationMessage: "Enter a valid competency job mapping.",
		dataKey: "jobCompetency",
		execute: (data) =>
			mapCompetencyToJob(data, createHumanResourcesCommandOptions()),
	});
}

export async function removeCompetencyFromJobAction(
	input: unknown,
): Promise<ActionResult<{ jobCompetency: JobCompetency }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(removeCompetencyFromJobInputSchema),
		path: "removeCompetencyFromJobAction",
		permission: talentAdminPermission,
		safeMessage: "Could not remove competency from job.",
		validationMessage: "Enter a valid competency job removal.",
		dataKey: "jobCompetency",
		execute: (data) =>
			removeCompetencyFromJob(data, createHumanResourcesCommandOptions()),
	});
}

export async function assessEmployeeCompetencyAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(assessEmployeeCompetencyInputSchema),
		path: "assessEmployeeCompetencyAction",
		permission: talentAdminPermission,
		safeMessage: "Could not assess employee competency.",
		validationMessage: "Enter a valid employee competency assessment.",
		dataKey: "assessment",
		execute: (data) =>
			assessEmployeeCompetency(data, createHumanResourcesCommandOptions()),
	});
}

export async function supersedeCompetencyAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(supersedeCompetencyAssessmentInputSchema),
		path: "supersedeCompetencyAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not supersede competency assessment.",
		validationMessage: "Enter a valid competency assessment supersession.",
		dataKey: "assessment",
		execute: (data) =>
			supersedeCompetencyAssessment(data, createHumanResourcesCommandOptions()),
	});
}

export async function expireCompetencyAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ assessment: CompetencyAssessment }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(expireCompetencyAssessmentInputSchema),
		path: "expireCompetencyAssessmentAction",
		permission: talentAdminPermission,
		safeMessage: "Could not expire competency assessment.",
		validationMessage: "Enter a valid competency assessment expiry.",
		dataKey: "assessment",
		execute: (data) =>
			expireCompetencyAssessment(data, createHumanResourcesCommandOptions()),
	});
}

export async function getCompetencyByIdAction(
	input: unknown,
): Promise<ActionResult<{ competency: Competency | null }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getCompetencyByIdInputSchema),
		path: "getCompetencyByIdAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get competency.",
		validationMessage: "Enter a valid competency lookup.",
		dataKey: "competency",
		execute: (data) =>
			getCompetencyById(data, createHumanResourcesCommandOptions()),
	});
}

export async function listCompetenciesAction(
	input: unknown,
): Promise<ActionResult<{ page: CompetencyListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listCompetenciesInputSchema),
		path: "listCompetenciesAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list competencies.",
		validationMessage: "Enter valid competency filters.",
		dataKey: "page",
		execute: (data) =>
			listCompetencies(data, createHumanResourcesCommandOptions()),
	});
}

export async function listJobCompetenciesAction(
	input: unknown,
): Promise<ActionResult<{ page: JobCompetencyListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listJobCompetenciesInputSchema),
		path: "listJobCompetenciesAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list job competencies.",
		validationMessage: "Enter valid job competency filters.",
		dataKey: "page",
		execute: (data) =>
			listJobCompetencies(data, createHumanResourcesCommandOptions()),
	});
}

export async function getEmployeeCompetencyProfileAction(
	input: unknown,
): Promise<ActionResult<{ profile: ProjectedEmployeeCompetencyProfile }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getEmployeeCompetencyProfileInputSchema),
		path: "getEmployeeCompetencyProfileAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get employee competency profile.",
		validationMessage: "Enter a valid employee competency profile lookup.",
		dataKey: "profile",
		execute: (data) =>
			getEmployeeCompetencyProfile(data, createHumanResourcesCommandOptions()),
	});
}

export async function createCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(createCareerPlanInputSchema),
		path: "createCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create career plan.",
		validationMessage: "Enter a valid career plan.",
		dataKey: "plan",
		execute: (data) =>
			createCareerPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function updateCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(updateCareerPlanInputSchema),
		path: "updateCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update career plan.",
		validationMessage: "Enter a valid career plan update.",
		dataKey: "plan",
		execute: (data) =>
			updateCareerPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function acknowledgeCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(acknowledgeCareerPlanInputSchema),
		path: "acknowledgeCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not acknowledge career plan.",
		validationMessage: "Enter a valid career plan acknowledgement.",
		dataKey: "plan",
		execute: (data) =>
			acknowledgeCareerPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function addCareerPlanItemAction(
	input: unknown,
): Promise<ActionResult<{ action: CareerPlanAction }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(addCareerPlanActionInputSchema),
		path: "addCareerPlanItemAction",
		permission: talentAdminPermission,
		safeMessage: "Could not add career plan action.",
		validationMessage: "Enter a valid career plan action.",
		dataKey: "action",
		execute: (data) =>
			addCareerPlanActionCommand(data, createHumanResourcesCommandOptions()),
	});
}

export async function completeCareerPlanItemAction(
	input: unknown,
): Promise<ActionResult<{ action: CareerPlanAction }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(completeCareerPlanActionInputSchema),
		path: "completeCareerPlanItemAction",
		permission: talentAdminPermission,
		safeMessage: "Could not complete career plan action.",
		validationMessage: "Enter a valid career plan action completion.",
		dataKey: "action",
		execute: (data) =>
			completeCareerPlanActionCommand(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function closeCareerPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(closeCareerPlanInputSchema),
		path: "closeCareerPlanAction",
		permission: talentAdminPermission,
		safeMessage: "Could not close career plan.",
		validationMessage: "Enter a valid career plan closure.",
		dataKey: "plan",
		execute: (data) =>
			closeCareerPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function getCareerPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: CareerPlanWithActions | null }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getCareerPlanByIdInputSchema),
		path: "getCareerPlanByIdAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not get career plan.",
		validationMessage: "Enter a valid career plan lookup.",
		dataKey: "plan",
		execute: (data) =>
			getCareerPlanById(data, createHumanResourcesCommandOptions()),
	});
}

export async function listEmployeeCareerPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: CareerPlanListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listEmployeeCareerPlansInputSchema),
		path: "listEmployeeCareerPlansAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list employee career plans.",
		validationMessage: "Enter valid employee career plan filters.",
		dataKey: "page",
		execute: (data) =>
			listEmployeeCareerPlans(data, createHumanResourcesCommandOptions()),
	});
}

export async function recordCriticalRoleReadinessAction(
	input: unknown,
): Promise<ActionResult<{ readiness: TalentCriticalRoleReadiness }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(recordCriticalRoleReadinessInputSchema),
		path: "recordCriticalRoleReadinessAction",
		permission: successionAdminPermission,
		safeMessage: "Could not record critical role readiness.",
		validationMessage: "Enter a valid critical role readiness record.",
		dataKey: "readiness",
		execute: (data) =>
			recordCriticalRoleReadiness(data, createHumanResourcesCommandOptions()),
	});
}

export async function listCriticalRoleReadinessAction(
	input: unknown,
): Promise<
	ActionResult<{ page: ProjectedTalentCriticalRoleReadinessListPage }>
> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listCriticalRoleReadinessInputSchema),
		path: "listCriticalRoleReadinessAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list critical role readiness.",
		validationMessage: "Enter valid critical role readiness filters.",
		dataKey: "page",
		execute: (data) =>
			listCriticalRoleReadiness(data, createHumanResourcesCommandOptions()),
	});
}

export async function createTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(createTalentPoolInputSchema),
		path: "createTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not create talent pool.",
		validationMessage: "Enter a valid talent pool.",
		dataKey: "pool",
		execute: (data) =>
			createTalentPool(data, createHumanResourcesCommandOptions()),
	});
}

export async function updateTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(updateTalentPoolInputSchema),
		path: "updateTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not update talent pool.",
		validationMessage: "Enter a valid talent pool update.",
		dataKey: "pool",
		execute: (data) =>
			updateTalentPool(data, createHumanResourcesCommandOptions()),
	});
}

export async function closeTalentPoolAction(
	input: unknown,
): Promise<ActionResult<{ pool: TalentPool }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(closeTalentPoolInputSchema),
		path: "closeTalentPoolAction",
		permission: talentAdminPermission,
		safeMessage: "Could not close talent pool.",
		validationMessage: "Enter a valid talent pool closure.",
		dataKey: "pool",
		execute: (data) =>
			closeTalentPool(data, createHumanResourcesCommandOptions()),
	});
}

export async function nominateTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(nominateTalentPoolMemberInputSchema),
		path: "nominateTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not nominate talent pool member.",
		validationMessage: "Enter a valid talent pool nomination.",
		dataKey: "member",
		execute: (data) =>
			nominateTalentPoolMember(data, createHumanResourcesCommandOptions()),
	});
}

export async function approveTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(approveTalentPoolMemberInputSchema),
		path: "approveTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not approve talent pool member.",
		validationMessage: "Enter a valid talent pool approval.",
		dataKey: "member",
		execute: (data) =>
			approveTalentPoolMember(data, createHumanResourcesCommandOptions()),
	});
}

export async function removeTalentPoolMemberAction(
	input: unknown,
): Promise<ActionResult<{ member: TalentPoolMember }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(removeTalentPoolMemberInputSchema),
		path: "removeTalentPoolMemberAction",
		permission: talentAdminPermission,
		safeMessage: "Could not remove talent pool member.",
		validationMessage: "Enter a valid talent pool member removal.",
		dataKey: "member",
		execute: (data) =>
			removeTalentPoolMember(data, createHumanResourcesCommandOptions()),
	});
}

export async function listTalentPoolMembersAction(
	input: unknown,
): Promise<ActionResult<{ page: TalentPoolMemberListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listTalentPoolMembersInputSchema),
		path: "listTalentPoolMembersAction",
		permission: talentSensitiveReadPermission,
		safeMessage: "Could not list talent pool members.",
		validationMessage: "Enter valid talent pool member filters.",
		dataKey: "page",
		execute: (data) =>
			listTalentPoolMembers(data, createHumanResourcesCommandOptions()),
	});
}

export async function createSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(createSuccessionPlanInputSchema),
		path: "createSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not create succession plan.",
		validationMessage: "Enter a valid succession plan.",
		dataKey: "plan",
		execute: (data) =>
			createSuccessionPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function updateSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(updateSuccessionPlanInputSchema),
		path: "updateSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not update succession plan.",
		validationMessage: "Enter a valid succession plan update.",
		dataKey: "plan",
		execute: (data) =>
			updateSuccessionPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function closeSuccessionPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(successionPlanStatusTransitionInputSchema),
		path: "closeSuccessionPlanAction",
		permission: successionAdminPermission,
		safeMessage: "Could not close succession plan.",
		validationMessage: "Enter a valid succession plan closure.",
		dataKey: "plan",
		execute: (data) =>
			closeSuccessionPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function nominateSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(nominateSuccessionCandidateInputSchema),
		path: "nominateSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not nominate succession candidate.",
		validationMessage: "Enter a valid succession candidate nomination.",
		dataKey: "candidate",
		execute: (data) =>
			nominateSuccessionCandidate(data, createHumanResourcesCommandOptions()),
	});
}

export async function assessSuccessionReadinessAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(assessSuccessionReadinessInputSchema),
		path: "assessSuccessionReadinessAction",
		permission: successionAdminPermission,
		safeMessage: "Could not assess succession readiness.",
		validationMessage: "Enter a valid succession readiness assessment.",
		dataKey: "candidate",
		execute: (data) =>
			assessSuccessionReadiness(data, createHumanResourcesCommandOptions()),
	});
}

export async function approveSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(approveSuccessionCandidateInputSchema),
		path: "approveSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not approve succession candidate.",
		validationMessage: "Enter a valid succession candidate approval.",
		dataKey: "candidate",
		execute: (data) =>
			approveSuccessionCandidate(data, createHumanResourcesCommandOptions()),
	});
}

export async function removeSuccessionCandidateAction(
	input: unknown,
): Promise<ActionResult<{ candidate: SuccessionCandidate }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(removeSuccessionCandidateInputSchema),
		path: "removeSuccessionCandidateAction",
		permission: successionAdminPermission,
		safeMessage: "Could not remove succession candidate.",
		validationMessage: "Enter a valid succession candidate removal.",
		dataKey: "candidate",
		execute: (data) =>
			removeSuccessionCandidate(data, createHumanResourcesCommandOptions()),
	});
}

export async function getSuccessionPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: SuccessionPlan | null }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getSuccessionPlanByIdInputSchema),
		path: "getSuccessionPlanByIdAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not get succession plan.",
		validationMessage: "Enter a valid succession plan lookup.",
		dataKey: "plan",
		execute: (data) =>
			getSuccessionPlanById(data, createHumanResourcesCommandOptions()),
	});
}

export async function listSuccessionPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: SuccessionPlanListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listSuccessionPlansInputSchema),
		path: "listSuccessionPlansAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list succession plans.",
		validationMessage: "Enter valid succession plan filters.",
		dataKey: "page",
		execute: (data) =>
			listSuccessionPlans(data, createHumanResourcesCommandOptions()),
	});
}

export async function listSuccessionCandidatesAction(
	input: unknown,
): Promise<ActionResult<{ page: ProjectedSuccessionCandidateListPage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(listSuccessionCandidatesInputSchema),
		path: "listSuccessionCandidatesAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not list succession candidates.",
		validationMessage: "Enter valid succession candidate filters.",
		dataKey: "page",
		execute: (data) =>
			listSuccessionCandidates(data, createHumanResourcesCommandOptions()),
	});
}

export async function getPositionSuccessionCoverageAction(
	input: unknown,
): Promise<ActionResult<{ coverage: PositionSuccessionCoverage }>> {
	return await runTalentAction({
		input,
		schema: hrActionSchema(getPositionSuccessionCoverageInputSchema),
		path: "getPositionSuccessionCoverageAction",
		permission: successionExecutiveReadPermission,
		safeMessage: "Could not get position succession coverage.",
		validationMessage: "Enter a valid position succession coverage request.",
		dataKey: "coverage",
		execute: (data) =>
			getPositionSuccessionCoverage(data, createHumanResourcesCommandOptions()),
	});
}
