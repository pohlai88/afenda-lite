"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import type {
	EmployeeCase,
	EmployeeCaseAction,
	EmployeeCaseAppeal,
	EmployeeCaseEvent,
	EmployeeCaseListPage,
	EmployeeCaseOutcome,
	EmployeeCaseTimeline,
	ProjectedEmployeeCase,
} from "@afenda/human-resources";
import {
	addEmployeeCaseEvidenceReference,
	addEmployeeCaseEvidenceReferenceInputSchema,
	addEmployeeCaseParticipant,
	addEmployeeCaseParticipantInputSchema,
	approveEmployeeCaseAction,
	approveEmployeeCaseActionInputSchema,
	assignEmployeeCaseOwner,
	assignEmployeeCaseOwnerInputSchema,
	closeEmployeeCase,
	closeEmployeeCaseInputSchema,
	getEmployeeCaseById,
	getEmployeeCaseByIdInputSchema,
	getEmployeeCaseOutcome,
	getEmployeeCaseOutcomeInputSchema,
	getEmployeeCaseTimeline,
	getEmployeeCaseTimelineInputSchema,
	getEmployeeRelationsHistoryByEmployee,
	getEmployeeRelationsHistoryByEmployeeInputSchema,
	issueInterimEmployeeMeasure,
	issueInterimEmployeeMeasureInputSchema,
	listCasesAssignedToActor,
	listCasesAssignedToActorInputSchema,
	listEmployeeCases,
	listEmployeeCasesInputSchema,
	listOpenEmployeeRelationsCases,
	listOpenEmployeeRelationsCasesInputSchema,
	openEmployeeCase,
	openEmployeeCaseInputSchema,
	recommendEmployeeCaseAction,
	recommendEmployeeCaseActionInputSchema,
	recordEmployeeCaseAppeal,
	recordEmployeeCaseAppealInputSchema,
	recordEmployeeCaseEvent,
	recordEmployeeCaseEventInputSchema,
	recordEmployeeCaseFinding,
	recordEmployeeCaseFindingInputSchema,
	redactEmployeeCaseEvidenceReference,
	redactEmployeeCaseEvidenceReferenceInputSchema,
	reopenEmployeeCase,
	reopenEmployeeCaseInputSchema,
	resolveEmployeeCaseAppeal,
	resolveEmployeeCaseAppealInputSchema,
	updateEmployeeCaseClassification,
	updateEmployeeCaseClassificationInputSchema,
} from "@afenda/human-resources";
import { defineAction } from "@/app/actions/_runtime/define-action";
import { invokeHrPackage } from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import { runHrComplianceOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";

const CASE_OPEN = "human-resources.employee-case.open" as const;
const CASE_ASSIGNED_READ =
	"human-resources.employee-case.assigned.read" as const;
const CASE_INVESTIGATE = "human-resources.employee-case.investigate" as const;
const CASE_FINDING = "human-resources.employee-case.finding" as const;
const CASE_ACTION_APPROVE =
	"human-resources.employee-case.action.approve" as const;
const CASE_APPEAL = "human-resources.employee-case.appeal" as const;
const CASE_EXCEPTIONAL_ADMIN =
	"human-resources.employee-case.exceptional.admin" as const;

const openEmployeeCaseActionSchema = hrActionSchema(
	openEmployeeCaseInputSchema,
);
const updateEmployeeCaseClassificationActionSchema = hrActionSchema(
	updateEmployeeCaseClassificationInputSchema,
);
const assignEmployeeCaseOwnerActionSchema = hrActionSchema(
	assignEmployeeCaseOwnerInputSchema,
);
const addEmployeeCaseParticipantActionSchema = hrActionSchema(
	addEmployeeCaseParticipantInputSchema,
);
const recordEmployeeCaseEventActionSchema = hrActionSchema(
	recordEmployeeCaseEventInputSchema,
);
const addEmployeeCaseEvidenceReferenceActionSchema = hrActionSchema(
	addEmployeeCaseEvidenceReferenceInputSchema,
);
const redactEmployeeCaseEvidenceReferenceActionSchema = hrActionSchema(
	redactEmployeeCaseEvidenceReferenceInputSchema,
);
const issueInterimEmployeeMeasureActionSchema = hrActionSchema(
	issueInterimEmployeeMeasureInputSchema,
);
const recordEmployeeCaseFindingActionSchema = hrActionSchema(
	recordEmployeeCaseFindingInputSchema,
);
const recommendEmployeeCaseActionActionSchema = hrActionSchema(
	recommendEmployeeCaseActionInputSchema,
);
const approveEmployeeCaseActionActionSchema = hrActionSchema(
	approveEmployeeCaseActionInputSchema,
);
const recordEmployeeCaseAppealActionSchema = hrActionSchema(
	recordEmployeeCaseAppealInputSchema,
);
const resolveEmployeeCaseAppealActionSchema = hrActionSchema(
	resolveEmployeeCaseAppealInputSchema,
);
const closeEmployeeCaseActionSchema = hrActionSchema(
	closeEmployeeCaseInputSchema,
);
const reopenEmployeeCaseActionSchema = hrActionSchema(
	reopenEmployeeCaseInputSchema,
);
const getEmployeeCaseByIdActionSchema = hrActionSchema(
	getEmployeeCaseByIdInputSchema,
);
const listEmployeeCasesActionSchema = hrActionSchema(
	listEmployeeCasesInputSchema,
);
const listCasesAssignedToActorActionSchema = hrActionSchema(
	listCasesAssignedToActorInputSchema,
);
const listOpenEmployeeRelationsCasesActionSchema = hrActionSchema(
	listOpenEmployeeRelationsCasesInputSchema,
);
const getEmployeeRelationsHistoryByEmployeeActionSchema = hrActionSchema(
	getEmployeeRelationsHistoryByEmployeeInputSchema,
);
const getEmployeeCaseTimelineActionSchema = hrActionSchema(
	getEmployeeCaseTimelineInputSchema,
);
const getEmployeeCaseOutcomeActionSchema = hrActionSchema(
	getEmployeeCaseOutcomeInputSchema,
);

export async function openEmployeeCaseAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "openEmployeeCaseAction",
		permission: CASE_OPEN,
		safeMessage: "Could not open employee case.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case.",
			}),
		schema: openEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(openEmployeeCase),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function updateEmployeeCaseClassificationAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "updateEmployeeCaseClassificationAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not update employee case classification.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case classification.",
			}),
		schema: updateEmployeeCaseClassificationActionSchema,
		input,
		invoke: invokeHrPackage(updateEmployeeCaseClassification),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function assignEmployeeCaseOwnerAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "assignEmployeeCaseOwnerAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not assign employee case owner.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case owner assignment.",
			}),
		schema: assignEmployeeCaseOwnerActionSchema,
		input,
		invoke: invokeHrPackage(assignEmployeeCaseOwner),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function addEmployeeCaseParticipantAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "addEmployeeCaseParticipantAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not add employee case participant.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case participant.",
			}),
		schema: addEmployeeCaseParticipantActionSchema,
		input,
		invoke: invokeHrPackage(addEmployeeCaseParticipant),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recordEmployeeCaseEventAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "recordEmployeeCaseEventAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not record employee case event.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case event.",
			}),
		schema: recordEmployeeCaseEventActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseEvent),
		project: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function addEmployeeCaseEvidenceReferenceAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "addEmployeeCaseEvidenceReferenceAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not add employee case evidence.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case evidence reference.",
			}),
		schema: addEmployeeCaseEvidenceReferenceActionSchema,
		input,
		invoke: invokeHrPackage(addEmployeeCaseEvidenceReference),
		project: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function redactEmployeeCaseEvidenceReferenceAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "redactEmployeeCaseEvidenceReferenceAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not redact employee case evidence.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case evidence redaction.",
			}),
		schema: redactEmployeeCaseEvidenceReferenceActionSchema,
		input,
		invoke: invokeHrPackage(redactEmployeeCaseEvidenceReference),
		project: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function issueInterimEmployeeMeasureAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "issueInterimEmployeeMeasureAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not issue interim employee measure.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid interim employee measure.",
			}),
		schema: issueInterimEmployeeMeasureActionSchema,
		input,
		invoke: invokeHrPackage(issueInterimEmployeeMeasure),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recordEmployeeCaseFindingAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "recordEmployeeCaseFindingAction",
		permission: CASE_FINDING,
		safeMessage: "Could not record employee case finding.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case finding.",
			}),
		schema: recordEmployeeCaseFindingActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseFinding),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recommendEmployeeCaseActionAction(
	input: unknown,
): Promise<ActionResult<{ action: EmployeeCaseAction }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "recommendEmployeeCaseActionAction",
		permission: CASE_FINDING,
		safeMessage: "Could not recommend employee case action.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case action recommendation.",
			}),
		schema: recommendEmployeeCaseActionActionSchema,
		input,
		invoke: invokeHrPackage(recommendEmployeeCaseAction),
		project: (action: EmployeeCaseAction) => ({ action }),
	});
}

