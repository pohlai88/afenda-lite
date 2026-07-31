"use server";

import type { Result as ActionResult } from "@afenda/errors";
import type {
	CompensationReview,
	CompensationReviewCycle,
	CompensationReviewCycleListPage,
	CompensationReviewListPage,
	EmployeeCompensation,
} from "@afenda/human-resources";
import {
	applyApprovedCompensationResult,
	cancelCompensationReviewCycle,
	closeCompensationReviewCycle,
	createCompensationReviewCycle,
	createCompensationReviewDraft,
	finalizeCompensationReview,
	getCompensationReview,
	getCompensationReviewCycle,
	listCompensationReviewCycles,
	listCompensationReviewsByEmployee,
	openCompensationReviewCycle,
	recordCompensationRecommendation,
} from "@afenda/human-resources";
import {
	applyApprovedCompensationResultInputSchema,
	compensationReviewCycleStatusTransitionInputSchema,
	createCompensationReviewCycleInputSchema,
	createCompensationReviewDraftInputSchema,
	finalizeCompensationReviewInputSchema,
	getCompensationReviewCycleInputSchema,
	getCompensationReviewInputSchema,
	listCompensationReviewCyclesInputSchema,
	listCompensationReviewsByEmployeeInputSchema,
	recordCompensationRecommendationInputSchema,
} from "@afenda/human-resources/schemas";
import {
	invokeHrPackage,
	runHrCompensationHumanResourcesAction as runHrHumanResourcesAction,
} from "@/app/actions/hr-action-runner";
import { hrActionSchema } from "@/app/actions/hr-mutation-context";

const createCompensationReviewCycleActionSchema = hrActionSchema(
	createCompensationReviewCycleInputSchema,
);
const openCompensationReviewCycleActionSchema = hrActionSchema(
	compensationReviewCycleStatusTransitionInputSchema,
);
const closeCompensationReviewCycleActionSchema = hrActionSchema(
	compensationReviewCycleStatusTransitionInputSchema,
);
const cancelCompensationReviewCycleActionSchema = hrActionSchema(
	compensationReviewCycleStatusTransitionInputSchema,
);
const getCompensationReviewCycleActionSchema = hrActionSchema(
	getCompensationReviewCycleInputSchema,
);
const listCompensationReviewCyclesActionSchema = hrActionSchema(
	listCompensationReviewCyclesInputSchema,
);
const createCompensationReviewDraftActionSchema = hrActionSchema(
	createCompensationReviewDraftInputSchema,
);
const recordCompensationRecommendationActionSchema = hrActionSchema(
	recordCompensationRecommendationInputSchema,
);
const finalizeCompensationReviewActionSchema = hrActionSchema(
	finalizeCompensationReviewInputSchema,
);
const applyApprovedCompensationResultActionSchema = hrActionSchema(
	applyApprovedCompensationResultInputSchema,
);
const getCompensationReviewActionSchema = hrActionSchema(
	getCompensationReviewInputSchema,
);
const listCompensationReviewsByEmployeeActionSchema = hrActionSchema(
	listCompensationReviewsByEmployeeInputSchema,
);

const COMPENSATION_MANAGE = "human-resources.compensation.manage" as const;
const COMPENSATION_READ = "human-resources.compensation.read" as const;

export async function createCompensationReviewCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: CompensationReviewCycle }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycle,
		{ cycle: CompensationReviewCycle }
	>({
		path: "createCompensationReviewCycleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create compensation review cycle.",
		validationMessage: "Enter a valid compensation review cycle.",
		actionSchema: createCompensationReviewCycleActionSchema,
		input,
		invoke: invokeHrPackage(createCompensationReviewCycle),
		mapData: (cycle) => ({ cycle }),
	});
}

export async function openCompensationReviewCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: CompensationReviewCycle }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycle,
		{ cycle: CompensationReviewCycle }
	>({
		path: "openCompensationReviewCycleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not open compensation review cycle.",
		validationMessage: "Enter a valid cycle open request.",
		actionSchema: openCompensationReviewCycleActionSchema,
		input,
		invoke: invokeHrPackage(openCompensationReviewCycle),
		mapData: (cycle) => ({ cycle }),
	});
}

export async function closeCompensationReviewCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: CompensationReviewCycle }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycle,
		{ cycle: CompensationReviewCycle }
	>({
		path: "closeCompensationReviewCycleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not close compensation review cycle.",
		validationMessage: "Enter a valid cycle close request.",
		actionSchema: closeCompensationReviewCycleActionSchema,
		input,
		invoke: invokeHrPackage(closeCompensationReviewCycle),
		mapData: (cycle) => ({ cycle }),
	});
}

