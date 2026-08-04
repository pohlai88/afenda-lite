"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
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
	addHeadcountPlanLineInputSchema,
	approveHeadcountPlan,
	closeHeadcountPlan,
	consumeHeadcountReservation,
	consumeHeadcountReservationInputSchema,
	createHeadcountPlan,
	createHeadcountPlanInputSchema,
	getApprovedHeadcountPlan,
	getApprovedHeadcountPlanInputSchema,
	getHeadcountAvailability,
	getHeadcountAvailabilityInputSchema,
	getHeadcountPlanById,
	getHeadcountPlanByIdInputSchema,
	getRecruitmentHeadcountHandoff,
	getRecruitmentHeadcountHandoffInputSchema,
	getWorkforcePlanVariance,
	getWorkforcePlanVarianceInputSchema,
	headcountPlanStatusTransitionInputSchema,
	listHeadcountPlans,
	listHeadcountPlansInputSchema,
	listHeadcountReservations,
	listHeadcountReservationsInputSchema,
	rejectHeadcountPlan,
	releaseHeadcountReservation,
	releaseHeadcountReservationInputSchema,
	removeHeadcountPlanLine,
	removeHeadcountPlanLineInputSchema,
	reserveHeadcount,
	reserveHeadcountInputSchema,
	submitHeadcountPlan,
	supersedeHeadcountPlan,
	supersedeHeadcountPlanInputSchema,
	updateHeadcountPlan,
	updateHeadcountPlanInputSchema,
	updateHeadcountPlanLine,
	updateHeadcountPlanLineInputSchema,
} from "@afenda/human-resources";
import { defineAction } from "@/app/actions/_runtime/define-action";
import { invokeHrPackage } from "@/app/actions/_runtime/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";
import { runHrWorkforceOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";

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
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "createHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not create headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan.",
			}),
		schema: createHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(createHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function updateHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "updateHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not update headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan update.",
			}),
		schema: updateHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(updateHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function submitHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "submitHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not submit headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan submission.",
			}),
		schema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(submitHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function approveHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "approveHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not approve headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan approval.",
			}),
		schema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(approveHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function rejectHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "rejectHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not reject headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan rejection.",
			}),
		schema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(rejectHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function closeHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "closeHeadcountPlanAction",
		permission: PLAN_APPROVE,
		safeMessage: "Could not close headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan close request.",
			}),
		schema: headcountPlanStatusTransitionActionSchema,
		input,
		invoke: invokeHrPackage(closeHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function supersedeHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "supersedeHeadcountPlanAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not supersede headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan supersede request.",
			}),
		schema: supersedeHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(supersedeHeadcountPlan),
		project: (plan: HeadcountPlan) => ({ plan }),
	});
}

export async function addHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ line: HeadcountPlanLine }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "addHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not add headcount plan line.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan line.",
			}),
		schema: addHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(addHeadcountPlanLine),
		project: (line: HeadcountPlanLine) => ({ line }),
	});
}

export async function updateHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ line: HeadcountPlanLine }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "updateHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not update headcount plan line.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan line update.",
			}),
		schema: updateHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(updateHeadcountPlanLine),
		project: (line: HeadcountPlanLine) => ({ line }),
	});
}

export async function removeHeadcountPlanLineAction(
	input: unknown,
): Promise<ActionResult<{ removed: true }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "removeHeadcountPlanLineAction",
		permission: PLAN_PREPARE,
		safeMessage: "Could not remove headcount plan line.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan line removal.",
			}),
		schema: removeHeadcountPlanLineActionSchema,
		input,
		invoke: invokeHrPackage(removeHeadcountPlanLine),
		project: () => ({ removed: true }),
	});
}

