import { errorResult, type Result } from "@afenda/errors";
import type {
	ApplicationListPage,
	ApplicationStatusHistory,
	CandidateApplication,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_QUERY_APPLICATION_GET,
	HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
	HUMAN_RESOURCES_QUERY_APPLICATION_STATUS_HISTORY_LIST,
} from "../../kernel/operations/module-ids";
import {
	runRecruitmentCapabilityCommand,
	runRecruitmentCapabilityQuery,
} from "./run-operation";
import {
	applicationStatusTransitionInputSchema,
	createApplicationInputSchema,
	getApplicationInputSchema,
	listApplicationStatusHistoryInputSchema,
	listApplicationsInputSchema,
	reopenApplicationInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_APPLICATION = "application" as const;
export type HumanResourcesApplicationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_APPLICATION;

export function createApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: createApplicationInputSchema,
		invalidMessage: "Invalid application create input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
		storeMethods: ["createApplication"],
		execute: (data, { store, ports }) =>
			store.createApplication(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					requisitionId: data.requisitionId,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
				}),
			),
	});
}

function transitionApplication(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command:
			| typeof HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW
			| typeof HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING
			| typeof HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT
			| typeof HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW;
		status: "in_review" | "interviewing" | "rejected" | "withdrawn";
	},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: applicationStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		storeMethods: ["transitionApplicationStatus"],
		execute: (data, { store, ports }) =>
			store.transitionApplicationStatus(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					status: config.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					reason: data.reason ?? null,
					reasonCode: data.reasonCode ?? null,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: config.command,
				}),
			),
	});
}

export function moveApplicationToInReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application move-to-in-review input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
		status: "in_review",
	});
}

export function moveApplicationToInterviewing(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application move-to-interviewing input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
		status: "interviewing",
	});
}

export function rejectApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application reject input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
		status: "rejected",
	});
}

export function withdrawApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application withdraw input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
		status: "withdrawn",
	});
}

export function reopenApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: reopenApplicationInputSchema,
		invalidMessage: "Invalid application reopen input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN,
		storeMethods: ["reopenApplication"],
		execute: (data, { store, ports }) =>
			store.reopenApplication(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					reason: data.reason ?? null,
					reasonCode: data.reasonCode ?? null,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_APPLICATION_REOPEN,
				}),
			),
	});
}

export function getApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: getApplicationInputSchema,
		invalidMessage: "Invalid application get input",
		query: HUMAN_RESOURCES_QUERY_APPLICATION_GET,
		storeMethods: ["getApplicationById"],
		execute: async (data, { store }) => {
			const application = await store.getApplicationById({
				organizationId: data.organizationId,
				applicationId: data.applicationId,
			});
			if (!application.ok) {
				return application;
			}
			if (application.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(application.data);
		},
	});
}

export function listApplications(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApplicationListPage>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: listApplicationsInputSchema,
		invalidMessage: "Invalid application list input",
		query: HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
		storeMethods: ["listApplications"],
		execute: (data, { store }) =>
			store.listApplications({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				candidateId: data.candidateId,
				requisitionId: data.requisitionId,
			}),
	});
}

export function listApplicationStatusHistory(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApplicationStatusHistory[]>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: listApplicationStatusHistoryInputSchema,
		invalidMessage: "Invalid application status history input",
		query: HUMAN_RESOURCES_QUERY_APPLICATION_STATUS_HISTORY_LIST,
		storeMethods: ["listApplicationStatusHistory"],
		execute: async (data, { store }) => {
			const history = await store.listApplicationStatusHistory({
				organizationId: data.organizationId,
				applicationId: data.applicationId,
			});
			if (!history.ok) {
				return history;
			}
			return errorResult.ok(history.data);
		},
	});
}
