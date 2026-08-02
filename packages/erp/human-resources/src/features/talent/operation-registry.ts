import {
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_ASSESS,
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
	type HumanResourcesPermission,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const OWNER = "performance-talent" as const;
const AUTHORIZATION_POLICY_BY_PERMISSION = {
	[HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE]: "hr.talent-profile",
	[HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ]: "hr.talent-profile",
	[HUMAN_RESOURCES_PERMISSION_COMPETENCY_ASSESS]: "hr.talent-assessment",
	[HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE]: "hr.manifest-only",
	[HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]: "hr.manifest-only",
	[HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN]: "hr.succession",
	[HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ]: "hr.succession",
	[HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN]: "hr.talent-profile",
	[HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ]:
		"hr.talent-profile",
} as const satisfies Partial<Record<HumanResourcesPermission, string>>;

function definition(
	kind: "command" | "query",
	permission: keyof typeof AUTHORIZATION_POLICY_BY_PERMISSION,
	authorizationPolicy = AUTHORIZATION_POLICY_BY_PERMISSION[permission],
) {
	return {
		authorizationPolicy,
		kind,
		owner: OWNER,
		permission,
	};
}

export const HUMAN_RESOURCES_TALENT_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createCompetency: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE),
			id: "human-resources.competency.create",
			publicName: "createCompetency",
		},
		updateCompetency: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE),
			id: "human-resources.competency.update",
			publicName: "updateCompetency",
		},
		retireCompetency: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE),
			id: "human-resources.competency.retire",
			publicName: "retireCompetency",
		},
		mapCompetencyToJob: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE),
			id: "human-resources.job-competency.map",
			publicName: "mapCompetencyToJob",
		},
		removeCompetencyFromJob: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_MANAGE),
			id: "human-resources.job-competency.remove",
			publicName: "removeCompetencyFromJob",
		},
		assessEmployeeCompetency: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_ASSESS),
			id: "human-resources.competency-assessment.record",
			publicName: "assessEmployeeCompetency",
		},
		supersedeCompetencyAssessment: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_ASSESS),
			id: "human-resources.competency-assessment.supersede",
			publicName: "supersedeCompetencyAssessment",
		},
		expireCompetencyAssessment: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPETENCY_ASSESS),
			id: "human-resources.competency-assessment.expire",
			publicName: "expireCompetencyAssessment",
		},
		createTalentProfile: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile.create",
			publicName: "createTalentProfile",
		},
		updateTalentProfile: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile.update",
			publicName: "updateTalentProfile",
		},
		recordTalentProfileAssessment: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile-assessment.record",
			publicName: "recordTalentProfileAssessment",
		},
		confirmTalentProfileAssessment: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile-assessment.confirm",
			publicName: "confirmTalentProfileAssessment",
		},
		archiveTalentProfile: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile.archive",
			publicName: "archiveTalentProfile",
		},
		recordTalentProfileMobility: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-profile-mobility.record",
			publicName: "recordTalentProfileMobility",
		},
		recordCriticalRoleReadiness: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.critical-role-readiness.record",
			publicName: "recordCriticalRoleReadiness",
		},
		createTalentPool: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool.create",
			publicName: "createTalentPool",
		},
		updateTalentPool: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool.update",
			publicName: "updateTalentPool",
		},
		closeTalentPool: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool.close",
			publicName: "closeTalentPool",
		},
		nominateTalentPoolMember: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool-member.nominate",
			publicName: "nominateTalentPoolMember",
		},
		approveTalentPoolMember: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool-member.approve",
			publicName: "approveTalentPoolMember",
		},
		removeTalentPoolMember: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool-member.remove",
			publicName: "removeTalentPoolMember",
		},
		createCareerPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE),
			id: "human-resources.career-plan.create",
			publicName: "createCareerPlan",
		},
		updateCareerPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE),
			id: "human-resources.career-plan.update",
			publicName: "updateCareerPlan",
		},
		acknowledgeCareerPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ),
			id: "human-resources.career-plan.acknowledge",
			publicName: "acknowledgeCareerPlan",
		},
		addCareerPlanAction: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE),
			id: "human-resources.career-plan-action.add",
			publicName: "addCareerPlanAction",
		},
		completeCareerPlanAction: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE),
			id: "human-resources.career-plan-action.complete",
			publicName: "completeCareerPlanAction",
		},
		closeCareerPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE),
			id: "human-resources.career-plan.close",
			publicName: "closeCareerPlan",
		},
		createSuccessionPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-plan.create",
			publicName: "createSuccessionPlan",
		},
		updateSuccessionPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-plan.update",
			publicName: "updateSuccessionPlan",
		},
		nominateSuccessionCandidate: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-candidate.nominate",
			publicName: "nominateSuccessionCandidate",
		},
		assessSuccessionReadiness: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-candidate.assess-readiness",
			publicName: "assessSuccessionReadiness",
		},
		approveSuccessionCandidate: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-candidate.approve",
			publicName: "approveSuccessionCandidate",
		},
		removeSuccessionCandidate: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-candidate.remove",
			publicName: "removeSuccessionCandidate",
		},
		closeSuccessionPlan: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN),
			id: "human-resources.succession-plan.close",
			publicName: "closeSuccessionPlan",
		},
	});
