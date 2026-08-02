import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import { HUMAN_RESOURCES_BENEFITS_SENSITIVITY } from "../operation-registry/sensitivity-defaults";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_AMEND,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_APPROVE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_CREATE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_READ,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	type HumanResourcesPermission,
} from "../permissions";
import {
	HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
	HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
} from "../shared/authorization-policy-ids";

const OWNER = "compensation-benefits" as const;

function definition(
	kind: "command" | "query",
	permission: HumanResourcesPermission,
) {
	return {
		kind,
		owner: OWNER,
		permission,
		resourceKind: "compensation" as const,
	};
}

export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createBenefitPlan: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-plan.create",
			publicName: "createBenefitPlan",
		},
		updateBenefitPlan: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-plan.update",
			publicName: "updateBenefitPlan",
		},
		archiveBenefitPlan: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-plan.archive",
			publicName: "archiveBenefitPlan",
		},
		enrolBenefit: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment.enrol",
			publicName: "enrolBenefit",
		},
		endBenefitEnrollment: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment.end",
			publicName: "endBenefitEnrollment",
		},
		cancelBenefitEnrollment: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment.cancel",
			publicName: "cancelBenefitEnrollment",
		},
		setBenefitPlanEligibility: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-plan.eligibility.set",
			publicName: "setBenefitPlanEligibility",
		},
		waiveBenefit: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment.waive",
			publicName: "waiveBenefit",
		},
		addBenefitEnrollmentDependent: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment-dependent.add",
			publicName: "addBenefitEnrollmentDependent",
		},
		endBenefitEnrollmentDependent: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("command", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-enrollment-dependent.end",
			publicName: "endBenefitEnrollmentDependent",
		},
		createCompensationGrade: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade.create",
			publicName: "createCompensationGrade",
		},
		updateCompensationGrade: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade.update",
			publicName: "updateCompensationGrade",
		},
		archiveCompensationGrade: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade.archive",
			publicName: "archiveCompensationGrade",
		},
		createCompensationReviewDraft: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.create-draft",
			publicName: "createCompensationReviewDraft",
		},
		recordCompensationRecommendation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.record-recommendation",
			publicName: "recordCompensationRecommendation",
		},
		finalizeCompensationReview: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.finalize",
			publicName: "finalizeCompensationReview",
		},
		applyApprovedCompensationResult: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.apply-approved-result",
			publicName: "applyApprovedCompensationResult",
		},
		createCompensationReviewCycle: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.create",
			publicName: "createCompensationReviewCycle",
		},
		openCompensationReviewCycle: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.open",
			publicName: "openCompensationReviewCycle",
		},
		closeCompensationReviewCycle: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.close",
			publicName: "closeCompensationReviewCycle",
		},
		cancelCompensationReviewCycle: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.cancel",
			publicName: "cancelCompensationReviewCycle",
		},
		createCompensationProposal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_CREATE,
			),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
			id: "human-resources.compensation-proposal.create",
			publicName: "createCompensationProposal",
		},
		amendCompensationProposal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_AMEND,
			),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
			id: "human-resources.compensation-proposal.amend",
			publicName: "amendCompensationProposal",
		},
		approveCompensationProposal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_APPROVE,
			),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
			id: "human-resources.compensation-proposal.approve",
			publicName: "approveCompensationProposal",
		},
		createEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.create",
			publicName: "createEmployeeCompensation",
		},
		amendEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.amend",
			publicName: "amendEmployeeCompensation",
		},
		approveEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.approve",
			publicName: "approveEmployeeCompensation",
		},
		scheduleEmployeeCompensationChange: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.schedule",
			publicName: "scheduleEmployeeCompensationChange",
		},
		activateEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.activate",
			publicName: "activateEmployeeCompensation",
		},
		correctEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.correct",
			publicName: "correctEmployeeCompensation",
		},
		endEmployeeCompensation: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.end",
			publicName: "endEmployeeCompensation",
		},
		createSalaryBand: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.create",
			publicName: "createSalaryBand",
		},
		supersedeSalaryBand: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.supersede",
			publicName: "supersedeSalaryBand",
		},
		archiveSalaryBand: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.archive",
			publicName: "archiveSalaryBand",
		},
		createCompensationGradeProgressionRule: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade-progression-rule.create",
			publicName: "createCompensationGradeProgressionRule",
		},
		archiveCompensationGradeProgressionRule: {
			sensitivity: null,
			...definition("command", HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade-progression-rule.archive",
			publicName: "archiveCompensationGradeProgressionRule",
		},
	});

