"use server";

import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import type {
	EmployeePerformanceHistory,
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceGoalProgress,
	PerformanceGoalProgressListPage,
	PerformanceImprovementCheckpoint,
	PerformanceImprovementCheckpointListPage,
	PerformanceImprovementPlan,
	PerformanceImprovementPlanListPage,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
} from "@afenda/human-resources";
import {
	acknowledgeImprovementPlan,
	acknowledgePerformanceReview,
	acknowledgePerformanceReviewInputSchema,
	activatePerformanceGoal,
	addCycleParticipant,
	addCycleParticipantInputSchema,
	alignPerformanceGoal,
	alignPerformanceGoalInputSchema,
	amendImprovementPlan,
	amendImprovementPlanInputSchema,
	approvePerformanceGoal,
	calibratePerformanceReview,
	calibratePerformanceReviewInputSchema,
	cancelImprovementPlan,
	cancelPerformanceCycle,
	cancelPerformanceGoal,
	closeImprovementPlanUnsuccessful,
	closeImprovementPlanUnsuccessfulInputSchema,
	closePerformanceCycle,
	closePerformanceGoal,
	closePerformanceGoalInputSchema,
	completeImprovementPlan,
	completeImprovementPlanInputSchema,
	createImprovementPlan,
	createImprovementPlanInputSchema,
	createPerformanceCycle,
	createPerformanceCycleInputSchema,
	createPerformanceGoal,
	createPerformanceGoalInputSchema,
	enrollEligibleCycleParticipants,
	enrollEligibleCycleParticipantsInputSchema,
	finalizePerformanceReview,
	finalizePerformanceReviewInputSchema,
	getEmployeePerformanceHistory,
	getEmployeePerformanceHistoryInputSchema,
	getImprovementPlanById,
	getImprovementPlanByIdInputSchema,
	getPerformanceCycleById,
	getPerformanceCycleByIdInputSchema,
	getPerformanceCycleEligibility,
	getPerformanceCycleEligibilityInputSchema,
	getPerformanceGoalById,
	getPerformanceGoalByIdInputSchema,
	getPerformanceReviewById,
	getPerformanceReviewByIdInputSchema,
	improvementPlanStatusTransitionInputSchema,
	listActiveImprovementPlans,
	listActiveImprovementPlansInputSchema,
	listCycleParticipants,
	listCycleParticipantsInputSchema,
	listEmployeeGoals,
	listEmployeeGoalsInputSchema,
	listEmployeePerformanceReviews,
	listEmployeePerformanceReviewsInputSchema,
	listGoalProgress,
	listGoalProgressInputSchema,
	listImprovementPlanCheckpoints,
	listImprovementPlanCheckpointsInputSchema,
	listPerformanceCycleReviewPeriods,
	listPerformanceCycleReviewPeriodsInputSchema,
	listPerformanceCycles,
	listPerformanceCyclesInputSchema,
	listReviewsPendingManagerAction,
	listReviewsPendingManagerActionInputSchema,
	openImprovementPlan,
	openPerformanceCycle,
	performanceCycleStatusTransitionInputSchema,
	performanceGoalStatusTransitionInputSchema,
	performanceReviewStatusTransitionInputSchema,
	publishPerformanceCycle,
	recordGoalProgress,
	recordGoalProgressInputSchema,
	recordImprovementCheckpoint,
	recordImprovementCheckpointInputSchema,
	rejectPerformanceGoal,
	removeCycleParticipant,
	removeCycleParticipantInputSchema,
	reopenPerformanceReview,
	reopenPerformanceReviewInputSchema,
	returnPerformanceReviewForCorrection,
	setPerformanceCycleEligibility,
	setPerformanceCycleEligibilityInputSchema,
	setPerformanceCycleReviewPeriods,
	setPerformanceCycleReviewPeriodsInputSchema,
	startPerformanceReview,
	startPerformanceReviewInputSchema,
	submitManagerAssessment,
	submitManagerAssessmentInputSchema,
	submitPerformanceGoal,
	submitSelfAssessment,
	submitSelfAssessmentInputSchema,
	updatePerformanceCycle,
	updatePerformanceCycleInputSchema,
	updatePerformanceGoal,
	updatePerformanceGoalInputSchema,
} from "@afenda/human-resources";