export async function approveEmployeeCaseActionAction(
	input: unknown,
): Promise<ActionResult<{ action: EmployeeCaseAction }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "approveEmployeeCaseActionAction",
		permission: CASE_ACTION_APPROVE,
		safeMessage: "Could not approve employee case action.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case action approval.",
			}),
		schema: approveEmployeeCaseActionActionSchema,
		input,
		invoke: invokeHrPackage(approveEmployeeCaseAction),
		project: (action: EmployeeCaseAction) => ({ action }),
	});
}

export async function recordEmployeeCaseAppealAction(
	input: unknown,
): Promise<ActionResult<{ appeal: EmployeeCaseAppeal }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "recordEmployeeCaseAppealAction",
		permission: CASE_APPEAL,
		safeMessage: "Could not record employee case appeal.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case appeal.",
			}),
		schema: recordEmployeeCaseAppealActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseAppeal),
		project: (appeal: EmployeeCaseAppeal) => ({ appeal }),
	});
}

export async function resolveEmployeeCaseAppealAction(
	input: unknown,
): Promise<ActionResult<{ appeal: EmployeeCaseAppeal }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "resolveEmployeeCaseAppealAction",
		permission: CASE_APPEAL,
		safeMessage: "Could not resolve employee case appeal.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case appeal resolution.",
			}),
		schema: resolveEmployeeCaseAppealActionSchema,
		input,
		invoke: invokeHrPackage(resolveEmployeeCaseAppeal),
		project: (appeal: EmployeeCaseAppeal) => ({ appeal }),
	});
}

