import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_QUERY_ONBOARDING_ACCESS_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET,
	HUMAN_RESOURCES_QUERY_ONBOARDING_EQUIPMENT_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_ONBOARDING_ORIENTATION_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST,
} from "../module-ids";
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
} from "../schemas/lifecycle";
import { invalidState, notFound } from "../shared/domain-guards";
import { fingerprintOnboardingStart } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import { evaluateOnboardingCompletionReadiness } from "../shared/onboarding-completion-readiness";
import type { HumanResourcesStore } from "../store";
import type {
	OnboardingAccessHandoff,
	OnboardingCase,
	OnboardingEquipmentHandoff,
	OnboardingOrientation,
	OnboardingTask,
	WorkEligibility,
} from "../types";
import {
	mergeOnboardingChecklist,
	ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS,
	ONBOARDING_TASK_CODE_WORK_ELIGIBILITY,
} from "./onboarding-checklist";

export const HUMAN_RESOURCES_AGGREGATE_ONBOARDING = "onboarding" as const;
export type HumanResourcesOnboardingAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ONBOARDING;

async function loadOnboardingCompletionContext(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		onboardingCaseId: OnboardingCase["id"];
	},
): Promise<
	Result<{
		tasks: OnboardingTask[];
		orientation: OnboardingOrientation | null;
		equipmentHandoff: OnboardingEquipmentHandoff | null;
		accessHandoff: OnboardingAccessHandoff | null;
		missingRequiredDocumentCount: number;
		activeWorkEligibility: WorkEligibility | null;
	}>
> {
	const onboardingCase = await store.getOnboardingCase({
		organizationId: input.organizationId,
		onboardingCaseId: input.onboardingCaseId,
	});
	if (!onboardingCase.ok) {
		return onboardingCase;
	}
	if (onboardingCase.data === null) {
		return notFound("Onboarding case not found");
	}

	const [
		tasks,
		orientation,
		equipmentHandoff,
		accessHandoff,
		missingDocs,
		eligibility,
	] = await Promise.all([
		store.listOnboardingTasks({
			organizationId: input.organizationId,
			onboardingCaseId: input.onboardingCaseId,
		}),
		store.getOnboardingOrientationByCase({
			organizationId: input.organizationId,
			onboardingCaseId: input.onboardingCaseId,
		}),
		store.getOnboardingEquipmentHandoffByCase({
			organizationId: input.organizationId,
			onboardingCaseId: input.onboardingCaseId,
		}),
		store.getOnboardingAccessHandoffByCase({
			organizationId: input.organizationId,
			onboardingCaseId: input.onboardingCaseId,
		}),
		store.listMissingRequiredDocuments({
			organizationId: input.organizationId,
			employeeId: onboardingCase.data.employeeId,
			page: 1,
			pageSize: 1,
		}),
		store.getActiveWorkEligibilityForEmployee({
			organizationId: input.organizationId,
			employeeId: onboardingCase.data.employeeId,
		}),
	]);

	if (!tasks.ok) return tasks;
	if (!orientation.ok) return orientation;
	if (!equipmentHandoff.ok) return equipmentHandoff;
	if (!accessHandoff.ok) return accessHandoff;
	if (!missingDocs.ok) return missingDocs;
	if (!eligibility.ok) return eligibility;

	return {
		ok: true,
		data: {
			tasks: tasks.data,
			orientation: orientation.data,
			equipmentHandoff: equipmentHandoff.data,
			accessHandoff: accessHandoff.data,
			missingRequiredDocumentCount: missingDocs.data.totalCount,
			activeWorkEligibility: eligibility.data,
		},
	};
}

async function assertOnboardingTaskCompliance(
	store: HumanResourcesStore,
	input: {
		organizationId: string;
		task: OnboardingTask;
		newStatus: OnboardingTask["status"];
	},
): Promise<Result<void>> {
	if (input.newStatus !== "completed") {
		return { ok: true, data: undefined };
	}

	const onboardingCase = await store.getOnboardingCase({
		organizationId: input.organizationId,
		onboardingCaseId: input.task.caseId,
	});
	if (!onboardingCase.ok) {
		return onboardingCase;
	}
	if (onboardingCase.data === null) {
		return notFound("Onboarding case not found");
	}

	if (input.task.code === ONBOARDING_TASK_CODE_IDENTITY_DOCUMENTS) {
		const missing = await store.listMissingRequiredDocuments({
			organizationId: input.organizationId,
			employeeId: onboardingCase.data.employeeId,
			page: 1,
			pageSize: 1,
		});
		if (!missing.ok) {
			return missing;
		}
		if (missing.data.totalCount > 0) {
			return invalidState(
				"Identity documents task cannot be completed until required documents are verified",
			);
		}
	}

	if (input.task.code === ONBOARDING_TASK_CODE_WORK_ELIGIBILITY) {
		const eligibility = await store.getActiveWorkEligibilityForEmployee({
			organizationId: input.organizationId,
			employeeId: onboardingCase.data.employeeId,
		});
		if (!eligibility.ok) {
			return eligibility;
		}
		if (eligibility.data === null) {
			return invalidState(
				"Work eligibility task cannot be completed until active work eligibility is verified",
			);
		}
	}

	return { ok: true, data: undefined };
}

