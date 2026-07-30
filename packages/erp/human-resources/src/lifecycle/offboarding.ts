import type { Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
	HUMAN_RESOURCES_QUERY_CLEARANCE_GET_BY_OFFBOARDING_CASE,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_ACCESS_REVOCATION_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_CASE_GET,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_PAYROLL_HANDOFF_GET_BY_CASE,
	HUMAN_RESOURCES_QUERY_OFFBOARDING_TASKS_LIST,
} from "../module-ids";
import {
	completeOffboardingInputSchema,
	completeOffboardingTaskInputSchema,
	getClearanceByOffboardingCaseInputSchema,
	getOffboardingAccessRevocationByCaseInputSchema,
	getOffboardingCaseInputSchema,
	getOffboardingPayrollHandoffByCaseInputSchema,
	listOffboardingTasksInputSchema,
	recordClearanceInputSchema,
	recordExitInterviewInputSchema,
	recordOffboardingAccessRevocationInputSchema,
	recordOffboardingPayrollHandoffInputSchema,
	startOffboardingInputSchema,
} from "../schemas/lifecycle";
import { fingerprintOffboardingStart } from "../shared/fingerprint";
import {
	runLifecycleCommand,
	runLifecycleQuery,
} from "../shared/lifecycle-command";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	Clearance,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_OFFBOARDING = "offboarding" as const;
export type HumanResourcesOffboardingAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_OFFBOARDING;

export function startOffboarding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: startOffboardingInputSchema,
		invalidMessage: "Invalid start offboarding input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
		execute: (data, { store, ports }) => {
			const fingerprint = fingerprintOffboardingStart({
				employmentId: data.employmentId,
				terminationId: data.terminationId ?? null,
			});
			return store.startOffboarding(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					terminationId: data.terminationId ?? null,
					tasks: data.tasks,
					idempotencyKey: data.idempotencyKey,
					startRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
				}),
			);
		},
	});
}

export function completeOffboardingTask(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: completeOffboardingTaskInputSchema,
		invalidMessage: "Invalid complete offboarding task input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
		execute: (data, { store, ports }) =>
			store.completeOffboardingTask(
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
					operationId: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
				}),
			),
	});
}

export function recordExitInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordExitInterviewInputSchema,
		invalidMessage: "Invalid record exit interview input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
		execute: (data, { store, ports }) =>
			store.recordExitInterview(
				{
					organizationId: data.organizationId,
					offboardingCaseId: data.offboardingCaseId,
					conductedOn: data.conductedOn,
					notes: data.notes?.trim() ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
				}),
			),
	});
}

export function recordClearance(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordClearanceInputSchema,
		invalidMessage: "Invalid record clearance input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
		execute: (data, { store, ports }) =>
			store.recordClearance(
				{
					organizationId: data.organizationId,
					clearanceId: data.clearanceId,
					clearedOn: data.clearedOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
				}),
			),
	});
}

export function recordOffboardingAccessRevocation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordOffboardingAccessRevocationInputSchema,
		invalidMessage: "Invalid record offboarding access revocation input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
		execute: (data, { store, ports }) =>
			store.recordOffboardingAccessRevocation(
				{
					organizationId: data.organizationId,
					accessRevocationId: data.accessRevocationId,
					revokedOn: data.revokedOn,
					summary: data.summary?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
				}),
			),
	});
}

export function recordOffboardingPayrollHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: recordOffboardingPayrollHandoffInputSchema,
		invalidMessage: "Invalid record offboarding payroll handoff input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
		execute: (data, { store, ports }) =>
			store.recordOffboardingPayrollHandoff(
				{
					organizationId: data.organizationId,
					payrollHandoffId: data.payrollHandoffId,
					readyOn: data.readyOn,
					summary: data.summary?.trim() ?? null,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
				}),
			),
	});
}

export function completeOffboarding(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase>> {
	return runLifecycleCommand(input, options, {
		schema: completeOffboardingInputSchema,
		invalidMessage: "Invalid complete offboarding input",
		command: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
		execute: (data, { store, ports }) =>
			store.completeOffboarding(
				{
					organizationId: data.organizationId,
					offboardingCaseId: data.offboardingCaseId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
				}),
			),
	});
}

export function getOffboardingCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingCase | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOffboardingCaseInputSchema,
		invalidMessage: "Invalid get offboarding case input",
		query: HUMAN_RESOURCES_QUERY_OFFBOARDING_CASE_GET,
		execute: (data, { store }) =>
			store.getOffboardingCase({
				organizationId: data.organizationId,
				offboardingCaseId: data.offboardingCaseId,
			}),
	});
}

export function listOffboardingTasks(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingTask[]>> {
	return runLifecycleQuery(input, options, {
		schema: listOffboardingTasksInputSchema,
		invalidMessage: "Invalid list offboarding tasks input",
		query: HUMAN_RESOURCES_QUERY_OFFBOARDING_TASKS_LIST,
		execute: (data, { store }) =>
			store.listOffboardingTasks({
				organizationId: data.organizationId,
				offboardingCaseId: data.offboardingCaseId,
			}),
	});
}

export function getClearanceByOffboardingCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Clearance | null>> {
	return runLifecycleQuery(input, options, {
		schema: getClearanceByOffboardingCaseInputSchema,
		invalidMessage: "Invalid get clearance input",
		query: HUMAN_RESOURCES_QUERY_CLEARANCE_GET_BY_OFFBOARDING_CASE,
		execute: (data, { store }) =>
			store.getClearanceByOffboardingCase({
				organizationId: data.organizationId,
				offboardingCaseId: data.offboardingCaseId,
			}),
	});
}

export function getOffboardingAccessRevocationByCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingAccessRevocation | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOffboardingAccessRevocationByCaseInputSchema,
		invalidMessage: "Invalid get offboarding access revocation input",
		query: HUMAN_RESOURCES_QUERY_OFFBOARDING_ACCESS_REVOCATION_GET_BY_CASE,
		execute: (data, { store }) =>
			store.getOffboardingAccessRevocationByCase({
				organizationId: data.organizationId,
				offboardingCaseId: data.offboardingCaseId,
			}),
	});
}

export function getOffboardingPayrollHandoffByCase(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OffboardingPayrollHandoff | null>> {
	return runLifecycleQuery(input, options, {
		schema: getOffboardingPayrollHandoffByCaseInputSchema,
		invalidMessage: "Invalid get offboarding payroll handoff input",
		query: HUMAN_RESOURCES_QUERY_OFFBOARDING_PAYROLL_HANDOFF_GET_BY_CASE,
		execute: (data, { store }) =>
			store.getOffboardingPayrollHandoffByCase({
				organizationId: data.organizationId,
				offboardingCaseId: data.offboardingCaseId,
			}),
	});
}