import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrTalentOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import type { ProductPermissionCode } from "@/modules/identity/domain/session-permission";

import { parseSchema } from "@/modules/platform/schemas/common";

const createPerformanceCycleActionSchema = hrActionSchema(
	createPerformanceCycleInputSchema,
);
const updatePerformanceCycleActionSchema = hrActionSchema(
	updatePerformanceCycleInputSchema,
);
const publishPerformanceCycleActionSchema = hrActionSchema(
	performanceCycleStatusTransitionInputSchema,
);
const openPerformanceCycleActionSchema = hrActionSchema(
	performanceCycleStatusTransitionInputSchema,
);
const closePerformanceCycleActionSchema = hrActionSchema(
	performanceCycleStatusTransitionInputSchema,
);
const cancelPerformanceCycleActionSchema = hrActionSchema(
	performanceCycleStatusTransitionInputSchema,
);
const setPerformanceCycleReviewPeriodsActionSchema = hrActionSchema(
	setPerformanceCycleReviewPeriodsInputSchema,
);
const listPerformanceCycleReviewPeriodsActionSchema = hrActionSchema(
	listPerformanceCycleReviewPeriodsInputSchema,
);
const setPerformanceCycleEligibilityActionSchema = hrActionSchema(
	setPerformanceCycleEligibilityInputSchema,
);
const getPerformanceCycleEligibilityActionSchema = hrActionSchema(
	getPerformanceCycleEligibilityInputSchema,
);
const enrollEligibleCycleParticipantsActionSchema = hrActionSchema(
	enrollEligibleCycleParticipantsInputSchema,
);
const addCycleParticipantActionSchema = hrActionSchema(
	addCycleParticipantInputSchema,
);
const removeCycleParticipantActionSchema = hrActionSchema(
	removeCycleParticipantInputSchema,
);
const getPerformanceCycleByIdActionSchema = hrActionSchema(
	getPerformanceCycleByIdInputSchema,
);
const listPerformanceCyclesActionSchema = hrActionSchema(
	listPerformanceCyclesInputSchema,
);
const listCycleParticipantsActionSchema = hrActionSchema(
	listCycleParticipantsInputSchema,
);
const createPerformanceGoalActionSchema = hrActionSchema(
	createPerformanceGoalInputSchema,
);
const updatePerformanceGoalActionSchema = hrActionSchema(
	updatePerformanceGoalInputSchema,
);
const performanceGoalStatusTransitionActionSchema = hrActionSchema(
	performanceGoalStatusTransitionInputSchema,
);
const closePerformanceGoalActionSchema = hrActionSchema(
	closePerformanceGoalInputSchema,
);
const alignPerformanceGoalActionSchema = hrActionSchema(
	alignPerformanceGoalInputSchema,
);
const recordGoalProgressActionSchema = hrActionSchema(
	recordGoalProgressInputSchema,
);
const listGoalProgressActionSchema = hrActionSchema(
	listGoalProgressInputSchema,
);
const getPerformanceGoalByIdActionSchema = hrActionSchema(
	getPerformanceGoalByIdInputSchema,
);
const listEmployeeGoalsActionSchema = hrActionSchema(
	listEmployeeGoalsInputSchema,
);
const startPerformanceReviewActionSchema = hrActionSchema(
	startPerformanceReviewInputSchema,
);
const submitSelfAssessmentActionSchema = hrActionSchema(
	submitSelfAssessmentInputSchema,
);
const submitManagerAssessmentActionSchema = hrActionSchema(
	submitManagerAssessmentInputSchema,
);
const performanceReviewStatusTransitionActionSchema = hrActionSchema(
	performanceReviewStatusTransitionInputSchema,
);
const acknowledgePerformanceReviewActionSchema = hrActionSchema(
	acknowledgePerformanceReviewInputSchema,
);
const finalizePerformanceReviewActionSchema = hrActionSchema(
	finalizePerformanceReviewInputSchema,
);
const reopenPerformanceReviewActionSchema = hrActionSchema(
	reopenPerformanceReviewInputSchema,
);
const calibratePerformanceReviewActionSchema = hrActionSchema(
	calibratePerformanceReviewInputSchema,
);
const getPerformanceReviewByIdActionSchema = hrActionSchema(
	getPerformanceReviewByIdInputSchema,
);
const listEmployeePerformanceReviewsActionSchema = hrActionSchema(
	listEmployeePerformanceReviewsInputSchema,
);
const listReviewsPendingManagerActionActionSchema = hrActionSchema(
	listReviewsPendingManagerActionInputSchema,
);
const createImprovementPlanActionSchema = hrActionSchema(
	createImprovementPlanInputSchema,
);
const improvementPlanStatusTransitionActionSchema = hrActionSchema(
	improvementPlanStatusTransitionInputSchema,
);
const completeImprovementPlanActionSchema = hrActionSchema(
	completeImprovementPlanInputSchema,
);
const closeImprovementPlanUnsuccessfulActionSchema = hrActionSchema(
	closeImprovementPlanUnsuccessfulInputSchema,
);
const recordImprovementCheckpointActionSchema = hrActionSchema(
	recordImprovementCheckpointInputSchema,
);
const amendImprovementPlanActionSchema = hrActionSchema(
	amendImprovementPlanInputSchema,
);
const listImprovementPlanCheckpointsActionSchema = hrActionSchema(
	listImprovementPlanCheckpointsInputSchema,
);
const getImprovementPlanByIdActionSchema = hrActionSchema(
	getImprovementPlanByIdInputSchema,
);
const listActiveImprovementPlansActionSchema = hrActionSchema(
	listActiveImprovementPlansInputSchema,
);
const getEmployeePerformanceHistoryActionSchema = hrActionSchema(
	getEmployeePerformanceHistoryInputSchema,
);

