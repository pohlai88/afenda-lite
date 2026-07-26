"use server";

import type {
	OnboardingAccessHandoff,
	OnboardingCase,
	OnboardingEquipmentHandoff,
	OnboardingOrientation,
	OnboardingTask,
} from "@afenda/human-resources";
import {
	completeOnboarding,
	completeOnboardingTask,
	getOnboardingAccessHandoffByCase,
	getOnboardingCase,
	getOnboardingEquipmentHandoffByCase,
	getOnboardingOrientationByCase,
	listOnboardingTasks,
	recordOnboardingAccessHandoff,
	recordOnboardingEquipmentHandoff,
	recordOnboardingOrientation,
	startOnboarding,
} from "@afenda/human-resources";
import {
	completeOnboardingInputSchema,
	completeOnboardingTaskInputSchema,
	getOnboardingAccessHandoffByCaseInputSchema,
	getOnboardingCaseInputSchema,
	getOnboardingEquipmentHandoffByCaseInputSchema,
	getOnboardingOrientationByCaseInputSchema,
	listOnboardingTasksInputSchema,
	recordOnboardingAccessHandoffInputSchema,
	recordOnboardingEquipmentHandoffInputSchema,
	recordOnboardingOrientationInputSchema,
	startOnboardingInputSchema,
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

const startOnboardingActionSchema = hrActionSchema(startOnboardingInputSchema);

export async function startOnboardingAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "startOnboardingAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not start onboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(startOnboardingActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding start request.",
					parsed.details,
				);
			}
			const result = await startOnboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const completeOnboardingTaskActionSchema = hrActionSchema(
	completeOnboardingTaskInputSchema,
);

export async function completeOnboardingTaskAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "completeOnboardingTaskAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not complete onboarding task.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOnboardingTaskActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding task completion.",
					parsed.details,
				);
			}
			const result = await completeOnboardingTask(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const recordOnboardingOrientationActionSchema = hrActionSchema(
	recordOnboardingOrientationInputSchema,
);

export async function recordOnboardingOrientationAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordOnboardingOrientationAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not record onboarding orientation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				recordOnboardingOrientationActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding orientation record.",
					parsed.details,
				);
			}
			const result = await recordOnboardingOrientation(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const recordOnboardingEquipmentHandoffActionSchema = hrActionSchema(
	recordOnboardingEquipmentHandoffInputSchema,
);

export async function recordOnboardingEquipmentHandoffAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordOnboardingEquipmentHandoffAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not record onboarding equipment handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				recordOnboardingEquipmentHandoffActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding equipment handoff.",
					parsed.details,
				);
			}
			const result = await recordOnboardingEquipmentHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const recordOnboardingAccessHandoffActionSchema = hrActionSchema(
	recordOnboardingAccessHandoffInputSchema,
);

export async function recordOnboardingAccessHandoffAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "recordOnboardingAccessHandoffAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not record onboarding access handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				recordOnboardingAccessHandoffActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding access handoff.",
					parsed.details,
				);
			}
			const result = await recordOnboardingAccessHandoff(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const completeOnboardingActionSchema = hrActionSchema(
	completeOnboardingInputSchema,
);

export async function completeOnboardingAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase }>> {
	return runOperatorPermissionAction({
		path: "completeOnboardingAction",
		permission: "human-resources.onboarding.manage",
		safeMessage: "Could not complete onboarding.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(completeOnboardingActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding completion.",
					parsed.details,
				);
			}
			const result = await completeOnboarding(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const getOnboardingCaseActionSchema = hrActionSchema(
	getOnboardingCaseInputSchema,
);

export async function getOnboardingCaseAction(
	input: unknown,
): Promise<ActionResult<{ onboardingCase: OnboardingCase | null }>> {
	return runOperatorPermissionAction({
		path: "getOnboardingCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get onboarding case.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOnboardingCaseActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding case lookup.",
					parsed.details,
				);
			}
			const result = await getOnboardingCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { onboardingCase: mapped.data } };
		},
	});
}

const listOnboardingTasksActionSchema = hrActionSchema(
	listOnboardingTasksInputSchema,
);

export async function listOnboardingTasksAction(
	input: unknown,
): Promise<ActionResult<{ tasks: OnboardingTask[] }>> {
	return runOperatorPermissionAction({
		path: "listOnboardingTasksAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list onboarding tasks.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listOnboardingTasksActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding task list request.",
					parsed.details,
				);
			}
			const result = await listOnboardingTasks(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { tasks: mapped.data } };
		},
	});
}

const getOnboardingOrientationByCaseActionSchema = hrActionSchema(
	getOnboardingOrientationByCaseInputSchema,
);

export async function getOnboardingOrientationByCaseAction(
	input: unknown,
): Promise<ActionResult<{ orientation: OnboardingOrientation | null }>> {
	return runOperatorPermissionAction({
		path: "getOnboardingOrientationByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get onboarding orientation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getOnboardingOrientationByCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding orientation lookup.",
					parsed.details,
				);
			}
			const result = await getOnboardingOrientationByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { orientation: mapped.data } };
		},
	});
}

const getOnboardingEquipmentHandoffByCaseActionSchema = hrActionSchema(
	getOnboardingEquipmentHandoffByCaseInputSchema,
);

export async function getOnboardingEquipmentHandoffByCaseAction(
	input: unknown,
): Promise<
	ActionResult<{ equipmentHandoff: OnboardingEquipmentHandoff | null }>
> {
	return runOperatorPermissionAction({
		path: "getOnboardingEquipmentHandoffByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get onboarding equipment handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getOnboardingEquipmentHandoffByCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding equipment handoff lookup.",
					parsed.details,
				);
			}
			const result = await getOnboardingEquipmentHandoffByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { equipmentHandoff: mapped.data } };
		},
	});
}

const getOnboardingAccessHandoffByCaseActionSchema = hrActionSchema(
	getOnboardingAccessHandoffByCaseInputSchema,
);

export async function getOnboardingAccessHandoffByCaseAction(
	input: unknown,
): Promise<ActionResult<{ accessHandoff: OnboardingAccessHandoff | null }>> {
	return runOperatorPermissionAction({
		path: "getOnboardingAccessHandoffByCaseAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get onboarding access handoff.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				getOnboardingAccessHandoffByCaseActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid onboarding access handoff lookup.",
					parsed.details,
				);
			}
			const result = await getOnboardingAccessHandoffByCase(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { accessHandoff: mapped.data } };
		},
	});
}
