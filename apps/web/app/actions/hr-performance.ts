"use server";

import {
	createImprovementPlan,
	createPerformanceCycle,
	createPerformanceGoal,
	getPerformanceCycleById,
	getPerformanceReviewById,
	listEmployeeGoals,
	listEmployeePerformanceReviews,
	listPerformanceCycles,
	listReviewsPendingManagerAction,
	openPerformanceCycle,
	startPerformanceReview,
} from "@afenda/human-resources";
import type {
	PerformanceCycle,
	PerformanceCycleListPage,
	PerformanceGoal,
	PerformanceGoalListPage,
	PerformanceImprovementPlan,
	PerformanceReview,
	PerformanceReviewDetail,
	PerformanceReviewListPage,
} from "@afenda/human-resources";
import {
	createImprovementPlanInputSchema,
	createPerformanceCycleInputSchema,
	createPerformanceGoalInputSchema,
	getPerformanceCycleByIdInputSchema,
	getPerformanceReviewByIdInputSchema,
	listEmployeeGoalsInputSchema,
	listEmployeePerformanceReviewsInputSchema,
	listPerformanceCyclesInputSchema,
	listReviewsPendingManagerActionInputSchema,
	performanceCycleStatusTransitionInputSchema,
	startPerformanceReviewInputSchema,
} from "@afenda/human-resources/schemas";

import {
	hrActionSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const createPerformanceCycleActionSchema = hrActionSchema(
	createPerformanceCycleInputSchema,
);
const openPerformanceCycleActionSchema = hrActionSchema(
	performanceCycleStatusTransitionInputSchema,
);
const getPerformanceCycleByIdActionSchema = hrActionSchema(
	getPerformanceCycleByIdInputSchema,
);
const listPerformanceCyclesActionSchema = hrActionSchema(
	listPerformanceCyclesInputSchema,
);
const createPerformanceGoalActionSchema = hrActionSchema(
	createPerformanceGoalInputSchema,
);
const listEmployeeGoalsActionSchema = hrActionSchema(listEmployeeGoalsInputSchema);
const startPerformanceReviewActionSchema = hrActionSchema(
	startPerformanceReviewInputSchema,
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

export async function createPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return runOperatorPermissionAction({
		path: "createPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not create performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPerformanceCycleActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid performance cycle.",
					parsed.details,
				);
			}
			const result = await createPerformanceCycle(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function openPerformanceCycleAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle }>> {
	return runOperatorPermissionAction({
		path: "openPerformanceCycleAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not open performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(openPerformanceCycleActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid cycle open request.",
					parsed.details,
				);
			}
			const result = await openPerformanceCycle(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function getPerformanceCycleByIdAction(
	input: unknown,
): Promise<ActionResult<{ cycle: PerformanceCycle | null }>> {
	return runOperatorPermissionAction({
		path: "getPerformanceCycleByIdAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not get performance cycle.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPerformanceCycleByIdActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid cycle lookup.",
					parsed.details,
				);
			}
			const result = await getPerformanceCycleById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { cycle: mapped.data } };
		},
	});
}

export async function listPerformanceCyclesAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceCycleListPage }>> {
	return runOperatorPermissionAction({
		path: "listPerformanceCyclesAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not list performance cycles.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listPerformanceCyclesActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid cycle list filters.",
					parsed.details,
				);
			}
			const result = await listPerformanceCycles(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function createPerformanceGoalAction(
	input: unknown,
): Promise<ActionResult<{ goal: PerformanceGoal }>> {
	return runOperatorPermissionAction({
		path: "createPerformanceGoalAction",
		permission: "human-resources.performance.manage",
		safeMessage: "Could not create performance goal.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPerformanceGoalActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid performance goal.",
					parsed.details,
				);
			}
			const result = await createPerformanceGoal(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { goal: mapped.data } };
		},
	});
}

export async function listEmployeeGoalsAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceGoalListPage }>> {
	return runOperatorPermissionAction({
		path: "listEmployeeGoalsAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not list employee goals.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listEmployeeGoalsActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid goal list filters.",
					parsed.details,
				);
			}
			const result = await listEmployeeGoals(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function startPerformanceReviewAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReview }>> {
	return runOperatorPermissionAction({
		path: "startPerformanceReviewAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not start performance review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startPerformanceReviewActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid review start request.",
					parsed.details,
				);
			}
			const result = await startPerformanceReview(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { review: mapped.data } };
		},
	});
}

export async function getPerformanceReviewByIdAction(
	input: unknown,
): Promise<ActionResult<{ review: PerformanceReviewDetail | null }>> {
	return runOperatorPermissionAction({
		path: "getPerformanceReviewByIdAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not get performance review.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPerformanceReviewByIdActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid review lookup.",
					parsed.details,
				);
			}
			const result = await getPerformanceReviewById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { review: mapped.data } };
		},
	});
}

export async function listEmployeePerformanceReviewsAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceReviewListPage }>> {
	return runOperatorPermissionAction({
		path: "listEmployeePerformanceReviewsAction",
		permission: "human-resources.performance.own.read",
		safeMessage: "Could not list employee performance reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listEmployeePerformanceReviewsActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid review list filters.",
					parsed.details,
				);
			}
			const result = await listEmployeePerformanceReviews(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function listReviewsPendingManagerActionAction(
	input: unknown,
): Promise<ActionResult<{ page: PerformanceReviewListPage }>> {
	return runOperatorPermissionAction({
		path: "listReviewsPendingManagerActionAction",
		permission: "human-resources.performance.manager.manage",
		safeMessage: "Could not list pending manager reviews.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				listReviewsPendingManagerActionActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid pending review filters.",
					parsed.details,
				);
			}
			const result = await listReviewsPendingManagerAction(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function createImprovementPlanAction(
	input: unknown,
): Promise<ActionResult<{ plan: PerformanceImprovementPlan }>> {
	return runOperatorPermissionAction({
		path: "createImprovementPlanAction",
		permission: "human-resources.performance.improvement-plan.manage",
		safeMessage: "Could not create improvement plan.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createImprovementPlanActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid improvement plan.",
					parsed.details,
				);
			}
			const result = await createImprovementPlan(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { plan: mapped.data } };
		},
	});
}
