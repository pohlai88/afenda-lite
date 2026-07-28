"use server";

import type {
	HeadcountAvailability,
	HeadcountPlan,
	HeadcountPlanLine,
	HeadcountPlanListPage,
	HeadcountReservation,
	HeadcountReservationListPage,
	RecruitmentHeadcountHandoff,
	WorkforcePlanVariance,
} from "@afenda/human-resources";
import {
	addHeadcountPlanLine,
	approveHeadcountPlan,
	closeHeadcountPlan,
	consumeHeadcountReservation,
	createHeadcountPlan,
	getApprovedHeadcountPlan,
	getHeadcountAvailability,
	getHeadcountPlanById,
	getRecruitmentHeadcountHandoff,
	getWorkforcePlanVariance,
	listHeadcountPlans,
	listHeadcountReservations,
	rejectHeadcountPlan,
	releaseHeadcountReservation,
	removeHeadcountPlanLine,
	reserveHeadcount,
	submitHeadcountPlan,
	supersedeHeadcountPlan,
	updateHeadcountPlan,
	updateHeadcountPlanLine,
} from "@afenda/human-resources";
import {
	addHeadcountPlanLineInputSchema,
	consumeHeadcountReservationInputSchema,
	createHeadcountPlanInputSchema,
	getApprovedHeadcountPlanInputSchema,
	getHeadcountAvailabilityInputSchema,
	getHeadcountPlanByIdInputSchema,
	getRecruitmentHeadcountHandoffInputSchema,
	getWorkforcePlanVarianceInputSchema,
	headcountPlanStatusTransitionInputSchema,
	listHeadcountPlansInputSchema,
	listHeadcountReservationsInputSchema,
	releaseHeadcountReservationInputSchema,
	removeHeadcountPlanLineInputSchema,
	reserveHeadcountInputSchema,
	supersedeHeadcountPlanInputSchema,
	updateHeadcountPlanInputSchema,
	updateHeadcountPlanLineInputSchema,
} from "@afenda/human-resources/schemas";

