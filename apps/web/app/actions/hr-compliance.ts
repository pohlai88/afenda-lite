"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
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
	acknowledgePolicyInputSchema,
	closeWorkEligibility,
	createDocumentRequirement,
	createDocumentRequirementInputSchema,
	detectComplianceExpiryOperations,
	detectComplianceExpiryOperationsInputSchema,
	documentRequirementTransitionInputSchema,
	employeeDocumentTransitionInputSchema,
	getEmployeeComplianceSummary,
	getEmployeeComplianceSummaryInputSchema,
	getEmployeeDocument,
	getEmployeeDocumentInputSchema,
	getEmployeeWorkEligibility,
	getEmployeeWorkEligibilityInputSchema,
	getPolicyAcknowledgementStatus,
	getPolicyAcknowledgementStatusInputSchema,
	issuePolicyAcknowledgementRequirement,
	issuePolicyAcknowledgementRequirementInputSchema,
	listEmployeesWithWorkEligibilityRisk,
	listEmployeesWithWorkEligibilityRiskInputSchema,
	listExpiringEmployeeDocuments,
	listExpiringEmployeeDocumentsInputSchema,
	listMissingRequiredDocuments,
	listMissingRequiredDocumentsInputSchema,
	listOutstandingPolicyAcknowledgements,
	listOutstandingPolicyAcknowledgementsInputSchema,
	markEmployeeDocumentExpired,
	publishDocumentRequirement,
	recordWorkEligibility,
	recordWorkEligibilityInputSchema,
	registerEmployeeDocument,
	registerEmployeeDocumentInputSchema,
	rejectEmployeeDocument,
	rejectEmployeeDocumentInputSchema,
	renewWorkEligibility,
	renewWorkEligibilityInputSchema,
	retireDocumentRequirement,
	revokeEmployeeDocumentVerification,
	revokePolicyAcknowledgement,
	revokePolicyAcknowledgementInputSchema,
	supersedePolicyAcknowledgementRequirement,
	supersedePolicyAcknowledgementRequirementInputSchema,
	suspendWorkEligibility,
	updateDocumentRequirement,
	updateDocumentRequirementInputSchema,
	updateEmployeeDocumentMetadata,
	updateEmployeeDocumentMetadataInputSchema,
	verifyEmployeeDocument,
	verifyEmployeeDocumentInputSchema,
	verifyWorkEligibility,
	verifyWorkEligibilityInputSchema,
	workEligibilityTransitionInputSchema,
} from "@afenda/human-resources";
import { defineAction } from "@/app/actions/_runtime/define-action";
import { invokeHrPackage } from "@/app/actions/_runtime/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import { runHrComplianceOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";

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
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "createDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not create document requirement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid document requirement.",
			}),
		schema: createDocumentRequirementActionSchema,
		input,
		invoke: invokeHrPackage(createDocumentRequirement),
		project: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function updateDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "updateDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not update document requirement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid document requirement update.",
			}),
		schema: updateDocumentRequirementActionSchema,
		input,
		invoke: invokeHrPackage(updateDocumentRequirement),
		project: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function publishDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "publishDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not publish document requirement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid document requirement publish request.",
			}),
		schema: documentRequirementTransitionActionSchema,
		input,
		invoke: invokeHrPackage(publishDocumentRequirement),
		project: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function retireDocumentRequirementAction(
	input: unknown,
): Promise<ActionResult<{ requirement: DocumentRequirement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "retireDocumentRequirementAction",
		permission: DOCUMENT_REQUIREMENT_MANAGE,
		safeMessage: "Could not retire document requirement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid document requirement retire request.",
			}),
		schema: documentRequirementTransitionActionSchema,
		input,
		invoke: invokeHrPackage(retireDocumentRequirement),
		project: (requirement: DocumentRequirement) => ({ requirement }),
	});
}