export const HUMAN_RESOURCES_TALENT_QUERIES =
	defineHumanResourcesOperationRegistry({
		getCompetencyById: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ),
			id: "human-resources.competency.get",
			publicName: "getCompetencyById",
		},
		listCompetencies: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ),
			id: "human-resources.competency.list",
			publicName: "listCompetencies",
		},
		listJobCompetencies: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ),
			id: "human-resources.job-competency.list",
			publicName: "listJobCompetencies",
		},
		getEmployeeCompetencyProfile: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
				"hr.talent-assessment",
			),
			id: "human-resources.employee-competency-profile.get",
			publicName: "getEmployeeCompetencyProfile",
		},
		getTalentProfileByEmployee: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
			),
			id: "human-resources.talent-profile.get-by-employee",
			publicName: "getTalentProfileByEmployee",
		},
		listTalentProfileAssessments: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
			),
			id: "human-resources.talent-profile-assessment.list",
			publicName: "listTalentProfileAssessments",
		},
		listTalentProfileMobility: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
			),
			id: "human-resources.talent-profile-mobility.list",
			publicName: "listTalentProfileMobility",
		},
		listCriticalRoleReadiness: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
			),
			id: "human-resources.critical-role-readiness.list",
			publicName: "listCriticalRoleReadiness",
		},
		listTalentPoolMembers: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN),
			id: "human-resources.talent-pool-member.list",
			publicName: "listTalentPoolMembers",
		},
		getCareerPlanById: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ),
			id: "human-resources.career-plan.get",
			publicName: "getCareerPlanById",
		},
		listEmployeeCareerPlans: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ),
			id: "human-resources.career-plan.list-by-employee",
			publicName: "listEmployeeCareerPlans",
		},
		getSuccessionPlanById: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
			),
			id: "human-resources.succession-plan.get",
			publicName: "getSuccessionPlanById",
		},
		listSuccessionPlans: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
			),
			id: "human-resources.succession-plan.list",
			publicName: "listSuccessionPlans",
		},
		listSuccessionCandidates: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
			),
			id: "human-resources.succession-candidate.list",
			publicName: "listSuccessionCandidates",
		},
		getPositionSuccessionCoverage: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
			),
			id: "human-resources.position-succession-coverage.get",
			publicName: "getPositionSuccessionCoverage",
		},
	});
