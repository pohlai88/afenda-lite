import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";
import { HUMAN_RESOURCES_BACKGROUND_CHECK_SENSITIVITY } from "../../kernel/operations/sensitivity-defaults";

const EMPLOYMENT_LIFECYCLE_OWNER = "employment-lifecycle" as const;
const EMPLOYEE_SUBJECT_POLICY = "hr.employee-subject" as const;
const EMPLOYMENT_WORKFLOW_POLICY = "hr.lifecycle" as const;

const EMPLOYMENT_COMMAND = {
	authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
	kind: "command",
	owner: EMPLOYMENT_LIFECYCLE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} as const;

const EMPLOYMENT_QUERY = {
	authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
	kind: "query",
	owner: EMPLOYMENT_LIFECYCLE_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
} as const;

const EMPLOYMENT_WORKFLOW_COMMAND = {
	...EMPLOYMENT_COMMAND,
	authorizationPolicy: EMPLOYMENT_WORKFLOW_POLICY,
} as const;

const EMPLOYMENT_WORKFLOW_QUERY = {
	...EMPLOYMENT_QUERY,
	authorizationPolicy: EMPLOYMENT_WORKFLOW_POLICY,
} as const;

export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.create",
			publicName: "createEmployment",
		},
		hireEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.hire",
			publicName: "hireEmployment",
		},
		rehireEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.rehire",
			publicName: "rehireEmployment",
		},
		amendEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.amend",
			publicName: "amendEmployment",
		},
		suspendEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.suspend",
			publicName: "suspendEmployment",
		},
		reactivateEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.reactivate",
			publicName: "reactivateEmployment",
		},
		terminateEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.terminate",
			publicName: "terminateEmployment",
		},
		correctEmployment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment.correct",
			publicName: "correctEmployment",
		},
		createEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.create",
			publicName: "createEmploymentContract",
		},
		correctEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.correct",
			publicName: "correctEmploymentContract",
		},
		amendEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.amend",
			publicName: "amendEmploymentContract",
		},
		supersedeEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.supersede",
			publicName: "supersedeEmploymentContract",
		},
		renewEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.renew",
			publicName: "renewEmploymentContract",
		},
		endEmploymentContract: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.employment-contract.end",
			publicName: "endEmploymentContract",
		},
		createAssignment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.assignment.create",
			publicName: "createAssignment",
		},
		endAssignment: {
			...EMPLOYMENT_COMMAND,
			id: "human-resources.assignment.end",
			publicName: "endAssignment",
		},
		startOnboarding: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.start",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "startOnboarding",
		},
		completeOnboardingTask: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.complete-task",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "completeOnboardingTask",
		},
		completeOnboarding: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.complete",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "completeOnboarding",
		},
		recordOnboardingOrientation: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.record-orientation",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "recordOnboardingOrientation",
		},
		recordOnboardingEquipmentHandoff: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.record-equipment-handoff",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "recordOnboardingEquipmentHandoff",
		},
		recordOnboardingAccessHandoff: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.onboarding.record-access-handoff",
			permission: HUMAN_RESOURCES_PERMISSION_ONBOARDING_MANAGE,
			publicName: "recordOnboardingAccessHandoff",
		},
		openProbation: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.probation.open",
			publicName: "openProbation",
		},
		extendProbation: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.probation.extend",
			publicName: "extendProbation",
		},
		recordProbationOutcome: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.probation.record-outcome",
			publicName: "recordProbationOutcome",
		},
		recordProbationAssessment: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.probation.record-assessment",
			publicName: "recordProbationAssessment",
		},
		confirmEmployment: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			id: "human-resources.employment.confirm",
			publicName: "confirmEmployment",
		},
		transferAssignment: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			authorizationPolicy: EMPLOYEE_SUBJECT_POLICY,
			id: "human-resources.assignment.transfer",
			publicName: "transferAssignment",
		},
		proposeTermination: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.termination.propose",
			publicName: "proposeTermination",
		},
		approveTermination: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.termination.approve",
			publicName: "approveTermination",
		},
		finalizeTermination: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.termination.finalize",
			publicName: "finalizeTermination",
		},
		startOffboarding: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.start",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "startOffboarding",
		},
		completeOffboardingTask: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.complete-task",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "completeOffboardingTask",
		},
		recordExitInterview: {
			sensitivity: HUMAN_RESOURCES_BACKGROUND_CHECK_SENSITIVITY,
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.record-exit-interview",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "recordExitInterview",
		},
		recordClearance: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.record-clearance",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "recordClearance",
		},
		recordOffboardingAccessRevocation: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.record-access-revocation",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "recordOffboardingAccessRevocation",
		},
		recordOffboardingPayrollHandoff: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.record-payroll-handoff",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "recordOffboardingPayrollHandoff",
		},
		completeOffboarding: {
			...EMPLOYMENT_WORKFLOW_COMMAND,
			id: "human-resources.offboarding.complete",
			permission: HUMAN_RESOURCES_PERMISSION_OFFBOARDING_MANAGE,
			publicName: "completeOffboarding",
		},
	});

