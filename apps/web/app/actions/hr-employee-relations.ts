"use server";

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
	addEmployeeCaseParticipant,
	approveEmployeeCaseAction,
	assignEmployeeCaseOwner,
	closeEmployeeCase,
	getEmployeeCaseById,
	getEmployeeCaseOutcome,
	getEmployeeCaseTimeline,
	getEmployeeRelationsHistoryByEmployee,
	issueInterimEmployeeMeasure,
	listCasesAssignedToActor,
	listEmployeeCases,
	listOpenEmployeeRelationsCases,
	openEmployeeCase,
	recommendEmployeeCaseAction,
	recordEmployeeCaseAppeal,
	recordEmployeeCaseEvent,
	recordEmployeeCaseFinding,
	redactEmployeeCaseEvidenceReference,
	reopenEmployeeCase,
	resolveEmployeeCaseAppeal,
	updateEmployeeCaseClassification,
} from "@afenda/human-resources";
import {
	addEmployeeCaseEvidenceReferenceInputSchema,
	addEmployeeCaseParticipantInputSchema,
	approveEmployeeCaseActionInputSchema,
	assignEmployeeCaseOwnerInputSchema,
	closeEmployeeCaseInputSchema,
	getEmployeeCaseByIdInputSchema,
	getEmployeeCaseOutcomeInputSchema,
	getEmployeeCaseTimelineInputSchema,
	getEmployeeRelationsHistoryByEmployeeInputSchema,
	issueInterimEmployeeMeasureInputSchema,
	listCasesAssignedToActorInputSchema,
	listEmployeeCasesInputSchema,
	listOpenEmployeeRelationsCasesInputSchema,
	openEmployeeCaseInputSchema,
	recommendEmployeeCaseActionInputSchema,
	recordEmployeeCaseAppealInputSchema,
	recordEmployeeCaseEventInputSchema,
	recordEmployeeCaseFindingInputSchema,
	redactEmployeeCaseEvidenceReferenceInputSchema,
	reopenEmployeeCaseInputSchema,
	resolveEmployeeCaseAppealInputSchema,
	updateEmployeeCaseClassificationInputSchema,
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrComplianceHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

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
	return runHrHumanResourcesAction({
		path: "openEmployeeCaseAction",
		permission: CASE_OPEN,
		safeMessage: "Could not open employee case.",
		validationMessage: "Enter a valid employee case.",
		actionSchema: openEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(openEmployeeCase),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function updateEmployeeCaseClassificationAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "updateEmployeeCaseClassificationAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not update employee case classification.",
		validationMessage: "Enter a valid employee case classification.",
		actionSchema: updateEmployeeCaseClassificationActionSchema,
		input,
		invoke: invokeHrPackage(updateEmployeeCaseClassification),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function assignEmployeeCaseOwnerAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "assignEmployeeCaseOwnerAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not assign employee case owner.",
		validationMessage: "Enter a valid employee case owner assignment.",
		actionSchema: assignEmployeeCaseOwnerActionSchema,
		input,
		invoke: invokeHrPackage(assignEmployeeCaseOwner),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function addEmployeeCaseParticipantAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "addEmployeeCaseParticipantAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not add employee case participant.",
		validationMessage: "Enter a valid employee case participant.",
		actionSchema: addEmployeeCaseParticipantActionSchema,
		input,
		invoke: invokeHrPackage(addEmployeeCaseParticipant),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recordEmployeeCaseEventAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return runHrHumanResourcesAction({
		path: "recordEmployeeCaseEventAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not record employee case event.",
		validationMessage: "Enter a valid employee case event.",
		actionSchema: recordEmployeeCaseEventActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseEvent),
		mapData: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function addEmployeeCaseEvidenceReferenceAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return runHrHumanResourcesAction({
		path: "addEmployeeCaseEvidenceReferenceAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not add employee case evidence.",
		validationMessage: "Enter a valid employee case evidence reference.",
		actionSchema: addEmployeeCaseEvidenceReferenceActionSchema,
		input,
		invoke: invokeHrPackage(addEmployeeCaseEvidenceReference),
		mapData: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function redactEmployeeCaseEvidenceReferenceAction(
	input: unknown,
): Promise<ActionResult<{ event: EmployeeCaseEvent }>> {
	return runHrHumanResourcesAction({
		path: "redactEmployeeCaseEvidenceReferenceAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not redact employee case evidence.",
		validationMessage: "Enter a valid employee case evidence redaction.",
		actionSchema: redactEmployeeCaseEvidenceReferenceActionSchema,
		input,
		invoke: invokeHrPackage(redactEmployeeCaseEvidenceReference),
		mapData: (event: EmployeeCaseEvent) => ({ event }),
	});
}

export async function issueInterimEmployeeMeasureAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "issueInterimEmployeeMeasureAction",
		permission: CASE_INVESTIGATE,
		safeMessage: "Could not issue interim employee measure.",
		validationMessage: "Enter a valid interim employee measure.",
		actionSchema: issueInterimEmployeeMeasureActionSchema,
		input,
		invoke: invokeHrPackage(issueInterimEmployeeMeasure),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recordEmployeeCaseFindingAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "recordEmployeeCaseFindingAction",
		permission: CASE_FINDING,
		safeMessage: "Could not record employee case finding.",
		validationMessage: "Enter a valid employee case finding.",
		actionSchema: recordEmployeeCaseFindingActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseFinding),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function recommendEmployeeCaseActionAction(
	input: unknown,
): Promise<ActionResult<{ action: EmployeeCaseAction }>> {
	return runHrHumanResourcesAction({
		path: "recommendEmployeeCaseActionAction",
		permission: CASE_FINDING,
		safeMessage: "Could not recommend employee case action.",
		validationMessage: "Enter a valid employee case action recommendation.",
		actionSchema: recommendEmployeeCaseActionActionSchema,
		input,
		invoke: invokeHrPackage(recommendEmployeeCaseAction),
		mapData: (action: EmployeeCaseAction) => ({ action }),
	});
}

export async function approveEmployeeCaseActionAction(
	input: unknown,
): Promise<ActionResult<{ action: EmployeeCaseAction }>> {
	return runHrHumanResourcesAction({
		path: "approveEmployeeCaseActionAction",
		permission: CASE_ACTION_APPROVE,
		safeMessage: "Could not approve employee case action.",
		validationMessage: "Enter a valid employee case action approval.",
		actionSchema: approveEmployeeCaseActionActionSchema,
		input,
		invoke: invokeHrPackage(approveEmployeeCaseAction),
		mapData: (action: EmployeeCaseAction) => ({ action }),
	});
}

export async function recordEmployeeCaseAppealAction(
	input: unknown,
): Promise<ActionResult<{ appeal: EmployeeCaseAppeal }>> {
	return runHrHumanResourcesAction({
		path: "recordEmployeeCaseAppealAction",
		permission: CASE_APPEAL,
		safeMessage: "Could not record employee case appeal.",
		validationMessage: "Enter a valid employee case appeal.",
		actionSchema: recordEmployeeCaseAppealActionSchema,
		input,
		invoke: invokeHrPackage(recordEmployeeCaseAppeal),
		mapData: (appeal: EmployeeCaseAppeal) => ({ appeal }),
	});
}

export async function resolveEmployeeCaseAppealAction(
	input: unknown,
): Promise<ActionResult<{ appeal: EmployeeCaseAppeal }>> {
	return runHrHumanResourcesAction({
		path: "resolveEmployeeCaseAppealAction",
		permission: CASE_APPEAL,
		safeMessage: "Could not resolve employee case appeal.",
		validationMessage: "Enter a valid employee case appeal resolution.",
		actionSchema: resolveEmployeeCaseAppealActionSchema,
		input,
		invoke: invokeHrPackage(resolveEmployeeCaseAppeal),
		mapData: (appeal: EmployeeCaseAppeal) => ({ appeal }),
	});
}

export async function closeEmployeeCaseAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "closeEmployeeCaseAction",
		permission: CASE_FINDING,
		safeMessage: "Could not close employee case.",
		validationMessage: "Enter a valid employee case close request.",
		actionSchema: closeEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(closeEmployeeCase),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function reopenEmployeeCaseAction(
	input: unknown,
): Promise<ActionResult<{ case: EmployeeCase }>> {
	return runHrHumanResourcesAction({
		path: "reopenEmployeeCaseAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not reopen employee case.",
		validationMessage: "Enter a valid employee case reopen request.",
		actionSchema: reopenEmployeeCaseActionSchema,
		input,
		invoke: invokeHrPackage(reopenEmployeeCase),
		mapData: (employeeCase: EmployeeCase) => ({ case: employeeCase }),
	});
}

export async function getEmployeeCaseByIdAction(
	input: unknown,
): Promise<ActionResult<{ case: ProjectedEmployeeCase | null }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeCaseByIdAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case.",
		validationMessage: "Enter a valid employee case lookup.",
		actionSchema: getEmployeeCaseByIdActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseById),
		mapData: (employeeCase: ProjectedEmployeeCase | null) => ({
			case: employeeCase,
		}),
	});
}

export async function listEmployeeCasesAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return runHrHumanResourcesAction({
		path: "listEmployeeCasesAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not list employee cases.",
		validationMessage: "Enter valid employee case filters.",
		actionSchema: listEmployeeCasesActionSchema,
		input,
		invoke: invokeHrPackage(listEmployeeCases),
		mapData: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function listCasesAssignedToActorAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return runHrHumanResourcesAction({
		path: "listCasesAssignedToActorAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not list assigned employee cases.",
		validationMessage: "Enter valid assigned employee case filters.",
		actionSchema: listCasesAssignedToActorActionSchema,
		input,
		invoke: invokeHrPackage(listCasesAssignedToActor),
		mapData: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function listOpenEmployeeRelationsCasesAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return runHrHumanResourcesAction({
		path: "listOpenEmployeeRelationsCasesAction",
		permission: CASE_EXCEPTIONAL_ADMIN,
		safeMessage: "Could not list open employee relations cases.",
		validationMessage: "Enter valid open employee relations case filters.",
		actionSchema: listOpenEmployeeRelationsCasesActionSchema,
		input,
		invoke: invokeHrPackage(listOpenEmployeeRelationsCases),
		mapData: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function getEmployeeRelationsHistoryByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCaseListPage }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeRelationsHistoryByEmployeeAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee relations history.",
		validationMessage: "Enter a valid employee relations history request.",
		actionSchema: getEmployeeRelationsHistoryByEmployeeActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeRelationsHistoryByEmployee),
		mapData: (page: EmployeeCaseListPage) => ({ page }),
	});
}

export async function getEmployeeCaseTimelineAction(
	input: unknown,
): Promise<ActionResult<{ timeline: EmployeeCaseTimeline }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeCaseTimelineAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case timeline.",
		validationMessage: "Enter a valid employee case timeline request.",
		actionSchema: getEmployeeCaseTimelineActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseTimeline),
		mapData: (timeline: EmployeeCaseTimeline) => ({ timeline }),
	});
}

export async function getEmployeeCaseOutcomeAction(
	input: unknown,
): Promise<ActionResult<{ outcome: EmployeeCaseOutcome }>> {
	return runHrHumanResourcesAction({
		path: "getEmployeeCaseOutcomeAction",
		permission: CASE_ASSIGNED_READ,
		safeMessage: "Could not get employee case outcome.",
		validationMessage: "Enter a valid employee case outcome request.",
		actionSchema: getEmployeeCaseOutcomeActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCaseOutcome),
		mapData: (outcome: EmployeeCaseOutcome) => ({ outcome }),
	});
}