export async function cancelCompensationReviewCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: CompensationReviewCycle }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycle,
		{ cycle: CompensationReviewCycle }
	>({
		path: "cancelCompensationReviewCycleAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not cancel compensation review cycle.",
		validationMessage: "Enter a valid cycle cancel request.",
		actionSchema: cancelCompensationReviewCycleActionSchema,
		input,
		invoke: invokeHrPackage(cancelCompensationReviewCycle),
		mapData: (cycle) => ({ cycle }),
	});
}

export async function getCompensationReviewCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: CompensationReviewCycle | null }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycle | null,
		{ cycle: CompensationReviewCycle | null }
	>({
		path: "getCompensationReviewCycleAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get compensation review cycle.",
		validationMessage: "Enter a valid cycle lookup.",
		actionSchema: getCompensationReviewCycleActionSchema,
		input,
		invoke: invokeHrPackage(getCompensationReviewCycle),
		mapData: (cycle) => ({ cycle }),
	});
}

export async function listCompensationReviewCyclesAction(
	input: unknown,
): Promise<ActionResult<{ page: CompensationReviewCycleListPage }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewCycleListPage,
		{ page: CompensationReviewCycleListPage }
	>({
		path: "listCompensationReviewCyclesAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list compensation review cycles.",
		validationMessage: "Enter valid cycle list filters.",
		actionSchema: listCompensationReviewCyclesActionSchema,
		input,
		invoke: invokeHrPackage(listCompensationReviewCycles),
		mapData: (page) => ({ page }),
	});
}

export async function createCompensationReviewDraftAction(
	input: unknown,
): Promise<ActionResult<{ review: CompensationReview }>> {
	return await runHrHumanResourcesAction<
		CompensationReview,
		{ review: CompensationReview }
	>({
		path: "createCompensationReviewDraftAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not create compensation review draft.",
		validationMessage: "Enter a valid compensation review draft.",
		actionSchema: createCompensationReviewDraftActionSchema,
		input,
		invoke: invokeHrPackage(createCompensationReviewDraft),
		mapData: (review) => ({ review }),
	});
}

export async function recordCompensationRecommendationAction(
	input: unknown,
): Promise<ActionResult<{ review: CompensationReview }>> {
	return await runHrHumanResourcesAction<
		CompensationReview,
		{ review: CompensationReview }
	>({
		path: "recordCompensationRecommendationAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not record compensation recommendation.",
		validationMessage: "Enter a valid compensation recommendation.",
		actionSchema: recordCompensationRecommendationActionSchema,
		input,
		invoke: invokeHrPackage(recordCompensationRecommendation),
		mapData: (review) => ({ review }),
	});
}

export async function finalizeCompensationReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: CompensationReview }>> {
	return await runHrHumanResourcesAction<
		CompensationReview,
		{ review: CompensationReview }
	>({
		path: "finalizeCompensationReviewAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not finalize compensation review.",
		validationMessage: "Enter a valid review finalize request.",
		actionSchema: finalizeCompensationReviewActionSchema,
		input,
		invoke: invokeHrPackage(finalizeCompensationReview),
		mapData: (review) => ({ review }),
	});
}

export async function applyApprovedCompensationResultAction(
	input: unknown,
): Promise<ActionResult<{ compensation: EmployeeCompensation }>> {
	return await runHrHumanResourcesAction<
		EmployeeCompensation,
		{ compensation: EmployeeCompensation }
	>({
		path: "applyApprovedCompensationResultAction",
		permission: COMPENSATION_MANAGE,
		safeMessage: "Could not apply approved compensation result.",
		validationMessage: "Enter a valid apply compensation result request.",
		actionSchema: applyApprovedCompensationResultActionSchema,
		input,
		invoke: invokeHrPackage(applyApprovedCompensationResult),
		mapData: (compensation) => ({ compensation }),
	});
}

export async function getCompensationReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: CompensationReview | null }>> {
	return await runHrHumanResourcesAction<
		CompensationReview | null,
		{ review: CompensationReview | null }
	>({
		path: "getCompensationReviewAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not get compensation review.",
		validationMessage: "Enter a valid review lookup.",
		actionSchema: getCompensationReviewActionSchema,
		input,
		invoke: invokeHrPackage(getCompensationReview),
		mapData: (review) => ({ review }),
	});
}

export async function listCompensationReviewsByEmployeeAction(
	input: unknown,
): Promise<ActionResult<{ page: CompensationReviewListPage }>> {
	return await runHrHumanResourcesAction<
		CompensationReviewListPage,
		{ page: CompensationReviewListPage }
	>({
		path: "listCompensationReviewsByEmployeeAction",
		permission: COMPENSATION_READ,
		safeMessage: "Could not list compensation reviews.",
		validationMessage: "Enter valid review list filters.",
		actionSchema: listCompensationReviewsByEmployeeActionSchema,
		input,
		invoke: invokeHrPackage(listCompensationReviewsByEmployee),
		mapData: (page) => ({ page }),
	});
}