export async function startOnboarding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: startOnboardingInputSchema,
		invalidMessage: "Invalid start onboarding input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
		execute: (data, { store, ports }) => {
			const tasks = mergeOnboardingChecklist(data.tasks);
			const fingerprint = fingerprintOnboardingStart({
				employmentId: data.employmentId,
				sourceOfferId: data.sourceOfferId ?? null,
			});
			return store.startOnboarding(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					sourceOfferId: data.sourceOfferId ?? null,
					tasks,
					idempotencyKey: data.idempotencyKey,
					startRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
				}),
			);
		},
	});
}

export async function completeOnboardingTask(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: completeOnboardingTaskInputSchema,
		invalidMessage: "Invalid complete onboarding task input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
		execute: async (data, { store, ports }) => {
			const task = await store.getOnboardingTask({
				organizationId: data.organizationId,
				taskId: data.taskId,
			});
			if (!task.ok) {
				return task;
			}
			if (task.data === null) {
				return notFound("Onboarding task not found");
			}

			const compliance = await assertOnboardingTaskCompliance(store, {
				organizationId: data.organizationId,
				task: task.data,
				newStatus: data.status,
			});
			if (!compliance.ok) {
				return compliance;
			}

			return store.completeOnboardingTask(
				{
					organizationId: data.organizationId,
					taskId: data.taskId,
					newStatus: data.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
				}),
			);
		},
	});
}

export async function recordOnboardingOrientation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordOnboardingOrientationInputSchema,
		invalidMessage: "Invalid record onboarding orientation input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
		execute: (data, { store, ports }) =>
			store.recordOnboardingOrientation(
				{
					organizationId: data.organizationId,
					orientationId: data.orientationId,
					acknowledgedOn: data.acknowledgedOn,
					notes: data.notes?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
				}),
			),
	});
}

export async function recordOnboardingEquipmentHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordOnboardingEquipmentHandoffInputSchema,
		invalidMessage: "Invalid record onboarding equipment handoff input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
		execute: (data, { store, ports }) =>
			store.recordOnboardingEquipmentHandoff(
				{
					organizationId: data.organizationId,
					equipmentHandoffId: data.equipmentHandoffId,
					handedOverOn: data.handedOverOn,
					summary: data.summary?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
				}),
			),
	});
}

export async function recordOnboardingAccessHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordOnboardingAccessHandoffInputSchema,
		invalidMessage: "Invalid record onboarding access handoff input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
		execute: (data, { store, ports }) =>
			store.recordOnboardingAccessHandoff(
				{
					organizationId: data.organizationId,
					accessHandoffId: data.accessHandoffId,
					grantedOn: data.grantedOn,
					summary: data.summary?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
				}),
			),
	});
}

export async function completeOnboarding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: completeOnboardingInputSchema,
		invalidMessage: "Invalid complete onboarding input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
		execute: async (data, { store, ports }) => {
			const context = await loadOnboardingCompletionContext(store, {
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			});
			if (!context.ok) {
				return context;
			}

			const readiness = evaluateOnboardingCompletionReadiness({
				tasks: context.data.tasks,
				orientationStatus: context.data.orientation?.status ?? null,
				equipmentHandoffStatus: context.data.equipmentHandoff?.status ?? null,
				accessHandoffStatus: context.data.accessHandoff?.status ?? null,
				missingRequiredDocumentCount: context.data.missingRequiredDocumentCount,
				activeWorkEligibility: context.data.activeWorkEligibility,
			});
			if (!readiness.ready) {
				return invalidState(
					`Onboarding cannot be completed until readiness requirements are met: ${readiness.missing.join(", ")}`,
				);
			}

			return store.completeOnboarding(
				{
					organizationId: data.organizationId,
					onboardingCaseId: data.onboardingCaseId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
				}),
			);
		},
	});
}

export async function getOnboardingCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOnboardingCaseInputSchema,
		invalidMessage: "Invalid get onboarding case input",
		query: HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET,
		execute: (data, { store }) =>
			store.getOnboardingCase({
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			}),
	});
}

export async function listOnboardingTasks(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingTask[]>> {
	return runLifecycleQuery(input, options, {
		schema: listOnboardingTasksInputSchema,
		invalidMessage: "Invalid list onboarding tasks input",
		query: HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST,
		execute: (data, { store }) =>
			store.listOnboardingTasks({
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			}),
	});
}

export async function getOnboardingOrientationByCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingOrientation | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOnboardingOrientationByCaseInputSchema,
		invalidMessage: "Invalid get onboarding orientation input",
		query: HUMAN_RESOURCES_QUERY_ONBOARDING_ORIENTATION_GET_BY_CASE,
		execute: (data, { store }) =>
			store.getOnboardingOrientationByCase({
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			}),
	});
}

export async function getOnboardingEquipmentHandoffByCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingEquipmentHandoff | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOnboardingEquipmentHandoffByCaseInputSchema,
		invalidMessage: "Invalid get onboarding equipment handoff input",
		query: HUMAN_RESOURCES_QUERY_ONBOARDING_EQUIPMENT_HANDOFF_GET_BY_CASE,
		execute: (data, { store }) =>
			store.getOnboardingEquipmentHandoffByCase({
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			}),
	});
}

export async function getOnboardingAccessHandoffByCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingAccessHandoff | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOnboardingAccessHandoffByCaseInputSchema,
		invalidMessage: "Invalid get onboarding access handoff input",
		query: HUMAN_RESOURCES_QUERY_ONBOARDING_ACCESS_HANDOFF_GET_BY_CASE,
		execute: (data, { store }) =>
			store.getOnboardingAccessHandoffByCase({
				organizationId: data.organizationId,
				onboardingCaseId: data.onboardingCaseId,
			}),
	});
}