export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES =
	defineHumanResourcesOperationRegistry({
		getApprovedCompensationHandoff: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy:
				HUMAN_RESOURCES_COMPENSATION_PAYROLL_HANDOFF_POLICY_ID,
			id: "human-resources.approved-compensation-handoff.get",
			publicName: "getApprovedCompensationHandoff",
		},
		getCompensationProposal: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_READ,
			),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
			id: "human-resources.compensation-proposal.get",
			publicName: "getCompensationProposal",
		},
		listCompensationProposals: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_PROPOSAL_READ,
			),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_PROPOSAL_POLICY_ID,
			id: "human-resources.compensation-proposal.list",
			publicName: "listCompensationProposals",
		},
		getCompensationGrade: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade.get",
			publicName: "getCompensationGrade",
		},
		listCompensationGrades: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade.list",
			publicName: "listCompensationGrades",
		},
		getSalaryBand: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.get",
			publicName: "getSalaryBand",
		},
		listSalaryBandsByGrade: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.list-by-grade",
			publicName: "listSalaryBandsByGrade",
		},
		findSalaryBandByGradeAndCurrencyAsOf: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.salary-band.find-as-of",
			publicName: "findSalaryBandByGradeAndCurrencyAsOf",
		},
		getCompensationGradeProgressionRule: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade-progression-rule.get",
			publicName: "getCompensationGradeProgressionRule",
		},
		listCompensationGradeProgressionRulesFromGrade: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade-progression-rule.list-from-grade",
			publicName: "listCompensationGradeProgressionRulesFromGrade",
		},
		listEligibleProgressionTargets: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-grade-progression-targets.list",
			publicName: "listEligibleProgressionTargets",
		},
		getCompensationReviewCycle: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.get",
			publicName: "getCompensationReviewCycle",
		},
		listCompensationReviewCycles: {
			sensitivity: null,
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_CATALOG_POLICY_ID,
			id: "human-resources.compensation-review-cycle.list",
			publicName: "listCompensationReviewCycles",
		},
		getCompensationReview: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.get",
			publicName: "getCompensationReview",
		},
		listCompensationReviewsByEmployee: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.compensation-review.list-by-employee",
			publicName: "listCompensationReviewsByEmployee",
		},
		getEmployeeCompensation: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.get",
			publicName: "getEmployeeCompensation",
		},
		listEmployeeCompensationsByEmployee: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_EMPLOYEE_POLICY_ID,
			id: "human-resources.employee-compensation.list",
			publicName: "listEmployeeCompensationsByEmployee",
		},
		getBenefitPlanEligibility: {
			sensitivity: HUMAN_RESOURCES_BENEFITS_SENSITIVITY,
			...definition("query", HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE),
			authorizationPolicy: HUMAN_RESOURCES_COMPENSATION_BENEFITS_POLICY_ID,
			id: "human-resources.benefit-plan.eligibility.get",
			publicName: "getBenefitPlanEligibility",
		},
	});

export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS,
	);
export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES,
	);
export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS,
	);
export const HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES,
	);