type PerformanceActionData<Key extends string, Value> = {
	[Property in Key]: Value;
};

async function runPerformanceAction<Key extends string, Value>(config: {
	input: unknown;
	schema: Parameters<typeof parseSchema>[0];
	path: string;
	permission: ProductPermissionCode;
	safeMessage: string;
	validationMessage: string;
	dataKey: Key;
	execute: (input: never) => Promise<Result<Value>>;
}): Promise<ActionResult<PerformanceActionData<Key, Value>>> {
	return await runOperatorPermissionAction({
		path: config.path,
		permission: config.permission,
		safeMessage: config.safeMessage,
		execute: async (session, correlationId) => {
			const parsed = parseSchema(config.schema, config.input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			const result = await config.execute(
				withSessionContext(
					session,
					correlationId,
					parsed.data as Record<string, unknown>,
				) as never,
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: { [config.dataKey]: mapped.data } as PerformanceActionData<
					Key,
					Value
				>,
			};
		},
	});
}

export async function createPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runOperatorPermissionAction({
		path: "createPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not create performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPerformanceCycleActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid performance cycle.",
				});
			}
			const result = await createPerformanceCycle(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function openPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runOperatorPermissionAction({
		path: "openPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not open performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(openPerformanceCycleActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid cycle open request.",
				});
			}
			const result = await openPerformanceCycle(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function getPerformanceCycleByIdAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle | null }>> {
	return await runOperatorPermissionAction({
		path: "getPerformanceCycleByIdAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not get performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPerformanceCycleByIdActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid cycle lookup.",
				});
			}
			const result = await getPerformanceCycleById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function listPerformanceCyclesAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceCycleListPage }>> {
	return await runOperatorPermissionAction({
		path: "listPerformanceCyclesAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not list performance cycles.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listPerformanceCyclesActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid cycle list filters.",
				});
			}
			const result = await listPerformanceCycles(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function createPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runOperatorPermissionAction({
		path: "createPerformanceGoalAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not create performance goal.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPerformanceGoalActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid performance goal.",
				});
			}
			const result = await createPerformanceGoal(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { goal: mapped.data } };
		},
	});
}

export async function listEmployeeGoalsAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceGoalListPage }>> {
	return await runOperatorPermissionAction({
		path: "listEmployeeGoalsAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not list employee goals.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listEmployeeGoalsActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid goal list filters.",
				});
			}
			const result = await listEmployeeGoals(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function startPerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runOperatorPermissionAction({
		path: "startPerformanceReviewAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not start performance review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startPerformanceReviewActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid review start request.",
				});
			}
			const result = await startPerformanceReview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { review: mapped.data } };
		},
	});
}

export async function getPerformanceReviewByIdAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReviewDetail | null }>> {
	return await runOperatorPermissionAction({
		path: "getPerformanceReviewByIdAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not get performance review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPerformanceReviewByIdActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid review lookup.",
				});
			}
			const result = await getPerformanceReviewById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { review: mapped.data } };
		},
	});
}

export async function listEmployeePerformanceReviewsAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceReviewListPage }>> {
	return await runOperatorPermissionAction({
		path: "listEmployeePerformanceReviewsAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not list employee performance reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listEmployeePerformanceReviewsActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid review list filters.",
				});
			}
			const result = await listEmployeePerformanceReviews(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function listReviewsPendingManagerActionAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceReviewListPage }>> {
	return await runOperatorPermissionAction({
		path: "listReviewsPendingManagerActionAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not list pending manager reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listReviewsPendingManagerActionActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid pending review filters.",
				});
			}
			const result = await listReviewsPendingManagerAction(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function getEmployeePerformanceHistoryAction(
	input: unknown,
): Promise<ActionResult<{ history: EmployeePerformanceHistory }>> {
	return await runOperatorPermissionAction({
		path: "getEmployeePerformanceHistoryAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not get employee performance history.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getEmployeePerformanceHistoryActionSchema,
				input,
			);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid performance history request.",
				});
			}
			const result = await getEmployeePerformanceHistory(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { history: mapped.data } };
		},
	});
}

export async function createImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runOperatorPermissionAction({
		path: "createImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not create improvement plan.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createImprovementPlanActionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid improvement plan.",
				});
			}
			const result = await createImprovementPlan(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { plan: mapped.data } };
		},
	});
}

export async function updatePerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runPerformanceAction({
		input,
		schema: updatePerformanceCycleActionSchema,
		path: "updatePerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not update performance cycle.",
		validationMessage: "Enter a valid performance cycle update.",
		dataKey: "cycle",
		execute: (data) =>
			updatePerformanceCycle(data, createHumanResourcesCommandOptions()),
	});
}

export async function publishPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runPerformanceAction({
		input,
		schema: publishPerformanceCycleActionSchema,
		path: "publishPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not publish performance cycle.",
		validationMessage: "Enter a valid cycle publish request.",
		dataKey: "cycle",
		execute: (data) =>
			publishPerformanceCycle(data, createHumanResourcesCommandOptions()),
	});
}

export async function closePerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runPerformanceAction({
		input,
		schema: closePerformanceCycleActionSchema,
		path: "closePerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not close performance cycle.",
		validationMessage: "Enter a valid cycle close request.",
		dataKey: "cycle",
		execute: (data) =>
			closePerformanceCycle(data, createHumanResourcesCommandOptions()),
	});
}

export async function cancelPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return await runPerformanceAction({
		input,
		schema: cancelPerformanceCycleActionSchema,
		path: "cancelPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not cancel performance cycle.",
		validationMessage: "Enter a valid cycle cancellation request.",
		dataKey: "cycle",
		execute: (data) =>
			cancelPerformanceCycle(data, createHumanResourcesCommandOptions()),
	});
}

