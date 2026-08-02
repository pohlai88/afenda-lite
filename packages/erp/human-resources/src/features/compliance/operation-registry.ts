import {
	HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID,
	HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
	HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
} from "../../kernel/authorization/authorization-policy-ids";
import type { HumanResourcesResourceKind } from "../../kernel/authorization/authorization-resource-kind";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const OWNER = "compliance-employee-relations" as const;

const command = (
	permission:
		| typeof HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY
		| typeof HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY
		| typeof HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER,
	authorizationPolicy:
		| typeof HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID
		| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID
		| typeof HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID = HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID,
	resourceKind: HumanResourcesResourceKind | null = null,
) => ({
	authorizationPolicy,
	kind: "command" as const,
	owner: OWNER,
	permission,
	resourceKind,
});

const query = (
	permission:
		| typeof HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ
		| typeof HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	authorizationPolicy:
		| typeof HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID
		| typeof HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID
		| typeof HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID = HUMAN_RESOURCES_COMPLIANCE_ADMIN_POLICY_ID,
	resourceKind: HumanResourcesResourceKind | null = null,
) => ({
	authorizationPolicy,
	kind: "query" as const,
	owner: OWNER,
	permission,
	resourceKind,
});

export const HUMAN_RESOURCES_COMPLIANCE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createDocumentRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE),
			id: "human-resources.document-requirement.create",
			publicName: "createDocumentRequirement",
		},
		updateDocumentRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE),
			id: "human-resources.document-requirement.update",
			publicName: "updateDocumentRequirement",
		},
		publishDocumentRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE),
			id: "human-resources.document-requirement.publish",
			publicName: "publishDocumentRequirement",
		},
		retireDocumentRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_DOCUMENT_REQUIREMENT_MANAGE),
			id: "human-resources.document-requirement.retire",
			publicName: "retireDocumentRequirement",
		},
		registerEmployeeDocument: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.register",
			publicName: "registerEmployeeDocument",
		},
		updateEmployeeDocumentMetadata: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.update-metadata",
			publicName: "updateEmployeeDocumentMetadata",
		},
		verifyEmployeeDocument: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.verify",
			publicName: "verifyEmployeeDocument",
		},
		rejectEmployeeDocument: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.reject",
			publicName: "rejectEmployeeDocument",
		},
		revokeEmployeeDocumentVerification: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.revoke-verification",
			publicName: "revokeEmployeeDocumentVerification",
		},
		markEmployeeDocumentExpired: {
			...command(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.mark-expired",
			publicName: "markEmployeeDocumentExpired",
		},
		recordWorkEligibility: {
			...command(
				HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.record",
			publicName: "recordWorkEligibility",
		},
		verifyWorkEligibility: {
			...command(
				HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.verify",
			publicName: "verifyWorkEligibility",
		},
		suspendWorkEligibility: {
			...command(
				HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.suspend",
			publicName: "suspendWorkEligibility",
		},
		renewWorkEligibility: {
			...command(
				HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.renew",
			publicName: "renewWorkEligibility",
		},
		closeWorkEligibility: {
			...command(
				HUMAN_RESOURCES_PERMISSION_WORK_ELIGIBILITY_VERIFY,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.close",
			publicName: "closeWorkEligibility",
		},
		issuePolicyAcknowledgementRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER),
			id: "human-resources.policy-acknowledgement.issue",
			publicName: "issuePolicyAcknowledgementRequirement",
		},
		acknowledgePolicy: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER),
			id: "human-resources.policy-acknowledgement.acknowledge",
			publicName: "acknowledgePolicy",
		},
		revokePolicyAcknowledgement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER),
			id: "human-resources.policy-acknowledgement.revoke",
			publicName: "revokePolicyAcknowledgement",
		},
		supersedePolicyAcknowledgementRequirement: {
			sensitivity: null,
			...command(HUMAN_RESOURCES_PERMISSION_POLICY_ACKNOWLEDGEMENT_ADMINISTER),
			id: "human-resources.policy-acknowledgement.supersede",
			publicName: "supersedePolicyAcknowledgementRequirement",
		},
	});