import {
	invokeHrPackage,
	runHrWorkforceHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import type { ActionResult } from "@/modules/platform/schemas/action-result";

const PLAN_READ = "human-resources.workforce-plan.read" as const;
const PLAN_PREPARE = "human-resources.workforce-plan.prepare" as const;
const PLAN_APPROVE = "human-resources.workforce-plan.approve" as const;
const HEADCOUNT_RESERVE = "human-resources.headcount.reserve" as const;

const createHeadcountPlanActionSchema = hrActionSchema(
	createHeadcountPlanInputSchema,
);
const updateHeadcountPlanActionSchema = hrActionSchema(
	updateHeadcountPlanInputSchema,
);
const headcountPlanStatusTransitionActionSchema = hrActionSchema(
	headcountPlanStatusTransitionInputSchema,
);
const supersedeHeadcountPlanActionSchema = hrActionSchema(
	supersedeHeadcountPlanInputSchema,
);
const addHeadcountPlanLineActionSchema = hrActionSchema(
	addHeadcountPlanLineInputSchema,
);
const updateHeadcountPlanLineActionSchema = hrActionSchema(
	updateHeadcountPlanLineInputSchema,
);
const removeHeadcountPlanLineActionSchema = hrActionSchema(
	removeHeadcountPlanLineInputSchema,
);
const reserveHeadcountActionSchema = hrActionSchema(
	reserveHeadcountInputSchema,
);
const releaseHeadcountReservationActionSchema = hrActionSchema(
	releaseHeadcountReservationInputSchema,
);
const consumeHeadcountReservationActionSchema = hrActionSchema(
	consumeHeadcountReservationInputSchema,
);
const getHeadcountPlanByIdActionSchema = hrActionSchema(
	getHeadcountPlanByIdInputSchema,
);
const listHeadcountPlansActionSchema = hrActionSchema(
	listHeadcountPlansInputSchema,
);
const getApprovedHeadcountPlanActionSchema = hrActionSchema(
	getApprovedHeadcountPlanInputSchema,
);
const getHeadcountAvailabilityActionSchema = hrActionSchema(
	getHeadcountAvailabilityInputSchema,
);
const listHeadcountReservationsActionSchema = hrActionSchema(
	listHeadcountReservationsInputSchema,
);
const getRecruitmentHeadcountHandoffActionSchema = hrActionSchema(
	getRecruitmentHeadcountHandoffInputSchema,
);
const getWorkforcePlanVarianceActionSchema = hrActionSchema(
	getWorkforcePlanVarianceInputSchema,
);

export async function createHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "createHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not create headcount plan.",
		validationMessage: "Enter a valid headcount plan.",
		actionSchema: createHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(createHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function updateHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "updateHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not update headcount plan.",
		validationMessage: "Enter a valid headcount plan update.",
		actionSchema: updateHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(updateHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function submitHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "submitHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not submit headcount plan.",
		validationMessage: "Enter a valid headcount plan submission.",
		actionSchema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(submitHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function approveHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "approveHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not approve headcount plan.",
		validationMessage: "Enter a valid headcount plan approval.",
		actionSchema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(approveHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function rejectHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "rejectHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not reject headcount plan.",
		validationMessage: "Enter a valid headcount plan rejection.",
		actionSchema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(rejectHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function closeHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "closeHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not close headcount plan.",
		validationMessage: "Enter a valid headcount plan close request.",
		actionSchema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(closeHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function supersedeHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return runHrHumanResourcesAction({
		path: "supersedeHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not supersede headcount plan.",
		validationMessage: "Enter a valid headcount plan supersede request.",
		actionSchema: supersedeHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(supersedeHeadcountPlan),
		mapData: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function addHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ line: HeadcountPlanLine }>> {
	return runHrHumanResourcesAction({
		path: "addHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not add headcount plan line.",
		validationMessage: "Enter a valid headcount plan line.",
		actionSchema: addHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(addHeadcountPlanLine),
		mapData: (line: HeadcountPlanLine) => ({ line }),
	});
}

export async function updateHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ line: HeadcountPlanLine }>> {
	return runHrHumanResourcesAction({
		path: "updateHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not update headcount plan line.",
		validationMessage: "Enter a valid headcount plan line update.",
		actionSchema: updateHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(updateHeadcountPlanLine),
		mapData: (line: HeadcountPlanLine) => ({ line }),
	});
}

export async function removeHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ removed: true }>> {
	return runHrHumanResourcesAction({
		path: "removeHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not remove headcount plan line.",
		validationMessage: "Enter a valid headcount plan line removal.",
		actionSchema: removeHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(removeHeadcountPlanLine),
		mapData: () => ({ removed: true }),
	});
}

export async function reserveHeadcountAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return runHrHumanResourcesAction({
		path: "reserveHeadcountAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not reserve headcount.",
		validationMessage: "Enter a valid headcount reservation.",
		actionSchema: reserveHeadcountActionSchema,
		input,
		invoke: invokeHrPackage(reserveHeadcount),
		mapData: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function releaseHeadcountReservationAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return runHrHumanResourcesAction({
		path: "releaseHeadcountReservationAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not release headcount reservation.",
		validationMessage: "Enter a valid headcount reservation release.",
		actionSchema: releaseHeadcountReservationActionSchema,
		input,
		invoke: invokeHrPackage(releaseHeadcountReservation),
		mapData: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function consumeHeadcountReservationAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return runHrHumanResourcesAction({
		path: "consumeHeadcountReservationAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not consume headcount reservation.",
		validationMessage: "Enter a valid headcount reservation consumption.",
		actionSchema: consumeHeadcountReservationActionSchema,
		input,
		invoke: invokeHrPackage(consumeHeadcountReservation),
		mapData: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function getHeadcountPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan | null }>> {
	return runHrHumanResourcesAction({
		path: "getHeadcountPlanByIdAction",
		permission: PLAN_READ,
		safeMessage: "Could not get headcount plan.",
		validationMessage: "Enter a valid headcount plan lookup.",
		actionSchema: getHeadcountPlanByIdActionSchema,
		input,
		invoke: invokeHrPackage(getHeadcountPlanById),
		mapData: (plan: HeadcountPlan | null) => ({ plan }),
	});
}

export async function listHeadcountPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: HeadcountPlanListPage }>> {
	return runHrHumanResourcesAction({
		path: "listHeadcountPlansAction",
		permission: PLAN_READ,
		safeMessage: "Could not list headcount plans.",
		validationMessage: "Enter valid headcount plan filters.",
		actionSchema: listHeadcountPlansActionSchema,
		input,
		invoke: invokeHrPackage(listHeadcountPlans),
		mapData: (page: HeadcountPlanListPage) => ({ page }),
	});
}

export async function getApprovedHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan | null }>> {
	return runHrHumanResourcesAction({
		path: "getApprovedHeadcountPlanAction",
		permission: PLAN_READ,
		safeMessage: "Could not get approved headcount plan.",
		validationMessage: "Enter a valid approved headcount plan lookup.",
		actionSchema: getApprovedHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(getApprovedHeadcountPlan),
		mapData: (plan: HeadcountPlan | null) => ({ plan }),
	});
}

export async function getHeadcountAvailabilityAction(
	input: unknown,
): Promise<ActionResult<{ availability: HeadcountAvailability }>> {
	return runHrHumanResourcesAction({
		path: "getHeadcountAvailabilityAction",
		permission: PLAN_READ,
		safeMessage: "Could not get headcount availability.",
		validationMessage: "Enter a valid headcount availability request.",
		actionSchema: getHeadcountAvailabilityActionSchema,
		input,
		invoke: invokeHrPackage(getHeadcountAvailability),
		mapData: (availability: HeadcountAvailability) => ({ availability }),
	});
}

export async function listHeadcountReservationsAction(
	input: unknown,
): Promise<ActionResult<{ page: HeadcountReservationListPage }>> {
	return runHrHumanResourcesAction({
		path: "listHeadcountReservationsAction",
		permission: PLAN_READ,
		safeMessage: "Could not list headcount reservations.",
		validationMessage: "Enter valid headcount reservation filters.",
		actionSchema: listHeadcountReservationsActionSchema,
		input,
		invoke: invokeHrPackage(listHeadcountReservations),
		mapData: (page: HeadcountReservationListPage) => ({ page }),
	});
}

export async function getRecruitmentHeadcountHandoffAction(
	input: unknown,
): Promise<ActionResult<{ handoff: RecruitmentHeadcountHandoff | null }>> {
	return runHrHumanResourcesAction({
		path: "getRecruitmentHeadcountHandoffAction",
		permission: PLAN_READ,
		safeMessage: "Could not get recruitment headcount handoff.",
		validationMessage: "Enter a valid recruitment headcount handoff request.",
		actionSchema: getRecruitmentHeadcountHandoffActionSchema,
		input,
		invoke: invokeHrPackage(getRecruitmentHeadcountHandoff),
		mapData: (handoff: RecruitmentHeadcountHandoff | null) => ({ handoff }),
	});
}

export async function getWorkforcePlanVarianceAction(
	input: unknown,
): Promise<ActionResult<{ variance: WorkforcePlanVariance }>> {
	return runHrHumanResourcesAction({
		path: "getWorkforcePlanVarianceAction",
		permission: PLAN_READ,
		safeMessage: "Could not get workforce plan variance.",
		validationMessage: "Enter a valid workforce plan variance request.",
		actionSchema: getWorkforcePlanVarianceActionSchema,
		input,
		invoke: invokeHrPackage(getWorkforcePlanVariance),
		mapData: (variance: WorkforcePlanVariance) => ({ variance }),
	});
}