export async function setPerformanceCycleReviewPeriodsAction(
	input: unknown,
): Promise<ActionResult<{ periods: PerformanceCycleReviewPeriod[] }>> {
	return await runPerformanceAction({
		input,
		schema: setPerformanceCycleReviewPeriodsActionSchema,
		path: "setPerformanceCycleReviewPeriodsAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not set cycle review periods.",
		validationMessage: "Enter valid cycle review periods.",
		dataKey: "periods",
		execute: (data) =>
			setPerformanceCycleReviewPeriods(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function listPerformanceCycleReviewPeriodsAction(
	input: unknown,
): Promise<ActionResult<{ periods: PerformanceCycleReviewPeriod[] }>> {
	return await runPerformanceAction({
		input,
		schema: listPerformanceCycleReviewPeriodsActionSchema,
		path: "listPerformanceCycleReviewPeriodsAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not list cycle review periods.",
		validationMessage: "Enter a valid cycle review period request.",
		dataKey: "periods",
		execute: (data) =>
			listPerformanceCycleReviewPeriods(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function setPerformanceCycleEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: PerformanceCycleEligibility }>> {
	return await runPerformanceAction({
		input,
		schema: setPerformanceCycleEligibilityActionSchema,
		path: "setPerformanceCycleEligibilityAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not set cycle eligibility.",
		validationMessage: "Enter valid cycle eligibility.",
		dataKey: "eligibility",
		execute: (data) =>
			setPerformanceCycleEligibility(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function getPerformanceCycleEligibilityAction(
	input: unknown,
): Promise<ActionResult<{ eligibility: PerformanceCycleEligibility | null }>> {
	return await runPerformanceAction({
		input,
		schema: getPerformanceCycleEligibilityActionSchema,
		path: "getPerformanceCycleEligibilityAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not get cycle eligibility.",
		validationMessage: "Enter a valid cycle eligibility request.",
		dataKey: "eligibility",
		execute: (data) =>
			getPerformanceCycleEligibility(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function enrollEligibleCycleParticipantsAction(
	input: unknown,
): Promise<ActionResult<{ participants: PerformanceCycleParticipant[] }>> {
	return await runPerformanceAction({
		input,
		schema: enrollEligibleCycleParticipantsActionSchema,
		path: "enrollEligibleCycleParticipantsAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not enroll eligible cycle participants.",
		validationMessage: "Enter a valid cycle enrolment request.",
		dataKey: "participants",
		execute: (data) =>
			enrollEligibleCycleParticipants(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function addCycleParticipantAction(
	input: unknown,
): Promise<ActionResult<{ participant: PerformanceCycleParticipant }>> {
	return await runPerformanceAction({
		input,
		schema: addCycleParticipantActionSchema,
		path: "addCycleParticipantAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not add cycle participant.",
		validationMessage: "Enter a valid cycle participant.",
		dataKey: "participant",
		execute: (data) =>
			addCycleParticipant(data, createHumanResourcesCommandOptions()),
	});
}

export async function removeCycleParticipantAction(
	input: unknown,
): Promise<ActionResult<{ participant: PerformanceCycleParticipant }>> {
	return await runPerformanceAction({
		input,
		schema: removeCycleParticipantActionSchema,
		path: "removeCycleParticipantAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not remove cycle participant.",
		validationMessage: "Enter a valid cycle participant removal.",
		dataKey: "participant",
		execute: (data) =>
			removeCycleParticipant(data, createHumanResourcesCommandOptions()),
	});
}

export async function listCycleParticipantsAction(
	input: unknown,
): Promise<ActionResult<{ participants: PerformanceCycleParticipant[] }>> {
	return await runPerformanceAction({
		input,
		schema: listCycleParticipantsActionSchema,
		path: "listCycleParticipantsAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not list cycle participants.",
		validationMessage: "Enter valid cycle participant filters.",
		dataKey: "participants",
		execute: (data) =>
			listCycleParticipants(data, createHumanResourcesCommandOptions()),
	});
}

export async function updatePerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: updatePerformanceGoalActionSchema,
		path: "updatePerformanceGoalAction",
		permission: "human-resources.performance.goal.own.manage",
		safeMessage: "Could not update performance goal.",
		validationMessage: "Enter a valid performance goal update.",
		dataKey: "goal",
		execute: (data) =>
			updatePerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function submitPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: performanceGoalStatusTransitionActionSchema,
		path: "submitPerformanceGoalAction",
		permission: "human-resources.performance.goal.own.manage",
		safeMessage: "Could not submit performance goal.",
		validationMessage: "Enter a valid goal submit request.",
		dataKey: "goal",
		execute: (data) =>
			submitPerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function approvePerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: performanceGoalStatusTransitionActionSchema,
		path: "approvePerformanceGoalAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not approve performance goal.",
		validationMessage: "Enter a valid goal approval request.",
		dataKey: "goal",
		execute: (data) =>
			approvePerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function rejectPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: performanceGoalStatusTransitionActionSchema,
		path: "rejectPerformanceGoalAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not reject performance goal.",
		validationMessage: "Enter a valid goal rejection request.",
		dataKey: "goal",
		execute: (data) =>
			rejectPerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function recordGoalProgressAction(
	input: unknown,
): Promise<ActionResult<{ progress: PerformanceGoalProgress }>> {
	return await runPerformanceAction({
		input,
		schema: recordGoalProgressActionSchema,
		path: "recordGoalProgressAction",
		permission: "human-resources.performance.goal.own.manage",
		safeMessage: "Could not record goal progress.",
		validationMessage: "Enter valid goal progress.",
		dataKey: "progress",
		execute: (data) =>
			recordGoalProgress(data, createHumanResourcesCommandOptions()),
	});
}

export async function activatePerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: performanceGoalStatusTransitionActionSchema,
		path: "activatePerformanceGoalAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not activate performance goal.",
		validationMessage: "Enter a valid goal activation request.",
		dataKey: "goal",
		execute: (data) =>
			activatePerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function alignPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: alignPerformanceGoalActionSchema,
		path: "alignPerformanceGoalAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not align performance goal.",
		validationMessage: "Enter a valid goal alignment request.",
		dataKey: "goal",
		execute: (data) =>
			alignPerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function closePerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: closePerformanceGoalActionSchema,
		path: "closePerformanceGoalAction",
		permission: "human-resources.performance.goal.own.manage",
		safeMessage: "Could not close performance goal.",
		validationMessage: "Enter a valid goal closure request.",
		dataKey: "goal",
		execute: (data) =>
			closePerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function cancelPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return await runPerformanceAction({
		input,
		schema: performanceGoalStatusTransitionActionSchema,
		path: "cancelPerformanceGoalAction",
		permission: "human-resources.performance.goal.own.manage",
		safeMessage: "Could not cancel performance goal.",
		validationMessage: "Enter a valid goal cancellation request.",
		dataKey: "goal",
		execute: (data) =>
			cancelPerformanceGoal(data, createHumanResourcesCommandOptions()),
	});
}

export async function getPerformanceGoalByIdAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal | null }>> {
	return await runPerformanceAction({
		input,
		schema: getPerformanceGoalByIdActionSchema,
		path: "getPerformanceGoalByIdAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not get performance goal.",
		validationMessage: "Enter a valid goal lookup.",
		dataKey: "goal",
		execute: (data) =>
			getPerformanceGoalById(data, createHumanResourcesCommandOptions()),
	});
}

export async function listGoalProgressAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceGoalProgressListPage }>> {
	return await runPerformanceAction({
		input,
		schema: listGoalProgressActionSchema,
		path: "listGoalProgressAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not list goal progress.",
		validationMessage: "Enter valid goal progress filters.",
		dataKey: "page",
		execute: (data) =>
			listGoalProgress(data, createHumanResourcesCommandOptions()),
	});
}

export async function submitSelfAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: submitSelfAssessmentActionSchema,
		path: "submitSelfAssessmentAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not submit self assessment.",
		validationMessage: "Enter a valid self assessment.",
		dataKey: "review",
		execute: (data) =>
			submitSelfAssessment(data, createHumanResourcesCommandOptions()),
	});
}

export async function submitManagerAssessmentAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: submitManagerAssessmentActionSchema,
		path: "submitManagerAssessmentAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not submit manager assessment.",
		validationMessage: "Enter a valid manager assessment.",
		dataKey: "review",
		execute: (data) =>
			submitManagerAssessment(data, createHumanResourcesCommandOptions()),
	});
}

export async function returnPerformanceReviewForCorrectionAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: performanceReviewStatusTransitionActionSchema,
		path: "returnPerformanceReviewForCorrectionAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not return performance review for correction.",
		validationMessage: "Enter a valid review correction request.",
		dataKey: "review",
		execute: (data) =>
			returnPerformanceReviewForCorrection(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function acknowledgePerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: acknowledgePerformanceReviewActionSchema,
		path: "acknowledgePerformanceReviewAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not acknowledge performance review.",
		validationMessage: "Enter a valid review acknowledgement.",
		dataKey: "review",
		execute: (data) =>
			acknowledgePerformanceReview(data, createHumanResourcesCommandOptions()),
	});
}

export async function finalizePerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: finalizePerformanceReviewActionSchema,
		path: "finalizePerformanceReviewAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not finalize performance review.",
		validationMessage: "Enter a valid review finalization.",
		dataKey: "review",
		execute: (data) =>
			finalizePerformanceReview(data, createHumanResourcesCommandOptions()),
	});
}

export async function reopenPerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: reopenPerformanceReviewActionSchema,
		path: "reopenPerformanceReviewAction",
		permission: "human-resources.performance.review.reopen",
		safeMessage: "Could not reopen performance review.",
		validationMessage: "Enter a valid review reopen request.",
		dataKey: "review",
		execute: (data) =>
			reopenPerformanceReview(data, createHumanResourcesCommandOptions()),
	});
}

export async function calibratePerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return await runPerformanceAction({
		input,
		schema: calibratePerformanceReviewActionSchema,
		path: "calibratePerformanceReviewAction",
		permission: "human-resources.performance.confidential.read",
		safeMessage: "Could not calibrate performance review.",
		validationMessage: "Enter a valid review calibration.",
		dataKey: "review",
		execute: (data) =>
			calibratePerformanceReview(data, createHumanResourcesCommandOptions()),
	});
}

export async function openImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: improvementPlanStatusTransitionActionSchema,
		path: "openImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not open improvement plan.",
		validationMessage: "Enter a valid improvement plan open request.",
		dataKey: "plan",
		execute: (data) =>
			openImprovementPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function acknowledgeImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: improvementPlanStatusTransitionActionSchema,
		path: "acknowledgeImprovementPlanAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not acknowledge improvement plan.",
		validationMessage: "Enter a valid improvement plan acknowledgement.",
		dataKey: "plan",
		execute: (data) =>
			acknowledgeImprovementPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function recordImprovementCheckpointAction(
	input: unknown,
): Promise<ActionResult<{ checkpoint: PerformanceImprovementCheckpoint }>> {
	return await runPerformanceAction({
		input,
		schema: recordImprovementCheckpointActionSchema,
		path: "recordImprovementCheckpointAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not record improvement checkpoint.",
		validationMessage: "Enter a valid improvement checkpoint.",
		dataKey: "checkpoint",
		execute: (data) =>
			recordImprovementCheckpoint(data, createHumanResourcesCommandOptions()),
	});
}

export async function amendImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: amendImprovementPlanActionSchema,
		path: "amendImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not amend improvement plan.",
		validationMessage: "Enter a valid improvement plan amendment.",
		dataKey: "plan",
		execute: (data) =>
			amendImprovementPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function completeImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: completeImprovementPlanActionSchema,
		path: "completeImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not complete improvement plan.",
		validationMessage: "Enter a valid improvement plan completion.",
		dataKey: "plan",
		execute: (data) =>
			completeImprovementPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function closeImprovementPlanUnsuccessfulAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: closeImprovementPlanUnsuccessfulActionSchema,
		path: "closeImprovementPlanUnsuccessfulAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not close unsuccessful improvement plan.",
		validationMessage: "Enter a valid improvement plan closure.",
		dataKey: "plan",
		execute: (data) =>
			closeImprovementPlanUnsuccessful(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}

export async function cancelImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return await runPerformanceAction({
		input,
		schema: improvementPlanStatusTransitionActionSchema,
		path: "cancelImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not cancel improvement plan.",
		validationMessage: "Enter a valid improvement plan cancellation.",
		dataKey: "plan",
		execute: (data) =>
			cancelImprovementPlan(data, createHumanResourcesCommandOptions()),
	});
}