export async function closeEmployeeCaseAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "closeEmployeeCaseAction",
		permission: CASE_FINDING,
		safeMessage: "Could not close employee case.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case close request.",
			}),
		schema: closeEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(closeEmployeeCase),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function reopenEmployeeCaseAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "reopenEmployeeCaseAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not reopen employee case.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case reopen request.",
			}),
		schema: reopenEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(reopenEmployeeCase),
		project: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function getEmployeeCaseByIdAction(
	input: unknown,
): Promise<ActionResult<{ case: ProjectedEmployeeCase | null }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeCaseByIdAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case lookup.",
			}),
		schema: getEmployeeCaseByIdActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseById),
		project: (employeeCase: ProjectedEmployeeCase | null) => ({
			case: employeeCase,
		}),
	});
}

export async function listEmployeeCasesAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listEmployeeCasesAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not list employee cases.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid employee case filters.",
			}),
		schema: listEmployeeCasesActionSchema,
		input,
		invoke: invokeHrPackage(listEmployeeCases),
		project: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function listCasesAssignedToActorAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listCasesAssignedToActorAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not list assigned employee cases.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid assigned employee case filters.",
			}),
		schema: listCasesAssignedToActorActionSchema,
		input,
		invoke: invokeHrPackage(listCasesAssignedToActor),
		project: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function listOpenEmployeeRelationsCasesAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "listOpenEmployeeRelationsCasesAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not list open employee relations cases.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid open employee relations case filters.",
			}),
		schema: listOpenEmployeeRelationsCasesActionSchema,
		input,
		invoke: invokeHrPackage(listOpenEmployeeRelationsCases),
		project: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function getEmployeeRelationsHistoryByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeRelationsHistoryByEmployeeAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee relations history.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee relations history request.",
			}),
		schema: getEmployeeRelationsHistoryByEmployeeActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeRelationsHistoryByEmployee),
		project: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function getEmployeeCaseTimelineAction(
	input: unknown,
): Promise<ActionResult<{ timeline: EmployeeCaseTimeline }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeCaseTimelineAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case timeline.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case timeline request.",
			}),
		schema: getEmployeeCaseTimelineActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseTimeline),
		project: (timeline: EmployeeCaseTimeline) => ({ timeline }),
	});
}

export async function getEmployeeCaseOutcomeAction(
	input: unknown,
): Promise<ActionResult<{ outcome: EmployeeCaseOutcome }>> {
	return await defineAction({
		runner: runHrComplianceOperatorPermissionAction,
		path: "getEmployeeCaseOutcomeAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case outcome.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid employee case outcome request.",
			}),
		schema: getEmployeeCaseOutcomeActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseOutcome),
		project: (outcome: EmployeeCaseOutcome) => ({ outcome }),
	});
}
