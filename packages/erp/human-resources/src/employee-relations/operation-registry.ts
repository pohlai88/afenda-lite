import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
} from "../permissions";

const EMPLOYEE_RELATIONS_OWNER = "compliance-employee-relations" as const;
const EMPLOYEE_RELATIONS_POLICY = "hr.employee-relations.case" as const;

const command = (
	permission:
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL,
) => ({
	authorizationPolicy: EMPLOYEE_RELATIONS_POLICY,
	kind: "command" as const,
	owner: EMPLOYEE_RELATIONS_OWNER,
	permission,
});

const query = (
	permission:
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
) => ({
	authorizationPolicy: EMPLOYEE_RELATIONS_POLICY,
	kind: "query" as const,
	owner: EMPLOYEE_RELATIONS_OWNER,
	permission,
});

export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS =
	defineHumanResourcesOperationRegistry({
		openEmployeeCase: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN),
			id: "human-resources.employee-case.open",
			publicName: "openEmployeeCase",
		},
		updateEmployeeCaseClassification: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.update-classification",
			publicName: "updateEmployeeCaseClassification",
		},
		assignEmployeeCaseOwner: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.assign-owner",
			publicName: "assignEmployeeCaseOwner",
		},
		addEmployeeCaseParticipant: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.add-participant",
			publicName: "addEmployeeCaseParticipant",
		},
		recordEmployeeCaseEvent: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.record-event",
			publicName: "recordEmployeeCaseEvent",
		},
		addEmployeeCaseEvidenceReference: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.add-evidence-reference",
			publicName: "addEmployeeCaseEvidenceReference",
		},
		redactEmployeeCaseEvidenceReference: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN),
			id: "human-resources.employee-case.redact-evidence-reference",
			publicName: "redactEmployeeCaseEvidenceReference",
		},
		issueInterimEmployeeMeasure: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE),
			id: "human-resources.employee-case.issue-interim-measure",
			publicName: "issueInterimEmployeeMeasure",
		},
		recordEmployeeCaseFinding: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_FINDING),
			id: "human-resources.employee-case.record-finding",
			publicName: "recordEmployeeCaseFinding",
		},
		recommendEmployeeCaseAction: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE),
			id: "human-resources.employee-case.recommend-action",
			publicName: "recommendEmployeeCaseAction",
		},
		approveEmployeeCaseAction: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ACTION_APPROVE),
			id: "human-resources.employee-case.approve-action",
			publicName: "approveEmployeeCaseAction",
		},
		recordEmployeeCaseAppeal: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL),
			id: "human-resources.employee-case.record-appeal",
			publicName: "recordEmployeeCaseAppeal",
		},
		resolveEmployeeCaseAppeal: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_APPEAL),
			id: "human-resources.employee-case.resolve-appeal",
			publicName: "resolveEmployeeCaseAppeal",
		},
		closeEmployeeCase: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN),
			id: "human-resources.employee-case.close",
			publicName: "closeEmployeeCase",
		},
		reopenEmployeeCase: {
			...command(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN),
			id: "human-resources.employee-case.reopen",
			publicName: "reopenEmployeeCase",
		},
	});

export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES =
	defineHumanResourcesOperationRegistry({
		getEmployeeCaseById: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.get",
			publicName: "getEmployeeCaseById",
		},
		listEmployeeCases: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.list",
			publicName: "listEmployeeCases",
		},
		listCasesAssignedToActor: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.list-assigned",
			publicName: "listCasesAssignedToActor",
		},
		listOpenEmployeeRelationsCases: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.list-open",
			publicName: "listOpenEmployeeRelationsCases",
		},
		getEmployeeRelationsHistoryByEmployee: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN),
			id: "human-resources.employee-relations.history-by-employee",
			publicName: "getEmployeeRelationsHistoryByEmployee",
		},
		getEmployeeCaseTimeline: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.timeline",
			publicName: "getEmployeeCaseTimeline",
		},
		getEmployeeCaseOutcome: {
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ),
			id: "human-resources.employee-case.outcome",
			publicName: "getEmployeeCaseOutcome",
		},
	});

export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS,
	);
export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES);
export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS,
	);
export const HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES,
	);

export const {
	openEmployeeCase: { id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_OPEN },
	updateEmployeeCaseClassification: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_UPDATE_CLASSIFICATION,
	},
	assignEmployeeCaseOwner: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ASSIGN_OWNER,
	},
	addEmployeeCaseParticipant: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_PARTICIPANT,
	},
	recordEmployeeCaseEvent: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_EVENT,
	},
	addEmployeeCaseEvidenceReference: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ADD_EVIDENCE_REFERENCE,
	},
	redactEmployeeCaseEvidenceReference: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REDACT_EVIDENCE_REFERENCE,
	},
	issueInterimEmployeeMeasure: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_ISSUE_INTERIM_MEASURE,
	},
	recordEmployeeCaseFinding: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_FINDING,
	},
	recommendEmployeeCaseAction: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECOMMEND_ACTION,
	},
	approveEmployeeCaseAction: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_APPROVE_ACTION,
	},
	recordEmployeeCaseAppeal: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	},
	resolveEmployeeCaseAppeal: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
	},
	closeEmployeeCase: { id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_CLOSE },
	reopenEmployeeCase: { id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_REOPEN },
} = HUMAN_RESOURCES_EMPLOYEE_RELATIONS_COMMANDS;

export const {
	getEmployeeCaseById: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET },
	listEmployeeCases: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST },
	listCasesAssignedToActor: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_ASSIGNED,
	},
	listOpenEmployeeRelationsCases: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_LIST_OPEN,
	},
	getEmployeeRelationsHistoryByEmployee: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
	},
	getEmployeeCaseTimeline: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_TIMELINE },
	getEmployeeCaseOutcome: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_OUTCOME },
} = HUMAN_RESOURCES_EMPLOYEE_RELATIONS_QUERIES;
