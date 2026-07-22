import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_QUERY_ONBOARDING_CASE_GET,
	HUMAN_RESOURCES_QUERY_ONBOARDING_TASKS_LIST,
} from "../module-ids";
import {
	completeOnboardingInputSchema,
	completeOnboardingTaskInputSchema,
	getOnboardingCaseInputSchema,
	listOnboardingTasksInputSchema,
	startOnboardingInputSchema,
} from "../schemas/lifecycle";
import { fingerprintOnboardingStart } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import type { OnboardingCase, OnboardingTask } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_ONBOARDING = "onboarding" as const;
export type HumanResourcesOnboardingAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ONBOARDING;

export async function startOnboarding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OnboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: startOnboardingInputSchema,
		invalidMessage: "Invalid start onboarding input",
		command: HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintOnboardingStart({
				employmentId: data.employmentId,
				sourceOfferId: data.sourceOfferId ?? null,
			});
			return store.startOnboarding(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					sourceOfferId: data.sourceOfferId ?? null,
					tasks: data.tasks,
					idempotencyKey: data.idempotencyKey,
					startRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
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
		execute: (data, { store, ports }) =>
			store.completeOnboardingTask(
				{
					organizationId: data.organizationId,
					taskId: data.taskId,
					newStatus: data.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
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
		execute: (data, { store, ports }) =>
			store.completeOnboarding(
				{
					organizationId: data.organizationId,
					onboardingCaseId: data.onboardingCaseId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
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
