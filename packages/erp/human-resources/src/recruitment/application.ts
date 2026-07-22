import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
	HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
	HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
	HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
	HUMAN_RESOURCES_QUERY_APPLICATION_GET,
	HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
} from "../module-ids";
import {
	applicationStatusTransitionInputSchema,
	createApplicationInputSchema,
	getApplicationInputSchema,
	listApplicationsInputSchema,
} from "../schemas/recruitment";
import {
	runRecruitmentCommand,
	runRecruitmentQuery,
} from "../shared/recruitment-command";
import type { ApplicationListPage, CandidateApplication } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_APPLICATION = "application" as const;
export type HumanResourcesApplicationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_APPLICATION;

export async function createApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentCommand(input, options, {
		schema: createApplicationInputSchema,
		invalidMessage: "Invalid application create input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_CREATE,
		execute: (data, { store, ports }) =>
			store.createApplication(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					requisitionId: data.requisitionId,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

async function transitionApplication(
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
	return runRecruitmentCommand(input, options, {
		schema: applicationStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		execute: (data, { store, ports }) =>
			store.transitionApplicationStatus(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					status: config.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function moveApplicationToInReview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application move-to-in-review input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_IN_REVIEW,
		status: "in_review",
	});
}

export async function moveApplicationToInterviewing(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application move-to-interviewing input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_MOVE_TO_INTERVIEWING,
		status: "interviewing",
	});
}

export async function rejectApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application reject input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_REJECT,
		status: "rejected",
	});
}

export async function withdrawApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return transitionApplication(input, options, {
		invalidMessage: "Invalid application withdraw input",
		command: HUMAN_RESOURCES_COMMAND_APPLICATION_WITHDRAW,
		status: "withdrawn",
	});
}

export async function getApplication(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CandidateApplication>> {
	return runRecruitmentQuery(input, options, {
		schema: getApplicationInputSchema,
		invalidMessage: "Invalid application get input",
		query: HUMAN_RESOURCES_QUERY_APPLICATION_GET,
		execute: async (data, { store }) => {
			const application = await store.getApplicationById({
				organizationId: data.organizationId,
				applicationId: data.applicationId,
			});
			if (!application.ok) {
				return application;
			}
			if (application.data === null) {
				return fail(
					"NOT_FOUND",
					"Application not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(application.data);
		},
	});
}

export async function listApplications(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApplicationListPage>> {
	return runRecruitmentQuery(input, options, {
		schema: listApplicationsInputSchema,
		invalidMessage: "Invalid application list input",
		query: HUMAN_RESOURCES_QUERY_APPLICATION_LIST,
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