export async function registerEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "registerEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_OWN_REGISTER,
		safeMessage: "Could not register employee document.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document.",
			}),
		schema: registerEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(registerEmployeeDocument),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function updateEmployeeDocumentMetadataAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "updateEmployeeDocumentMetadataAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not update employee document.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document update.",
			}),
		schema: updateEmployeeDocumentMetadataActionSchema,
		input,
		invoke: invokeHrPackage(updateEmployeeDocumentMetadata),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function verifyEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "verifyEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not verify employee document.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document verification.",
			}),
		schema: verifyEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(verifyEmployeeDocument),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function rejectEmployeeDocumentAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "rejectEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not reject employee document.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document rejection.",
			}),
		schema: rejectEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(rejectEmployeeDocument),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function revokeEmployeeDocumentVerificationAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "revokeEmployeeDocumentVerificationAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not revoke employee document verification.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document revoke request.",
			}),
		schema: employeeDocumentTransitionActionSchema,
		input,
		invoke: invokeHrPackage(revokeEmployeeDocumentVerification),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function markEmployeeDocumentExpiredAction(
	input: unknown,
): Promise<ActionResult<{ document: EmployeeDocument }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "markEmployeeDocumentExpiredAction",
		permission: EMPLOYEE_DOCUMENT_VERIFY,
		safeMessage: "Could not mark employee document expired.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document expiry request.",
			}),
		schema: employeeDocumentTransitionActionSchema,
		input,
		invoke: invokeHrPackage(markEmployeeDocumentExpired),
		project: (document: EmployeeDocument) => ({ document }),
	});
}

export async function getEmployeeDocumentAction(input: unknown): Promise<
	ActionResult<{
		document: EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail;
	}>
> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeDocumentAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get employee document.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee document lookup.",
			}),
		schema: getEmployeeDocumentActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeDocument),
		project: (
			document: EmployeeDocumentListItem | EmployeeDocumentSensitiveDetail,
		) => ({ document }),
	});
}

export async function listMissingRequiredDocumentsAction(
	input: unknown,
): Promise<ActionResult<{ page: DocumentRequirementListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listMissingRequiredDocumentsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list missing documents.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid missing-document filters.",
			}),
		schema: listMissingRequiredDocumentsActionSchema,
		input,
		invoke: invokeHrPackage(listMissingRequiredDocuments),
		project: (page: DocumentRequirementListPage) => ({ page }),
	});
}

export async function listExpiringEmployeeDocumentsAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeDocumentListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listExpiringEmployeeDocumentsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list expiring employee documents.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid expiring-document filters.",
			}),
		schema: listExpiringEmployeeDocumentsActionSchema,
		input,
		invoke: invokeHrPackage(listExpiringEmployeeDocuments),
		project: (page: EmployeeDocumentListPage) => ({ page }),
	});
}

export async function recordWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "recordWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not record work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid work eligibility.",
			}),
		schema: recordWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(recordWorkEligibility),
		project: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function verifyWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "verifyWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not verify work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid work eligibility verification.",
			}),
		schema: verifyWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(verifyWorkEligibility),
		project: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function suspendWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "suspendWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not suspend work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid work eligibility suspend request.",
			}),
		schema: workEligibilityTransitionActionSchema,
		input,
		invoke: invokeHrPackage(suspendWorkEligibility),
		project: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function renewWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "renewWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not renew work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid work eligibility renewal.",
			}),
		schema: renewWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(renewWorkEligibility),
		project: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function closeWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "closeWorkEligibilityAction",
		permission: WORK_ELIGIBILITY_VERIFY,
		safeMessage: "Could not close work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid work eligibility close request.",
			}),
		schema: workEligibilityTransitionActionSchema,
		input,
		invoke: invokeHrPackage(closeWorkEligibility),
		project: (eligibility: WorkEligibility) => ({ eligibility }),
	});
}

export async function getEmployeeWorkEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: WorkEligibility | null }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeWorkEligibilityAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get work eligibility.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid work eligibility lookup.",
			}),
		schema: getEmployeeWorkEligibilityActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeWorkEligibility),
		project: (eligibility: WorkEligibility | null) => ({ eligibility }),
	});
}