export async function getImprovementPlanByIdAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan | null }>> {
	return await runPerformanceAction({
		input,
		schema: getImprovementPlanByIdActionSchema,
		path: "getImprovementPlanByIdAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not get improvement plan.",
		validationMessage: "Enter a valid improvement plan lookup.",
		dataKey: "plan",
		execute: (data) =>
			getImprovementPlanById(data, createHumanResourcesCommandOptions()),
	});
}

export async function listActiveImprovementPlansAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceImprovementPlanListPage }>> {
	return await runPerformanceAction({
		input,
		schema: listActiveImprovementPlansActionSchema,
		path: "listActiveImprovementPlansAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not list active improvement plans.",
		validationMessage: "Enter valid improvement plan filters.",
		dataKey: "page",
		execute: (data) =>
			listActiveImprovementPlans(data, createHumanResourcesCommandOptions()),
	});
}

export async function listImprovementPlanCheckpointsAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceImprovementCheckpointListPage }>> {
	return await runPerformanceAction({
		input,
		schema: listImprovementPlanCheckpointsActionSchema,
		path: "listImprovementPlanCheckpointsAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not list improvement plan checkpoints.",
		validationMessage: "Enter valid improvement checkpoint filters.",
		dataKey: "page",
		execute: (data) =>
			listImprovementPlanCheckpoints(
				data,
				createHumanResourcesCommandOptions(),
			),
	});
}
