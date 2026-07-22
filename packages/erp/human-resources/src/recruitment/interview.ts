import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
} from "../module-ids";
import {
	cancelInterviewInputSchema,
	getInterviewEvaluationInputSchema,
	getInterviewInputSchema,
	listInterviewsInputSchema,
	recordInterviewEvaluationInputSchema,
	scheduleInterviewInputSchema,
} from "../schemas";
import {
	runRecruitmentCommand,
	runRecruitmentQuery,
} from "../shared/recruitment-command";
import type {
	Interview,
	InterviewEvaluation,
	InterviewListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_INTERVIEW = "interview" as const;
export type HumanResourcesInterviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_INTERVIEW;

export async function scheduleInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCommand(input, options, {
		schema: scheduleInterviewInputSchema,
		invalidMessage: "Invalid interview schedule input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
		execute: (data, { store, ports }) =>
			store.scheduleInterview(
				{
					organizationId: data.organizationId,
					applicationId: data.applicationId,
					scheduledAt: data.scheduledAt,
					interviewerActorId: data.interviewerActorId,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function cancelInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCommand(input, options, {
		schema: cancelInterviewInputSchema,
		invalidMessage: "Invalid interview cancel input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelInterview(
				{
					organizationId: data.organizationId,
					interviewId: data.interviewId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function recordInterviewEvaluation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewEvaluation>> {
	return runRecruitmentCommand(input, options, {
		schema: recordInterviewEvaluationInputSchema,
		invalidMessage: "Invalid interview record-evaluation input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
		execute: (data, { store, ports }) =>
			store.recordInterviewEvaluation(
				{
					organizationId: data.organizationId,
					interviewId: data.interviewId,
					result: data.result,
					privateNotes: data.privateNotes ?? null,
					evaluatorActorId: data.actorUserId,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentQuery(input, options, {
		schema: getInterviewInputSchema,
		invalidMessage: "Invalid interview get input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
		execute: async (data, { store }) => {
			const interview = await store.getInterviewById({
				organizationId: data.organizationId,
				interviewId: data.interviewId,
			});
			if (!interview.ok) {
				return interview;
			}
			if (interview.data === null) {
				return fail(
					"NOT_FOUND",
					"Interview not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(interview.data);
		},
	});
}

export async function listInterviews(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewListPage>> {
	return runRecruitmentQuery(input, options, {
		schema: listInterviewsInputSchema,
		invalidMessage: "Invalid interview list input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
		execute: (data, { store }) =>
			store.listInterviews({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				applicationId: data.applicationId,
			}),
	});
}

export async function getInterviewEvaluation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewEvaluation>> {
	return runRecruitmentQuery(input, options, {
		schema: getInterviewEvaluationInputSchema,
		invalidMessage: "Invalid interview evaluation get input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
		execute: async (data, { store }) => {
			const evaluation = await store.getInterviewEvaluationByInterviewId({
				organizationId: data.organizationId,
				interviewId: data.interviewId,
			});
			if (!evaluation.ok) {
				return evaluation;
			}
			if (evaluation.data === null) {
				return fail(
					"NOT_FOUND",
					"Interview evaluation not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(evaluation.data);
		},
	});
}