export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES =
	defineHumanResourcesOperationRegistry({
		resolveEmployeeOrgContextAsOf: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employee.org-context.resolve",
			publicName: "resolveEmployeeOrgContextAsOf",
		},
		getEmployment: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment.get",
			publicName: "getEmployment",
		},
		getEmploymentAsOf: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment.as-of",
			publicName: "getEmploymentAsOf",
		},
		listEmploymentStatusHistory: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment.status-history.list",
			publicName: "listEmploymentStatusHistory",
		},
		getEmploymentContract: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment-contract.get",
			publicName: "getEmploymentContract",
		},
		getEmploymentContractAsOf: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment-contract.as-of",
			publicName: "getEmploymentContractAsOf",
		},
		getCurrentEmploymentContract: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment-contract.current",
			publicName: "getCurrentEmploymentContract",
		},
		listEmploymentContracts: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.employment-contract.list",
			publicName: "listEmploymentContracts",
		},
		getAssignment: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.assignment.get",
			publicName: "getAssignment",
		},
		getAssignmentAsOf: {
			...EMPLOYMENT_QUERY,
			id: "human-resources.assignment.as-of",
			publicName: "getAssignmentAsOf",
		},
		getOnboardingCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.onboarding-case.get",
			publicName: "getOnboardingCase",
		},
		listOnboardingTasks: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.onboarding-tasks.list",
			publicName: "listOnboardingTasks",
		},
		getOnboardingOrientationByCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.onboarding-orientation.get-by-case",
			publicName: "getOnboardingOrientationByCase",
		},
		getOnboardingEquipmentHandoffByCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.onboarding-equipment-handoff.get-by-case",
			publicName: "getOnboardingEquipmentHandoffByCase",
		},
		getOnboardingAccessHandoffByCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.onboarding-access-handoff.get-by-case",
			publicName: "getOnboardingAccessHandoffByCase",
		},
		getProbationReview: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.probation-review.get",
			publicName: "getProbationReview",
		},
		listProbationReviewsByEmployment: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.probation-reviews.list-by-employment",
			publicName: "listProbationReviewsByEmployment",
		},
		listProbationAssessments: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.probation-assessments.list",
			publicName: "listProbationAssessments",
		},
		getEmploymentConfirmation: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.employment-confirmation.get",
			publicName: "getEmploymentConfirmation",
		},
		getTermination: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.termination.get",
			publicName: "getTermination",
		},
		getOffboardingCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.offboarding-case.get",
			publicName: "getOffboardingCase",
		},
		listOffboardingTasks: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.offboarding-tasks.list",
			publicName: "listOffboardingTasks",
		},
		getClearanceByOffboardingCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.clearance.get-by-offboarding-case",
			observabilityArea: "compliance",
			publicName: "getClearanceByOffboardingCase",
		},
		getOffboardingAccessRevocationByCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.offboarding-access-revocation.get-by-case",
			publicName: "getOffboardingAccessRevocationByCase",
		},
		getOffboardingPayrollHandoffByCase: {
			...EMPLOYMENT_WORKFLOW_QUERY,
			id: "human-resources.offboarding-payroll-handoff.get-by-case",
			observabilityArea: "payroll_delivery",
			publicName: "getOffboardingPayrollHandoffByCase",
		},
	});

export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.createEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_HIRE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.hireEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REHIRE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.rehireEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.amendEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_SUSPEND =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.suspendEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_REACTIVATE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.reactivateEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_TERMINATE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.terminateEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.correctEmployment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.createEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.correctEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_AMEND =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.amendEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.supersedeEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_RENEW =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.renewEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.endEmploymentContract.id;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.createAssignment.id;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.endAssignment.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_START =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.startOnboarding.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOnboardingTask.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOnboarding.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingOrientation.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingEquipmentHandoff
		.id;