export const {
	createBenefitPlan: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE },
	updateBenefitPlan: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE },
	archiveBenefitPlan: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE },
	enrolBenefit: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_ENROL },
	endBenefitEnrollment: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_END },
	cancelBenefitEnrollment: {
		id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_CANCEL,
	},
	setBenefitPlanEligibility: {
		id: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ELIGIBILITY_SET,
	},
	waiveBenefit: { id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_WAIVE },
	addBenefitEnrollmentDependent: {
		id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_ADD,
	},
	endBenefitEnrollmentDependent: {
		id: HUMAN_RESOURCES_COMMAND_BENEFIT_ENROLLMENT_DEPENDENT_END,
	},
	createCompensationGrade: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	},
	updateCompensationGrade: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_UPDATE,
	},
	archiveCompensationGrade: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_ARCHIVE,
	},
	createCompensationReviewDraft: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CREATE_DRAFT,
	},
	recordCompensationRecommendation: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_RECORD_RECOMMENDATION,
	},
	finalizeCompensationReview: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_FINALIZE,
	},
	applyApprovedCompensationResult: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_APPLY_APPROVED_RESULT,
	},
	createCompensationReviewCycle: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CREATE,
	},
	openCompensationReviewCycle: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_OPEN,
	},
	closeCompensationReviewCycle: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CLOSE,
	},
	cancelCompensationReviewCycle: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_REVIEW_CYCLE_CANCEL,
	},
	createCompensationProposal: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_CREATE,
	},
	amendCompensationProposal: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_AMEND,
	},
	approveCompensationProposal: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_PROPOSAL_APPROVE,
	},
	createEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	},
	amendEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
	},
	approveEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
	},
	scheduleEmployeeCompensationChange: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
	},
	activateEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
	},
	correctEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
	},
	endEmployeeCompensation: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	},
	createSalaryBand: { id: HUMAN_RESOURCES_COMMAND_SALARY_BAND_CREATE },
	supersedeSalaryBand: { id: HUMAN_RESOURCES_COMMAND_SALARY_BAND_SUPERSEDE },
	archiveSalaryBand: { id: HUMAN_RESOURCES_COMMAND_SALARY_BAND_ARCHIVE },
	createCompensationGradeProgressionRule: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_CREATE,
	},
	archiveCompensationGradeProgressionRule: {
		id: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_PROGRESSION_RULE_ARCHIVE,
	},
} = HUMAN_RESOURCES_COMPENSATION_BENEFITS_COMMANDS;

export const {
	getApprovedCompensationHandoff: {
		id: HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
	},
	getCompensationProposal: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_GET,
	},
	listCompensationProposals: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_PROPOSAL_LIST,
	},
	getCompensationGrade: { id: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_GET },
	listCompensationGrades: { id: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_LIST },
	getSalaryBand: { id: HUMAN_RESOURCES_QUERY_SALARY_BAND_GET },
	listSalaryBandsByGrade: {
		id: HUMAN_RESOURCES_QUERY_SALARY_BAND_LIST_BY_GRADE,
	},
	findSalaryBandByGradeAndCurrencyAsOf: {
		id: HUMAN_RESOURCES_QUERY_SALARY_BAND_FIND_AS_OF,
	},
	getCompensationGradeProgressionRule: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_GET,
	},
	listCompensationGradeProgressionRulesFromGrade: {
		id:
			HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_RULE_LIST_FROM_GRADE,
	},
	listEligibleProgressionTargets: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_GRADE_PROGRESSION_TARGETS_LIST,
	},
	getCompensationReviewCycle: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_GET,
	},
	listCompensationReviewCycles: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_CYCLE_LIST,
	},
	getCompensationReview: { id: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_GET },
	listCompensationReviewsByEmployee: {
		id: HUMAN_RESOURCES_QUERY_COMPENSATION_REVIEW_LIST_BY_EMPLOYEE,
	},
	getEmployeeCompensation: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_GET,
	},
	listEmployeeCompensationsByEmployee: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_LIST,
	},
	getBenefitPlanEligibility: {
		id: HUMAN_RESOURCES_QUERY_BENEFIT_PLAN_ELIGIBILITY_GET,
	},
} = HUMAN_RESOURCES_COMPENSATION_BENEFITS_QUERIES;