export const HUMAN_RESOURCES_COMPLIANCE_QUERIES =
	defineHumanResourcesOperationRegistry({
		getEmployeeDocument: {
			...query(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.get",
			publicName: "getEmployeeDocument",
		},
		listEmployeeDocuments: {
			...query(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.list",
			publicName: "listEmployeeDocuments",
		},
		listMissingRequiredDocuments: {
			...query(
				HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.list-missing-required",
			publicName: "listMissingRequiredDocuments",
		},
		listExpiringEmployeeDocuments: {
			...query(
				HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
				HUMAN_RESOURCES_EMPLOYEE_DOCUMENT_POLICY_ID,
				"employee_document",
			),
			id: "human-resources.employee-document.list-expiring",
			publicName: "listExpiringEmployeeDocuments",
		},
		getEmployeeWorkEligibility: {
			...query(
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.get",
			publicName: "getEmployeeWorkEligibility",
		},
		listEmployeesWithWorkEligibilityRisk: {
			...query(
				HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
				HUMAN_RESOURCES_WORK_ELIGIBILITY_POLICY_ID,
				"work_eligibility",
			),
			id: "human-resources.work-eligibility.list-risk",
			publicName: "listEmployeesWithWorkEligibilityRisk",
		},
		getPolicyAcknowledgementStatus: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ),
			id: "human-resources.policy-acknowledgement.status.get",
			publicName: "getPolicyAcknowledgementStatus",
		},
		listOutstandingPolicyAcknowledgements: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER),
			id: "human-resources.policy-acknowledgement.list-outstanding",
			publicName: "listOutstandingPolicyAcknowledgements",
		},
		listOverduePolicyAcknowledgements: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER),
			id: "human-resources.policy-acknowledgement.list-overdue",
			publicName: "listOverduePolicyAcknowledgements",
		},
		getEmployeeComplianceSummary: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER),
			id: "human-resources.employee-compliance-summary.get",
			publicName: "getEmployeeComplianceSummary",
		},
		detectComplianceExpiryOperations: {
			sensitivity: null,
			...query(HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER),
			id: "human-resources.compliance.expiry-operations.detect",
			publicName: "detectComplianceExpiryOperations",
		},
	});

export const HUMAN_RESOURCES_COMPLIANCE_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_COMPLIANCE_COMMANDS);
export const HUMAN_RESOURCES_COMPLIANCE_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_COMPLIANCE_QUERIES);
export const HUMAN_RESOURCES_COMPLIANCE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_COMPLIANCE_COMMANDS);
export const HUMAN_RESOURCES_COMPLIANCE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_COMPLIANCE_QUERIES);

export const {
	createDocumentRequirement: {
		id: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_CREATE,
	},
	updateDocumentRequirement: {
		id: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_UPDATE,
	},
	publishDocumentRequirement: {
		id: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_PUBLISH,
	},
	retireDocumentRequirement: {
		id: HUMAN_RESOURCES_COMMAND_DOCUMENT_REQUIREMENT_RETIRE,
	},
	registerEmployeeDocument: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REGISTER,
	},
	updateEmployeeDocumentMetadata: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_UPDATE_METADATA,
	},
	verifyEmployeeDocument: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_VERIFY,
	},
	rejectEmployeeDocument: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REJECT,
	},
	revokeEmployeeDocumentVerification: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_REVOKE_VERIFICATION,
	},
	markEmployeeDocumentExpired: {
		id: HUMAN_RESOURCES_COMMAND_EMPLOYEE_DOCUMENT_MARK_EXPIRED,
	},
	recordWorkEligibility: {
		id: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	},
	verifyWorkEligibility: {
		id: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	},
	suspendWorkEligibility: {
		id: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	},
	renewWorkEligibility: { id: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW },
	closeWorkEligibility: { id: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE },
	issuePolicyAcknowledgementRequirement: {
		id: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ISSUE,
	},
	acknowledgePolicy: {
		id: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_ACKNOWLEDGE,
	},
	revokePolicyAcknowledgement: {
		id: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_REVOKE,
	},
	supersedePolicyAcknowledgementRequirement: {
		id: HUMAN_RESOURCES_COMMAND_POLICY_ACKNOWLEDGEMENT_SUPERSEDE,
	},
} = HUMAN_RESOURCES_COMPLIANCE_COMMANDS;

export const {
	getEmployeeDocument: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET },
	listEmployeeDocuments: { id: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST },
	listMissingRequiredDocuments: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_MISSING_REQUIRED,
	},
	listExpiringEmployeeDocuments: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_LIST_EXPIRING,
	},
	getEmployeeWorkEligibility: {
		id: HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_GET,
	},
	listEmployeesWithWorkEligibilityRisk: {
		id: HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_LIST_RISK,
	},
	getPolicyAcknowledgementStatus: {
		id: HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_STATUS_GET,
	},
	listOutstandingPolicyAcknowledgements: {
		id: HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_LIST_OUTSTANDING,
	},
	listOverduePolicyAcknowledgements: {
		id: HUMAN_RESOURCES_QUERY_POLICY_ACKNOWLEDGEMENT_LIST_OVERDUE,
	},
	getEmployeeComplianceSummary: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPLIANCE_SUMMARY_GET,
	},
	detectComplianceExpiryOperations: {
		id: HUMAN_RESOURCES_QUERY_COMPLIANCE_EXPIRY_OPERATIONS_DETECT,
	},
} = HUMAN_RESOURCES_COMPLIANCE_QUERIES;