export const HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingAccessHandoff
		.id;
export const HUMAN_RESOURCES_COMMAND_PROBATION_OPEN =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.openProbation.id;
export const HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.extendProbation.id;
export const HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordProbationOutcome.id;
export const HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordProbationAssessment.id;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.confirmEmployment.id;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.transferAssignment.id;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.proposeTermination.id;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.approveTermination.id;
export const HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.finalizeTermination.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_START =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.startOffboarding.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOffboardingTask.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordExitInterview.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordClearance.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS
		.recordOffboardingAccessRevocation.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOffboardingPayrollHandoff
		.id;
export const HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOffboarding.id;

export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getEmployment.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_ORG_CONTEXT_RESOLVE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.resolveEmployeeOrgContextAsOf.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_AS_OF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getEmploymentAsOf.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_STATUS_HISTORY_LIST =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listEmploymentStatusHistory.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getEmploymentContract.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_AS_OF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getEmploymentContractAsOf.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_CURRENT =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getCurrentEmploymentContract.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_LIST =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listEmploymentContracts.id;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getAssignment.id;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_AS_OF =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getAssignmentAsOf.id;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getOnboardingCase.id;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listOnboardingTasks.id;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_ORIENTATION_GET_BY_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getOnboardingOrientationByCase
		.id;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_EQUIPMENT_HANDOFF_GET_BY_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES
		.getOnboardingEquipmentHandoffByCase.id;
export const HUMAN_RESOURCES_QUERY_ONBOARDING_ACCESS_HANDOFF_GET_BY_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getOnboardingAccessHandoffByCase
		.id;
export const HUMAN_RESOURCES_QUERY_PROBATION_REVIEW_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getProbationReview.id;
export const HUMAN_RESOURCES_QUERY_PROBATION_REVIEWS_LIST_BY_EMPLOYMENT =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listProbationReviewsByEmployment
		.id;
export const HUMAN_RESOURCES_QUERY_PROBATION_ASSESSMENTS_LIST =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listProbationAssessments.id;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONFIRMATION_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getEmploymentConfirmation.id;
export const HUMAN_RESOURCES_QUERY_TERMINATION_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getTermination.id;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_CASE_GET =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getOffboardingCase.id;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_TASKS_LIST =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.listOffboardingTasks.id;
export const HUMAN_RESOURCES_QUERY_CLEARANCE_GET_BY_OFFBOARDING_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES.getClearanceByOffboardingCase.id;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_ACCESS_REVOCATION_GET_BY_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES
		.getOffboardingAccessRevocationByCase.id;
export const HUMAN_RESOURCES_QUERY_OFFBOARDING_PAYROLL_HANDOFF_GET_BY_CASE =
	HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES
		.getOffboardingPayrollHandoffByCase.id;

export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS,
	);
export const HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_COMMAND_IDS =
	projectHumanResourcesOperationIds({
		startOnboarding:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.startOnboarding,
		completeOnboardingTask:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOnboardingTask,
		completeOnboarding:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOnboarding,
		recordOnboardingOrientation:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingOrientation,
		recordOnboardingEquipmentHandoff:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingEquipmentHandoff,
		recordOnboardingAccessHandoff:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOnboardingAccessHandoff,
		openProbation: HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.openProbation,
		extendProbation:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.extendProbation,
		recordProbationOutcome:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordProbationOutcome,
		recordProbationAssessment:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordProbationAssessment,
		confirmEmployment:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.confirmEmployment,
		transferAssignment:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.transferAssignment,
		proposeTermination:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.proposeTermination,
		approveTermination:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.approveTermination,
		finalizeTermination:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.finalizeTermination,
		startOffboarding:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.startOffboarding,
		completeOffboardingTask:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOffboardingTask,
		recordExitInterview:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordExitInterview,
		recordClearance:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordClearance,
		recordOffboardingAccessRevocation:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOffboardingAccessRevocation,
		recordOffboardingPayrollHandoff:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.recordOffboardingPayrollHandoff,
		completeOffboarding:
			HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS.completeOffboarding,
	});
export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES,
	);

export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_COMMANDS,
	);
export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_QUERIES,
	);
