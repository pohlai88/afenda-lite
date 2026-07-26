"use server";

import type {
	ApprovedCompensationHandoff,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
	CompensationProposal,
	CompensationProposalListPage,
	EmployeeCompensation,
	SalaryBand,
	SalaryBandListPage,
} from "@afenda/human-resources";
import {
	activateEmployeeCompensation,
	amendCompensationProposal,
	amendEmployeeCompensation,
	approveCompensationProposal,
	approveEmployeeCompensation,
	archiveCompensationGrade,
	archiveCompensationGradeProgressionRule,
	archiveSalaryBand,
	correctEmployeeCompensation,
	createCompensationGrade,
	createCompensationGradeProgressionRule,
	createCompensationProposal,
	createEmployeeCompensation,
	createSalaryBand,
	endEmployeeCompensation,
	findSalaryBandByGradeAndCurrencyAsOf,
	getApprovedCompensationHandoff,
	getCompensationGrade,
	getCompensationGradeProgressionRule,
	getCompensationProposal,
	getEmployeeCompensation,
	getSalaryBand,
	listCompensationGradeProgressionRulesFromGrade,
	listCompensationGrades,
	listCompensationProposals,
	listEligibleProgressionTargets,
	listEmployeeCompensationsByEmployee,
	listSalaryBandsByGrade,
	scheduleEmployeeCompensationChange,
	supersedeSalaryBand,
	updateCompensationGrade,
} from "@afenda/human-resources";
import {
	activateEmployeeCompensationInputSchema,
	amendCompensationProposalInputSchema,
	amendEmployeeCompensationInputSchema,
	approveCompensationProposalInputSchema,
	approveEmployeeCompensationInputSchema,
	archiveCompensationGradeInputSchema,
	archiveCompensationGradeProgressionRuleInputSchema,
	archiveSalaryBandInputSchema,
	correctEmployeeCompensationInputSchema,
	createCompensationGradeInputSchema,
	createCompensationGradeProgressionRuleInputSchema,
	createCompensationProposalInputSchema,
	createEmployeeCompensationInputSchema,
	createSalaryBandInputSchema,
	endEmployeeCompensationInputSchema,
	findSalaryBandByGradeAndCurrencyAsOfInputSchema,
	getApprovedCompensationHandoffInputSchema,
	getCompensationGradeInputSchema,
	getCompensationGradeProgressionRuleInputSchema,
	getCompensationProposalInputSchema,
	getEmployeeCompensationInputSchema,
	getSalaryBandInputSchema,
	listCompensationGradeProgressionRulesFromGradeInputSchema,
	listCompensationGradesInputSchema,
	listCompensationProposalsInputSchema,
	listEligibleProgressionTargetsInputSchema,
	listEmployeeCompensationsInputSchema,
	listSalaryBandsByGradeInputSchema,
	scheduleEmployeeCompensationChangeInputSchema,
	supersedeSalaryBandInputSchema,
	updateCompensationGradeInputSchema,
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

const createCompensationGradeActionSchema = hrActionSchema(
	createCompensationGradeInputSchema,
);
const updateCompensationGradeActionSchema = hrActionSchema(
	updateCompensationGradeInputSchema,
);
const archiveCompensationGradeActionSchema = hrActionSchema(
	archiveCompensationGradeInputSchema,
);
const getCompensationGradeActionSchema = hrActionSchema(
	getCompensationGradeInputSchema,
);
const listCompensationGradesActionSchema = hrActionSchema(
	listCompensationGradesInputSchema,
);
const createSalaryBandActionSchema = hrActionSchema(
	createSalaryBandInputSchema,
);
const supersedeSalaryBandActionSchema = hrActionSchema(
	supersedeSalaryBandInputSchema,
);
const archiveSalaryBandActionSchema = hrActionSchema(
	archiveSalaryBandInputSchema,
);
const getSalaryBandActionSchema = hrActionSchema(getSalaryBandInputSchema);
const listSalaryBandsByGradeActionSchema = hrActionSchema(
	listSalaryBandsByGradeInputSchema,
);
const findSalaryBandByGradeAndCurrencyAsOfActionSchema = hrActionSchema(
	findSalaryBandByGradeAndCurrencyAsOfInputSchema,
);
const createCompensationGradeProgressionRuleActionSchema = hrActionSchema(
	createCompensationGradeProgressionRuleInputSchema,
);
const archiveCompensationGradeProgressionRuleActionSchema = hrActionSchema(
	archiveCompensationGradeProgressionRuleInputSchema,
);
const getCompensationGradeProgressionRuleActionSchema = hrActionSchema(
	getCompensationGradeProgressionRuleInputSchema,
);
const listCompensationGradeProgressionRulesFromGradeActionSchema =
	hrActionSchema(listCompensationGradeProgressionRulesFromGradeInputSchema);
const listEligibleProgressionTargetsActionSchema = hrActionSchema(
	listEligibleProgressionTargetsInputSchema,
);
const createEmployeeCompensationActionSchema = hrActionSchema(
	createEmployeeCompensationInputSchema,
);
const amendEmployeeCompensationActionSchema = hrActionSchema(
	amendEmployeeCompensationInputSchema,
);
const approveEmployeeCompensationActionSchema = hrActionSchema(
	approveEmployeeCompensationInputSchema,
);
const scheduleEmployeeCompensationChangeActionSchema = hrActionSchema(
	scheduleEmployeeCompensationChangeInputSchema,
);
const activateEmployeeCompensationActionSchema = hrActionSchema(
	activateEmployeeCompensationInputSchema,
);
const correctEmployeeCompensationActionSchema = hrActionSchema(
	correctEmployeeCompensationInputSchema,
);
const endEmployeeCompensationActionSchema = hrActionSchema(
	endEmployeeCompensationInputSchema,
);
const getEmployeeCompensationActionSchema = hrActionSchema(
	getEmployeeCompensationInputSchema,
);
const listEmployeeCompensationsActionSchema = hrActionSchema(
	listEmployeeCompensationsInputSchema,
);
const createCompensationProposalActionSchema = hrActionSchema(
	createCompensationProposalInputSchema,
);
const amendCompensationProposalActionSchema = hrActionSchema(
	amendCompensationProposalInputSchema,
);
const approveCompensationProposalActionSchema = hrActionSchema(
	approveCompensationProposalInputSchema,
);
const getCompensationProposalActionSchema = hrActionSchema(
	getCompensationProposalInputSchema,
);
const listCompensationProposalsActionSchema = hrActionSchema(
	listCompensationProposalsInputSchema,
);
const getApprovedCompensationHandoffActionSchema = hrActionSchema(
	getApprovedCompensationHandoffInputSchema,
);

const COMPENSATION_MANAGE = "human-resources.compensation.manage" as const;
const COMPENSATION_READ = "human-resources.compensation.read" as const;
const COMPENSATION_PROPOSAL_CREATE =
	"human-resources.compensation-proposal.create" as const;
const COMPENSATION_PROPOSAL_AMEND =
	"human-resources.compensation-proposal.amend" as const;
const COMPENSATION_PROPOSAL_APPROVE =
	"human-resources.compensation-proposal.approve" as const;
const COMPENSATION_PROPOSAL_READ =
	"human-resources.compensation-proposal.read" as const;

type EmployeeCompensationListPagePartial = {
	compensations: Partial<EmployeeCompensation>[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export async function createCompensationGradeAction(
	input: unknown,
): Promise<ActionResult<{ grade: CompensationGrade }>> {
	return runHrHumanResourcesAction<
		CompensationGrade,
		{ grade: CompensationGrade }
	>({
		path: "createCompensationGradeAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create compensation grade.",
		validationMessage: "Enter a valid compensation grade.",
		actionSchema: createCompensationGradeActionSchema,
		input,
		invoke: invokeHrPackage(createCompensationGrade),
		mapData: (grade) => ({ grade: grade }),
	});
}

export async function updateCompensationGradeAction(
	input: unknown,
): Promise<ActionResult<{ grade: CompensationGrade }>> {
	return runHrHumanResourcesAction<
		CompensationGrade,
		{ grade: CompensationGrade }
	>({
		path: "updateCompensationGradeAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not update compensation grade.",
		validationMessage: "Enter a valid compensation grade update.",
		actionSchema: updateCompensationGradeActionSchema,
		input,
		invoke: invokeHrPackage(updateCompensationGrade),
		mapData: (grade) => ({ grade: grade }),
	});
}

export async function archiveCompensationGradeAction(
	input: unknown,
): Promise<ActionResult<{ grade: CompensationGrade }>> {
	return runHrHumanResourcesAction<
		CompensationGrade,
		{ grade: CompensationGrade }
	>({
		path: "archiveCompensationGradeAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not archive compensation grade.",
		validationMessage: "Enter a valid grade archive request.",
		actionSchema: archiveCompensationGradeActionSchema,
		input,
		invoke: invokeHrPackage(archiveCompensationGrade),
		mapData: (grade) => ({ grade: grade }),
	});
}

export async function getCompensationGradeAction(
	input: unknown,
): Promise<ActionResult<{ grade: CompensationGrade | null }>> {
	return runHrHumanResourcesAction<
		CompensationGrade | null,
		{ grade: CompensationGrade | null }
	>({
		path: "getCompensationGradeAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get compensation grade.",
		validationMessage: "Enter a valid grade lookup.",
		actionSchema: getCompensationGradeActionSchema,
		input,
		invoke: invokeHrPackage(getCompensationGrade),
		mapData: (grade) => ({ grade: grade }),
	});
}

export async function listCompensationGradesAction(
	input: unknown,
): Promise<ActionResult<{ page: CompensationGradeListPage }>> {
	return runHrHumanResourcesAction<
		CompensationGradeListPage,
		{ page: CompensationGradeListPage }
	>({
		path: "listCompensationGradesAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list compensation grades.",
		validationMessage: "Enter valid grade list filters.",
		actionSchema: listCompensationGradesActionSchema,
		input,
		invoke: invokeHrPackage(listCompensationGrades),
		mapData: (page) => ({ page: page }),
	});
}

export async function createSalaryBandAction(
	input: unknown,
): Promise<ActionResult<{ band: SalaryBand }>> {
	return runHrHumanResourcesAction<SalaryBand, { band: SalaryBand }>({
		path: "createSalaryBandAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create salary band.",
		validationMessage: "Enter a valid salary band.",
		actionSchema: createSalaryBandActionSchema,
		input,
		invoke: invokeHrPackage(createSalaryBand),
		mapData: (band) => ({ band: band }),
	});
}

export async function supersedeSalaryBandAction(
	input: unknown,
): Promise<ActionResult<{ band: SalaryBand }>> {
	return runHrHumanResourcesAction<SalaryBand, { band: SalaryBand }>({
		path: "supersedeSalaryBandAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not supersede salary band.",
		validationMessage: "Enter a valid salary band supersede request.",
		actionSchema: supersedeSalaryBandActionSchema,
		input,
		invoke: invokeHrPackage(supersedeSalaryBand),
		mapData: (band) => ({ band: band }),
	});
}

export async function archiveSalaryBandAction(
	input: unknown,
): Promise<ActionResult<{ band: SalaryBand }>> {
	return runHrHumanResourcesAction<SalaryBand, { band: SalaryBand }>({
		path: "archiveSalaryBandAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not archive salary band.",
		validationMessage: "Enter a valid salary band archive request.",
		actionSchema: archiveSalaryBandActionSchema,
		input,
		invoke: invokeHrPackage(archiveSalaryBand),
		mapData: (band) => ({ band: band }),
	});
}

export async function getSalaryBandAction(
	input: unknown,
): Promise<ActionResult<{ band: SalaryBand | null }>> {
	return runHrHumanResourcesAction<
		SalaryBand | null,
		{ band: SalaryBand | null }
	>({
		path: "getSalaryBandAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get salary band.",
		validationMessage: "Enter a valid salary band lookup.",
		actionSchema: getSalaryBandActionSchema,
		input,
		invoke: invokeHrPackage(getSalaryBand),
		mapData: (band) => ({ band: band }),
	});
}

export async function listSalaryBandsByGradeAction(
	input: unknown,
): Promise<ActionResult<{ page: SalaryBandListPage }>> {
	return runHrHumanResourcesAction<
		SalaryBandListPage,
		{ page: SalaryBandListPage }
	>({
		path: "listSalaryBandsByGradeAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list salary bands.",
		validationMessage: "Enter valid salary band list filters.",
		actionSchema: listSalaryBandsByGradeActionSchema,
		input,
		invoke: invokeHrPackage(listSalaryBandsByGrade),
		mapData: (page) => ({ page: page }),
	});
}

export async function findSalaryBandByGradeAndCurrencyAsOfAction(
	input: unknown,
): Promise<ActionResult<{ band: SalaryBand }>> {
	return runHrHumanResourcesAction<SalaryBand, { band: SalaryBand }>({
		path: "findSalaryBandByGradeAndCurrencyAsOfAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not find salary band as of date.",
		validationMessage: "Enter a valid salary band as-of lookup.",
		actionSchema: findSalaryBandByGradeAndCurrencyAsOfActionSchema,
		input,
		invoke: invokeHrPackage(findSalaryBandByGradeAndCurrencyAsOf),
		mapData: (band) => ({ band: band }),
	});
}

export async function createCompensationGradeProgressionRuleAction(
	input: unknown,
): Promise<ActionResult<{ rule: CompensationGradeProgressionRule }>> {
	return runHrHumanResourcesAction<
		CompensationGradeProgressionRule,
		{ rule: CompensationGradeProgressionRule }
	>({
		path: "createCompensationGradeProgressionRuleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create grade progression rule.",
		validationMessage: "Enter a valid grade progression rule.",
		actionSchema: createCompensationGradeProgressionRuleActionSchema,
		input,
		invoke: invokeHrPackage(createCompensationGradeProgressionRule),
		mapData: (rule) => ({ rule: rule }),
	});
}

export async function archiveCompensationGradeProgressionRuleAction(
	input: unknown,
): Promise<ActionResult<{ rule: CompensationGradeProgressionRule }>> {
	return runHrHumanResourcesAction<
		CompensationGradeProgressionRule,
		{ rule: CompensationGradeProgressionRule }
	>({
		path: "archiveCompensationGradeProgressionRuleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not archive grade progression rule.",
		validationMessage: "Enter a valid progression rule archive request.",
		actionSchema: archiveCompensationGradeProgressionRuleActionSchema,
		input,
		invoke: invokeHrPackage(archiveCompensationGradeProgressionRule),
		mapData: (rule) => ({ rule: rule }),
	});
}

export async function getCompensationGradeProgressionRuleAction(
	input: unknown,
): Promise<ActionResult<{ rule: CompensationGradeProgressionRule | null }>> {
	return runHrHumanResourcesAction<
		CompensationGradeProgressionRule | null,
		{ rule: CompensationGradeProgressionRule | null }
	>({
		path: "getCompensationGradeProgressionRuleAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get grade progression rule.",
		validationMessage: "Enter a valid progression rule lookup.",
		actionSchema: getCompensationGradeProgressionRuleActionSchema,
		input,
		invoke: invokeHrPackage(getCompensationGradeProgressionRule),
		mapData: (rule) => ({ rule: rule }),
	});
}

export async function listCompensationGradeProgressionRulesFromGradeAction(
	input: unknown,
): Promise<ActionResult<{ page: CompensationGradeProgressionRuleListPage }>> {
	return runHrHumanResourcesAction<
		CompensationGradeProgressionRuleListPage,
		{ page: CompensationGradeProgressionRuleListPage }
	>({
		path: "listCompensationGradeProgressionRulesFromGradeAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list grade progression rules.",
		validationMessage: "Enter valid progression rule list filters.",
		actionSchema: listCompensationGradeProgressionRulesFromGradeActionSchema,
		input,
		invoke: invokeHrPackage(listCompensationGradeProgressionRulesFromGrade),
		mapData: (page) => ({ page: page }),
	});
}

export async function listEligibleProgressionTargetsAction(
	input: unknown,
): Promise<ActionResult<{ targets: CompensationGradeProgressionRule[] }>> {
	return runHrHumanResourcesAction<
		CompensationGradeProgressionRule[],
		{ targets: CompensationGradeProgressionRule[] }
	>({
		path: "listEligibleProgressionTargetsAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list eligible progression targets.",
		validationMessage: "Enter valid progression target filters.",
		actionSchema: listEligibleProgressionTargetsActionSchema,
		input,
		invoke: invokeHrPackage(listEligibleProgressionTargets),
		mapData: (targets) => ({ targets: targets }),
	});
}

export async function createEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "createEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create employee compensation.",
		validationMessage: "Enter a valid compensation record.",
		actionSchema: createEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(createEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function amendEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "amendEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not amend employee compensation.",
		validationMessage: "Enter a valid compensation amendment.",
		actionSchema: amendEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(amendEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function approveEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "approveEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not approve employee compensation.",
		validationMessage: "Enter a valid compensation approval.",
		actionSchema: approveEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(approveEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function scheduleEmployeeCompensationChangeAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "scheduleEmployeeCompensationChangeAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not schedule employee compensation change.",
		validationMessage: "Enter a valid compensation schedule request.",
		actionSchema: scheduleEmployeeCompensationChangeActionSchema,
		input,
		invoke: invokeHrPackage(scheduleEmployeeCompensationChange),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function activateEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "activateEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not activate employee compensation.",
		validationMessage: "Enter a valid compensation activation request.",
		actionSchema: activateEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(activateEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function correctEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "correctEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not correct employee compensation.",
		validationMessage: "Enter a valid compensation correction.",
		actionSchema: correctEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(correctEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function endEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "endEmployeeCompensationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not end employee compensation.",
		validationMessage: "Enter a valid compensation end request.",
		actionSchema: endEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(endEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function getEmployeeCompensationAction(
	input: unknown,
): Promise<ActionResult<{ compensation: Partial<EmployeeCompensation> }>> {
	return runHrHumanResourcesAction<
		Partial<EmployeeCompensation>,
		{ compensation: Partial<EmployeeCompensation> }
	>({
		path: "getEmployeeCompensationAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get employee compensation.",
		validationMessage: "Enter a valid compensation lookup.",
		actionSchema: getEmployeeCompensationActionSchema,
		input,
		invoke: invokeHrPackage(getEmployeeCompensation),
		mapData: (compensation) => ({ compensation: compensation }),
	});
}

export async function listEmployeeCompensationsByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ page: EmployeeCompensationListPagePartial }>> {
	return runHrHumanResourcesAction<
		EmployeeCompensationListPagePartial,
		{ page: EmployeeCompensationListPagePartial }
	>({
		path: "listEmployeeCompensationsByEmployeeAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list employee compensations.",
		validationMessage: "Enter valid compensation list filters.",
		actionSchema: listEmployeeCompensationsActionSchema,
		input,
		invoke: invokeHrPackage(listEmployeeCompensationsByEmployee),
		mapData: (page) => ({ page: page }),
	});
}

export async function createCompensationProposalAction(
	input: unknown,
): Promise<ActionResult<{ proposal: CompensationProposal }>> {
	return runHrHumanResourcesAction<
		CompensationProposal,
		{ proposal: CompensationProposal }
	>({
		path: "createCompensationProposalAction",
		permission: COMPENSATION_PROPOSAL_CREATE,
		safeMessage: "Could not create compensation proposal.",
		validationMessage: "Enter a valid compensation proposal.",
		actionSchema: createCompensationProposalActionSchema,
		input,
		invoke: invokeHrPackage(createCompensationProposal),
		mapData: (proposal) => ({ proposal: proposal }),
	});
}

export async function amendCompensationProposalAction(
	input: unknown,
): Promise<ActionResult<{ proposal: CompensationProposal }>> {
	return runHrHumanResourcesAction<
		CompensationProposal,
		{ proposal: CompensationProposal }
	>({
		path: "amendCompensationProposalAction",
		permission: COMPENSATION_PROPOSAL_AMEND,
		safeMessage: "Could not amend compensation proposal.",
		validationMessage: "Enter a valid proposal amendment.",
		actionSchema: amendCompensationProposalActionSchema,
		input,
		invoke: invokeHrPackage(amendCompensationProposal),
		mapData: (proposal) => ({ proposal: proposal }),
	});
}

export async function approveCompensationProposalAction(
	input: unknown,
): Promise<ActionResult<{ proposal: CompensationProposal }>> {
	return runHrHumanResourcesAction<
		CompensationProposal,
		{ proposal: CompensationProposal }
	>({
		path: "approveCompensationProposalAction",
		permission: COMPENSATION_PROPOSAL_APPROVE,
		safeMessage: "Could not approve compensation proposal.",
		validationMessage: "Enter a valid proposal approval.",
		actionSchema: approveCompensationProposalActionSchema,
		input,
		invoke: invokeHrPackage(approveCompensationProposal),
		mapData: (proposal) => ({ proposal: proposal }),
	});
}

export async function getCompensationProposalAction(
	input: unknown,
): Promise<ActionResult<{ proposal: CompensationProposal | null }>> {
	return runHrHumanResourcesAction<
		CompensationProposal | null,
		{ proposal: CompensationProposal | null }
	>({
		path: "getCompensationProposalAction",
		permission: COMPENSATION_PROPOSAL_READ,
		safeMessage: "Could not get compensation proposal.",
		validationMessage: "Enter a valid proposal lookup.",
		actionSchema: getCompensationProposalActionSchema,
		input,
		invoke: invokeHrPackage(getCompensationProposal),
		mapData: (proposal) => ({ proposal: proposal }),
	});
}

export async function listCompensationProposalsAction(
	input: unknown,
): Promise<ActionResult<{ page: CompensationProposalListPage }>> {
	return runHrHumanResourcesAction<
		CompensationProposalListPage,
		{ page: CompensationProposalListPage }
	>({
		path: "listCompensationProposalsAction",
		permission: COMPENSATION_PROPOSAL_READ,
		safeMessage: "Could not list compensation proposals.",
		validationMessage: "Enter valid proposal list filters.",
		actionSchema: listCompensationProposalsActionSchema,
		input,
		invoke: invokeHrPackage(listCompensationProposals),
		mapData: (page) => ({ page: page }),
	});
}

export async function getApprovedCompensationHandoffAction(
	input: unknown,
): Promise<ActionResult<{ handoff: ApprovedCompensationHandoff | null }>> {
	return runHrHumanResourcesAction<
		ApprovedCompensationHandoff | null,
		{ handoff: ApprovedCompensationHandoff | null }
	>({
		path: "getApprovedCompensationHandoffAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get approved compensation handoff.",
		validationMessage: "Enter a valid compensation handoff lookup.",
		actionSchema: getApprovedCompensationHandoffActionSchema,
		input,
		invoke: invokeHrPackage(getApprovedCompensationHandoff),
		mapData: (handoff) => ({ handoff: handoff }),
	});
}