export async function listEmployeesWithWorkEligibilityRiskAction(
	input: unknown,
): Promise<ActionResult<{ page: WorkEligibilityRiskListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listEmployeesWithWorkEligibilityRiskAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list work eligibility risk.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid work eligibility risk filters.",
			}),
		schema: listEmployeesWithWorkEligibilityRiskActionSchema,
		input,
		invoke: invokeHrPackage(listEmployeesWithWorkEligibilityRisk),
		project: (page: WorkEligibilityRiskListPage) => ({ page }),
	});
}

export async function issuePolicyAcknowledgementRequirementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "issuePolicyAcknowledgementRequirementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not issue policy acknowledgement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid policy acknowledgement requirement.",
			}),
		schema: issuePolicyAcknowledgementRequirementActionSchema,
		input,
		invoke: invokeHrPackage(issuePolicyAcknowledgementRequirement),
		project: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function acknowledgePolicyAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "acknowledgePolicyAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not acknowledge policy.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid policy acknowledgement.",
			}),
		schema: acknowledgePolicyActionSchema,
		input,
		invoke: invokeHrPackage(acknowledgePolicy),
		project: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function revokePolicyAcknowledgementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "revokePolicyAcknowledgementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not revoke policy acknowledgement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid policy acknowledgement revoke request.",
			}),
		schema: revokePolicyAcknowledgementActionSchema,
		input,
		invoke: invokeHrPackage(revokePolicyAcknowledgement),
		project: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function supersedePolicyAcknowledgementRequirementAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "supersedePolicyAcknowledgementRequirementAction",
		permission: POLICY_ACK_ADMIN,
		safeMessage: "Could not supersede policy acknowledgement.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage:
					"Enter a valid policy acknowledgement supersede request.",
			}),
		schema: supersedePolicyAcknowledgementRequirementActionSchema,
		input,
		invoke: invokeHrPackage(supersedePolicyAcknowledgementRequirement),
		project: (acknowledgement: PolicyAcknowledgement) => ({ acknowledgement }),
	});
}

export async function getPolicyAcknowledgementStatusAction(
	input: unknown,
): Promise<ActionResult<{ acknowledgement: PolicyAcknowledgement | null }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getPolicyAcknowledgementStatusAction",
		permission: EMPLOYEE_DOCUMENT_OWN_READ,
		safeMessage: "Could not get policy acknowledgement status.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid policy acknowledgement lookup.",
			}),
		schema: getPolicyAcknowledgementStatusActionSchema,
		input,
		invoke: invokeHrPackage(getPolicyAcknowledgementStatus),
		project: (acknowledgement: PolicyAcknowledgement | null) => ({
			acknowledgement,
		}),
	});
}

export async function listOutstandingPolicyAcknowledgementsAction(
	input: unknown,
): Promise<ActionResult<{ page: PolicyAcknowledgementListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listOutstandingPolicyAcknowledgementsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not list outstanding policy acknowledgements.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid policy acknowledgement filters.",
			}),
		schema: listOutstandingPolicyAcknowledgementsActionSchema,
		input,
		invoke: invokeHrPackage(listOutstandingPolicyAcknowledgements),
		project: (page: PolicyAcknowledgementListPage) => ({ page }),
	});
}

export async function getEmployeeComplianceSummaryAction(
	input: unknown,
): Promise<ActionResult<{ summary: EmployeeComplianceSummary }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeComplianceSummaryAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not get employee compliance summary.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid compliance summary request.",
			}),
		schema: getEmployeeComplianceSummaryActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeComplianceSummary),
		project: (summary: EmployeeComplianceSummary) => ({ summary }),
	});
}

export async function detectComplianceExpiryOperationsAction(
	input: unknown,
): Promise<ActionResult<{ operations: ComplianceExpiryOperations }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "detectComplianceExpiryOperationsAction",
		permission: COMPLIANCE_ADMIN,
		safeMessage: "Could not detect compliance expiry operations.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid compliance expiry request.",
			}),
		schema: detectComplianceExpiryOperationsActionSchema,
		input,
		invoke: invokeHrPackage(detectComplianceExpiryOperations),
		project: (operations: ComplianceExpiryOperations) => ({ operations }),
	});
}