export async function reserveHeadcountAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "reserveHeadcountAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not reserve headcount.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount reservation.",
			}),
		schema: reserveHeadcountActionSchema,
		input,
		invoke: invokeHrPackage(reserveHeadcount),
		project: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function releaseHeadcountReservationAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "releaseHeadcountReservationAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not release headcount reservation.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount reservation release.",
			}),
		schema: releaseHeadcountReservationActionSchema,
		input,
		invoke: invokeHrPackage(releaseHeadcountReservation),
		project: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function consumeHeadcountReservationAction(
	input: unknown,
): Promise<ActionResult<{ reservation: HeadcountReservation }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "consumeHeadcountReservationAction",
		permission: HEADCOUNT_RESERVE,
		safeMessage: "Could not consume headcount reservation.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount reservation consumption.",
			}),
		schema: consumeHeadcountReservationActionSchema,
		input,
		invoke: invokeHrPackage(consumeHeadcountReservation),
		project: (reservation: HeadcountReservation) => ({ reservation }),
	});
}

export async function getHeadcountPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan | null }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "getHeadcountPlanByIdAction",
		permission: PLAN_READ,
		safeMessage: "Could not get headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount plan lookup.",
			}),
		schema: getHeadcountPlanByIdActionSchema,
		input,
		invoke: invokeHrPackage(getHeadcountPlanById),
		project: (plan: HeadcountPlan | null) => ({ plan }),
	});
}

export async function listHeadcountPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: HeadcountPlanListPage }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "listHeadcountPlansAction",
		permission: PLAN_READ,
		safeMessage: "Could not list headcount plans.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid headcount plan filters.",
			}),
		schema: listHeadcountPlansActionSchema,
		input,
		invoke: invokeHrPackage(listHeadcountPlans),
		project: (page: HeadcountPlanListPage) => ({ page }),
	});
}

export async function getApprovedHeadcountPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: HeadcountPlan | null }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "getApprovedHeadcountPlanAction",
		permission: PLAN_READ,
		safeMessage: "Could not get approved headcount plan.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid approved headcount plan lookup.",
			}),
		schema: getApprovedHeadcountPlanActionSchema,
		input,
		invoke: invokeHrPackage(getApprovedHeadcountPlan),
		project: (plan: HeadcountPlan | null) => ({ plan }),
	});
}

export async function getHeadcountAvailabilityAction(
	input: unknown,
): Promise<ActionResult<{ availability: HeadcountAvailability }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "getHeadcountAvailabilityAction",
		permission: PLAN_READ,
		safeMessage: "Could not get headcount availability.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid headcount availability request.",
			}),
		schema: getHeadcountAvailabilityActionSchema,
		input,
		invoke: invokeHrPackage(getHeadcountAvailability),
		project: (availability: HeadcountAvailability) => ({ availability }),
	});
}

export async function listHeadcountReservationsAction(
	input: unknown,
): Promise<ActionResult<{ page: HeadcountReservationListPage }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "listHeadcountReservationsAction",
		permission: PLAN_READ,
		safeMessage: "Could not list headcount reservations.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter valid headcount reservation filters.",
			}),
		schema: listHeadcountReservationsActionSchema,
		input,
		invoke: invokeHrPackage(listHeadcountReservations),
		project: (page: HeadcountReservationListPage) => ({ page }),
	});
}

export async function getRecruitmentHeadcountHandoffAction(
	input: unknown,
): Promise<ActionResult<{ handoff: RecruitmentHeadcountHandoff | null }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "getRecruitmentHeadcountHandoffAction",
		permission: PLAN_READ,
		safeMessage: "Could not get recruitment headcount handoff.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid recruitment headcount handoff request.",
			}),
		schema: getRecruitmentHeadcountHandoffActionSchema,
		input,
		invoke: invokeHrPackage(getRecruitmentHeadcountHandoff),
		project: (handoff: RecruitmentHeadcountHandoff | null) => ({ handoff }),
	});
}

export async function getWorkforcePlanVarianceAction(
	input: unknown,
): Promise<ActionResult<{ variance: WorkforcePlanVariance }>> {
	return await defineAction({
		runner: runHrWorkforceOperatorPermissionAction,
		path: "getWorkforcePlanVarianceAction",
		permission: PLAN_READ,
		safeMessage: "Could not get workforce plan variance.",
		onInvalid: () =>
			errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Enter a valid workforce plan variance request.",
			}),
		schema: getWorkforcePlanVarianceActionSchema,
		input,
		invoke: invokeHrPackage(getWorkforcePlanVariance),
		project: (variance: WorkforcePlanVariance) => ({ variance }),
	});
}