export const HUMAN_RESOURCES_TALENT_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TALENT_COMMANDS);
export const HUMAN_RESOURCES_TALENT_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_TALENT_QUERIES);
export const HUMAN_RESOURCES_TALENT_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TALENT_COMMANDS);
export const HUMAN_RESOURCES_TALENT_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_TALENT_QUERIES);
export const {
	createCompetency: { id: HUMAN_RESOURCES_COMMAND_COMPETENCY_CREATE },
	updateCompetency: { id: HUMAN_RESOURCES_COMMAND_COMPETENCY_UPDATE },
	retireCompetency: { id: HUMAN_RESOURCES_COMMAND_COMPETENCY_RETIRE },
	mapCompetencyToJob: { id: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_MAP },
	removeCompetencyFromJob: {
		id: HUMAN_RESOURCES_COMMAND_JOB_COMPETENCY_REMOVE,
	},
	assessEmployeeCompetency: {
		id: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
	},
	supersedeCompetencyAssessment: {
		id: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_SUPERSEDE,
	},
	expireCompetencyAssessment: {
		id: HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_EXPIRE,
	},
	createTalentProfile: { id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_CREATE },
	updateTalentProfile: { id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_UPDATE },
	recordTalentProfileAssessment: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_RECORD,
	},
	confirmTalentProfileAssessment: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ASSESSMENT_CONFIRM,
	},
	archiveTalentProfile: { id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_ARCHIVE },
	recordTalentProfileMobility: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_PROFILE_MOBILITY_RECORD,
	},
	recordCriticalRoleReadiness: {
		id: HUMAN_RESOURCES_COMMAND_CRITICAL_ROLE_READINESS_RECORD,
	},
	createTalentPool: { id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CREATE },
	updateTalentPool: { id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_UPDATE },
	closeTalentPool: { id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_CLOSE },
	nominateTalentPoolMember: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_NOMINATE,
	},
	approveTalentPoolMember: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_APPROVE,
	},
	removeTalentPoolMember: {
		id: HUMAN_RESOURCES_COMMAND_TALENT_POOL_MEMBER_REMOVE,
	},
	createCareerPlan: { id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE },
	updateCareerPlan: { id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE },
	acknowledgeCareerPlan: {
		id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
	},
	addCareerPlanAction: { id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD },
	completeCareerPlanAction: {
		id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
	},
	closeCareerPlan: { id: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE },
	createSuccessionPlan: { id: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE },
	updateSuccessionPlan: { id: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE },
	nominateSuccessionCandidate: {
		id: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
	},
	assessSuccessionReadiness: {
		id: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
	},
	approveSuccessionCandidate: {
		id: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
	},
	removeSuccessionCandidate: {
		id: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
	},
	closeSuccessionPlan: { id: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE },
} = HUMAN_RESOURCES_TALENT_COMMANDS;
export const {
	getCompetencyById: { id: HUMAN_RESOURCES_QUERY_COMPETENCY_GET },
	listCompetencies: { id: HUMAN_RESOURCES_QUERY_COMPETENCY_LIST },
	listJobCompetencies: { id: HUMAN_RESOURCES_QUERY_JOB_COMPETENCY_LIST },
	getEmployeeCompetencyProfile: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
	},
	getTalentProfileByEmployee: {
		id: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
	},
	listTalentProfileAssessments: {
		id: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_ASSESSMENT_LIST,
	},
	listTalentProfileMobility: {
		id: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_MOBILITY_LIST,
	},
	listCriticalRoleReadiness: {
		id: HUMAN_RESOURCES_QUERY_CRITICAL_ROLE_READINESS_LIST,
	},
	listTalentPoolMembers: { id: HUMAN_RESOURCES_QUERY_TALENT_POOL_MEMBER_LIST },
	getCareerPlanById: { id: HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET },
	listEmployeeCareerPlans: {
		id: HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE,
	},
	getSuccessionPlanById: { id: HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_GET },
	listSuccessionPlans: { id: HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_LIST },
	listSuccessionCandidates: {
		id: HUMAN_RESOURCES_QUERY_SUCCESSION_CANDIDATE_LIST,
	},
	getPositionSuccessionCoverage: {
		id: HUMAN_RESOURCES_QUERY_POSITION_SUCCESSION_COVERAGE_GET,
	},
} = HUMAN_RESOURCES_TALENT_QUERIES;
