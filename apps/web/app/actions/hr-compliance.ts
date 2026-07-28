"use server";

import type {
	ComplianceExpiryOperations,
	DocumentRequirement,
	DocumentRequirementListPage,
	EmployeeComplianceSummary,
	EmployeeDocument,
	EmployeeDocumentListItem,
	EmployeeDocumentListPage,
	EmployeeDocumentSensitiveDetail,
	PolicyAcknowledgement,
	PolicyAcknowledgementListPage,
	WorkEligibility,
	WorkEligibilityRiskListPage,
} from "@afenda/human-resources";
import {
	acknowledgePolicy,
	closeWorkEligibility,
	createDocumentRequirement,
	detectComplianceExpiryOperations,
	getEmployeeComplianceSummary,
	getEmployeeDocument,
	getEmployeeWorkEligibility,
	getPolicyAcknowledgementStatus,
	issuePolicyAcknowledgementRequirement,
	listEmployeesWithWorkEligibilityRisk,
	listExpiringEmployeeDocuments,
	listMissingRequiredDocuments,
	listOutstandingPolicyAcknowledgements,
	markEmployeeDocumentExpired,
	publishDocumentRequirement,
	recordWorkEligibility,
	registerEmployeeDocument,
	rejectEmployeeDocument,
	renewWorkEligibility,
	retireDocumentRequirement,
	revokeEmployeeDocumentVerification,
	revokePolicyAcknowledgement,
	supersedePolicyAcknowledgementRequirement,
	suspendWorkEligibility,
	updateDocumentRequirement,
	updateEmployeeDocumentMetadata,
	verifyEmployeeDocument,
	verifyWorkEligibility,
} from "@afenda/human-resources";
import {
	acknowledgePolicyInputSchema,
	createDocumentRequirementInputSchema,
	detectComplianceExpiryOperationsInputSchema,
	documentRequirementTransitionInputSchema,
	employeeDocumentTransitionInputSchema,
	getEmployeeComplianceSummaryInputSchema,
	getEmployeeDocumentInputSchema,
	getEmployeeWorkEligibilityInputSchema,
	getPolicyAcknowledgementStatusInputSchema,
	issuePolicyAcknowledgementRequirementInputSchema,
	listEmployeesWithWorkEligibilityRiskInputSchema,
	listExpiringEmployeeDocumentsInputSchema,
	listMissingRequiredDocumentsInputSchema,
	listOutstandingPolicyAcknowledgementsInputSchema,
	recordWorkEligibilityInputSchema,
	registerEmployeeDocumentInputSchema,
	rejectEmployeeDocumentInputSchema,
	renewWorkEligibilityInputSchema,
	revokePolicyAcknowledgementInputSchema,
	supersedePolicyAcknowledgementRequirementInputSchema,
	updateDocumentRequirementInputSchema,
	updateEmployeeDocumentMetadataInputSchema,
	verifyEmployeeDocumentInputSchema,
	verifyWorkEligibilityInputSchema,
	workEligibilityTransitionInputSchema,
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrComplianceHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

const COMPLIANCE_ADMIN = "human-resources.compliance.administer" as const;
const DOCUMENT_REQUIREMENT_MANAGE =
	"human-resources.document-requirement.manage" as const;
const EMPLOYEE_DOCUMENT_VERIFY =
	"human-resources.employee-document.verify" as const;
const WORK_ELIGIBILITY_VERIFY =
	"human-resources.work-eligibility.verify" as const;
const POLICY_ACK_ADMIN =
	"human-resources.policy-acknowledgement.administer" as const;
const EMPLOYEE_DOCUMENT_OWN_READ =
	"human-resources.employee-document.own.read" as const;
const EMPLOYEE_DOCUMENT_OWN_REGISTER =
	"human-resources.employee-document.own.register" as const;

const createDocumentRequirementActionSchema = hrActionSchema(
	createDocumentRequirementInputSchema,
);
const updateDocumentRequirementActionSchema = hrActionSchema(
	updateDocumentRequirementInputSchema,
);
const documentRequirementTransitionActionSchema = hrActionSchema(
	documentRequirementTransitionInputSchema,
);
const registerEmployeeDocumentActionSchema = hrActionSchema(
	registerEmployeeDocumentInputSchema,
);
const updateEmployeeDocumentMetadataActionSchema = hrActionSchema(
	updateEmployeeDocumentMetadataInputSchema,
);
const verifyEmployeeDocumentActionSchema = hrActionSchema(
	verifyEmployeeDocumentInputSchema,
);
const rejectEmployeeDocumentActionSchema = hrActionSchema(
	rejectEmployeeDocumentInputSchema,
);
const employeeDocumentTransitionActionSchema = hrActionSchema(
	employeeDocumentTransitionInputSchema,
);
const getEmployeeDocumentActionSchema = hrActionSchema(
	getEmployeeDocumentInputSchema,
);
const listMissingRequiredDocumentsActionSchema = hrActionSchema(
	listMissingRequiredDocumentsInputSchema,
);
const listExpiringEmployeeDocumentsActionSchema = hrActionSchema(
	listExpiringEmployeeDocumentsInputSchema,
);
const recordWorkEligibilityActionSchema = hrActionSchema(
	recordWorkEligibilityInputSchema,
);
const verifyWorkEligibilityActionSchema = hrActionSchema(
	verifyWorkEligibilityInputSchema,
);
const workEligibilityTransitionActionSchema = hrActionSchema(
	workEligibilityTransitionInputSchema,
);
const renewWorkEligibilityActionSchema = hrActionSchema(
	renewWorkEligibilityInputSchema,
);
const getEmployeeWorkEligibilityActionSchema = hrActionSchema(
	getEmployeeWorkEligibilityInputSchema,
);
const listEmployeesWithWorkEligibilityRiskActionSchema = hrActionSchema(
	listEmployeesWithWorkEligibilityRiskInputSchema,
);
const issuePolicyAcknowledgementRequirementActionSchema = hrActionSchema(
	issuePolicyAcknowledgementRequirementInputSchema,
);
const acknowledgePolicyActionSchema = hrActionSchema(
	acknowledgePolicyInputSchema,
);
const revokePolicyAcknowledgementActionSchema = hrActionSchema(
	revokePolicyAcknowledgementInputSchema,
);
const supersedePolicyAcknowledgementRequirementActionSchema = hrActionSchema(
	supersedePolicyAcknowledgementRequirementInputSchema,
);
const getPolicyAcknowledgementStatusActionSchema = hrActionSchema(
	getPolicyAcknowledgementStatusInputSchema,
);
const listOutstandingPolicyAcknowledgementsActionSchema = hrActionSchema(
	listOutstandingPolicyAcknowledgementsInputSchema,
);
const getEmployeeComplianceSummaryActionSchema = hrActionSchema(
	getEmployeeComplianceSummaryInputSchema,
);
const detectComplianceExpiryOperationsActionSchema = hrActionSchema(
	detectComplianceExpiryOperationsInputSchema,
);

export async function createDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return runHrHumanResourcesAction({
		path: "createDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not create document requirement.",
		validationMessage: "Enter a valid document requirement.",
		actionSchema: createDocumentRequirementActionSchema,
		input,
		invoke: invokeHrPackage(createDocumentRequirement),
		mapData: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function updateDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return runHrHumanResourcesAction({
		path: "updateDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not update document requirement.",
		validationMessage: "Enter a valid document requirement update.",
		actionSchema: updateDocumentRequirementActionSchema,
		input,
		invoke: invokeHrPackage(updateDocumentRequirement),
		mapData: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function publishDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return runHrHumanResourcesAction({
		path: "publishDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not publish document requirement.",
		validationMessage: "Enter a valid document requirement publish request.",
		actionSchema: documentRequirementTransitionActionSchema,
		input,
		invoke: invokeHrPackage(publishDocumentRequirement),
		mapData: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function retireDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return runHrHumanResourcesAction({
		path: "retireDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not retire document requirement.",
		validationMessage: "Enter a valid document requirement retire request.",
		actionSchema: documentRequirementTransitionActionSchema,
		input,
		invoke: invokeHrPackage(retireDocumentRequirement),
		mapData: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function registerEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "registerEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_OWN_REGISTER,
		safeMessage: "Could not register employee document.",
		validationMessage: "Enter a valid employee document.",
		actionSchema: registerEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(registerEmployeeDocument),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function updateEmployeeDocumentMetadataAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "updateEmployeeDocumentMetadataAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not update employee document.",
		validationMessage: "Enter a valid employee document update.",
		actionSchema: updateEmployeeDocumentMetadataActionSchema,
		input,
		invoke: invokeHrPackage(updateEmployeeDocumentMetadata),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function verifyEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "verifyEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not verify employee document.",
		validationMessage: "Enter a valid employee document verification.",
		actionSchema: verifyEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(verifyEmployeeDocument),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function rejectEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "rejectEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not reject employee document.",
		validationMessage: "Enter a valid employee document rejection.",
		actionSchema: rejectEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(rejectEmployeeDocument),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function revokeEmployeeDocumentVerificationAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "revokeEmployeeDocumentVerificationAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not revoke employee document verification.",
		validationMessage: "Enter a valid employee document revoke request.",
		actionSchema: employeeDocumentTransitionActionSchema,
		input,
		invoke: invokeHrPackage(revokeEmployeeDocumentVerification),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function markEmployeeDocumentExpiredAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return runHrHumanResourcesAction({
		path: "markEmployeeDocumentExpiredAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not mark employee document expired.",
		validationMessage: "Enter a valid employee document expiry request.",
		actionSchema: employeeDocumentTransitionActionSchema,
		input,
		invoke: invokeHrPackage(markEmployeeDocumentExpired),
		mapData: (document: EmployeeDocument) => ({ document }),
	});
}

export async function getEmployeeDocumentAction(input: unknown): Promise<
	ActionResult<{
		document: EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail;
	}>
> {
	return runHrHumanResourcesAction({
		path: "getEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get employee document.",
		validationMessage: "Enter a valid employee document lookup.",
		actionSchema: getEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeDocument),
		mapData: (
			document: EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail,
		) => ({ document }),
	});
}

export async function listMissingRequiredDocumentsAction(
	input: unknown,
): Promise<ActionResult<{ page: DocumentRequirementListPage }>> {
	return runHrHumanResourcesAction({
		path: "listMissingRequiredDocumentsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list missing documents.",
		validationMessage: "Enter valid missing-document filters.",
		actionSchema: listMissingRequiredDocumentsActionSchema,
		input,
		invoke: invokeHrPackage(listMissingRequiredDocuments),
		mapData: (page: DocumentRequirementListPage) => ({ page }),
	});
}

export async function listExpiringEmployeeDocumentsAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeDocumentListPage }>> {
	return runHrHumanResourcesAction({
		path: "listExpiringEmployeeDocumentsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list expiring employee documents.",
		validationMessage: "Enter valid expiring-document filters.",
		actionSchema: listExpiringEmployeeDocumentsActionSchema,
		input,
		invoke: invokeHrPackage(listExpiringEmployeeDocuments),
		mapData: (page: EmployeeDocumentListPage) => ({ page }),
	});
}

export async function recordWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return runHrHumanResourcesAction({
		path: "recordWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not record work eligibility.",
		validationMessage: "Enter valid work eligibility.",
		actionSchema: recordWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(recordWorkEligibility),
		mapData: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function verifyWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return runHrHumanResourcesAction({
		path: "verifyWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not verify work eligibility.",
		validationMessage: "Enter a valid work eligibility verification.",
		actionSchema: verifyWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(verifyWorkEligibility),
		mapData: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function suspendWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return runHrHumanResourcesAction({
		path: "suspendWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not suspend work eligibility.",
		validationMessage: "Enter a valid work eligibility suspend request.",
		actionSchema: workEligibilityTransitionActionSchema,
		input,
		invoke: invokeHrPackage(suspendWorkEligibility),
		mapData: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function renewWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return runHrHumanResourcesAction({
		path: "renewWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not renew work eligibility.",
		validationMessage: "Enter a valid work eligibility renewal.",
		actionSchema: renewWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(renewWorkEligibility),
		mapData: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function closeWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return runHrHumanResourcesAction({
		path: "closeWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not close work eligibility.",
		validationMessage: "Enter a valid work eligibility close request.",
		actionSchema: workEligibilityTransitionActionSchema,
		input,
		invoke: invokeHrPackage(closeWorkEligibility),
		mapData: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function getEmployeeWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility | null }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeWorkEligibilityAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get work eligibility.",
		validationMessage: "Enter a valid work eligibility lookup.",
		actionSchema: getEmployeeWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeWorkEligibility),
		mapData: (eligibility: WorkEligibility | null) => ({ eligibility }),
	});
}

export async function listEmployeesWithWorkEligibilityRiskAction(
	input: unknown,
): Promise<ActionResult<{ page: WorkEligibilityRiskListPage }>> {
	return runHrHumanResourcesAction({
		path: "listEmployeesWithWorkEligibilityRiskAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list work eligibility risk.",
		validationMessage: "Enter valid work eligibility risk filters.",
		actionSchema: listEmployeesWithWorkEligibilityRiskActionSchema,
		input,
		invoke: invokeHrPackage(listEmployeesWithWorkEligibilityRisk),
		mapData: (page: WorkEligibilityRiskListPage) => ({ page }),
	});
}

export async function issuePolicyAcknowledgementRequirementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return runHrHumanResourcesAction({
		path: "issuePolicyAcknowledgementRequirementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not issue policy acknowledgement.",
		validationMessage: "Enter a valid policy acknowledgement requirement.",
		actionSchema: issuePolicyAcknowledgementRequirementActionSchema,
		input,
		invoke: invokeHrPackage(issuePolicyAcknowledgementRequirement),
		mapData: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function acknowledgePolicyAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return runHrHumanResourcesAction({
		path: "acknowledgePolicyAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not acknowledge policy.",
		validationMessage: "Enter a valid policy acknowledgement.",
		actionSchema: acknowledgePolicyActionSchema,
		input,
		invoke: invokeHrPackage(acknowledgePolicy),
		mapData: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function revokePolicyAcknowledgementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return runHrHumanResourcesAction({
		path: "revokePolicyAcknowledgementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not revoke policy acknowledgement.",
		validationMessage: "Enter a valid policy acknowledgement revoke request.",
		actionSchema: revokePolicyAcknowledgementActionSchema,
		input,
		invoke: invokeHrPackage(revokePolicyAcknowledgement),
		mapData: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function supersedePolicyAcknowledgementRequirementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return runHrHumanResourcesAction({
		path: "supersedePolicyAcknowledgementRequirementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not supersede policy acknowledgement.",
		validationMessage:
			"Enter a valid policy acknowledgement supersede request.",
		actionSchema: supersedePolicyAcknowledgementRequirementActionSchema,
		input,
		invoke: invokeHrPackage(supersedePolicyAcknowledgementRequirement),
		mapData: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function getPolicyAcknowledgementStatusAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement | null }>> {
	return runHrHumanResourcesAction({
		path: "getPolicyAcknowledgementStatusAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get policy acknowledgement status.",
		validationMessage: "Enter a valid policy acknowledgement lookup.",
		actionSchema: getPolicyAcknowledgementStatusActionSchema,
		input,
		invoke: invokeHrPackage(getPolicyAcknowledgementStatus),
		mapData: (acknowledgement: PolicyAcknowledgement | null) => ({
			acknowledgement,
		}),
	});
}

export async function listOutstandingPolicyAcknowledgementsAction(
	input: unknown,
): Promise<ActionResult<{ page: PolicyAcknowledgementListPage }>> {
	return runHrHumanResourcesAction({
		path: "listOutstandingPolicyAcknowledgementsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list outstanding policy acknowledgements.",
		validationMessage: "Enter valid policy acknowledgement filters.",
		actionSchema: listOutstandingPolicyAcknowledgementsActionSchema,
		input,
		invoke: invokeHrPackage(listOutstandingPolicyAcknowledgements),
		mapData: (page: PolicyAcknowledgementListPage) => ({ page }),
	});
}

export async function getEmployeeComplianceSummaryAction(
	input: unknown,
): Promise<ActionResult<{ summary: EmployeeComplianceSummary }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeComplianceSummaryAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not get employee compliance summary.",
		validationMessage: "Enter a valid compliance summary request.",
		actionSchema: getEmployeeComplianceSummaryActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeComplianceSummary),
		mapData: (summary: EmployeeComplianceSummary) => ({ summary }),
	});
}

export async function detectComplianceExpiryOperationsAction(
	input: unknown,
): Promise<ActionResult<{ operations: ComplianceExpiryOperations }>> {
	return runHrHumanResourcesAction({
		path: "detectComplianceExpiryOperationsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not detect compliance expiry operations.",
		validationMessage: "Enter a valid compliance expiry request.",
		actionSchema: detectComplianceExpiryOperationsActionSchema,
		input,
		invoke: invokeHrPackage(detectComplianceExpiryOperations),
		mapData: (operations: ComplianceExpiryOperations) => ({ operations }),
	});
}
