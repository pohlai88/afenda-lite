import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
	HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
	HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
	HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
} from "../module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_INTERVIEW_READ,
	HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD,
} from "../permissions";
import {
	assignInterviewInterviewerInputSchema,
	cancelInterviewInputSchema,
	getInterviewEvaluationInputSchema,
	getInterviewInputSchema,
	listInterviewsInputSchema,
	recordInterviewEvaluationInputSchema,
	scheduleInterviewInputSchema,
} from "../schemas/recruitment";
import { actorHoldsAnyPermission } from "../shared/authorization-policy-helpers";
import { buildMutationMeta } from "../shared/mutation-meta";
import { assertInterviewInterviewerAssignable } from "../shared/recruitment-guards";
import type {
	Interview,
	InterviewEvaluation,
	InterviewListPage,
} from "../types";
import { projectInterviewEvaluationForReader } from "./interview-field-projection";
import {
	runRecruitmentCapabilityCommand,
	runRecruitmentCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_INTERVIEW = "interview" as const;
export type HumanResourcesInterviewAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_INTERVIEW;

export function scheduleInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: scheduleInterviewInputSchema,
		invalidMessage: "Invalid interview schedule input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
		storeMethods: ["scheduleInterview"],
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_INTERVIEW_SCHEDULE,
				}),
			),
	});
}

export function cancelInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: cancelInterviewInputSchema,
		invalidMessage: "Invalid interview cancel input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
		storeMethods: ["cancelInterview"],
		execute: (data, { store, ports }) =>
			store.cancelInterview(
				{
					organizationId: data.organizationId,
					interviewId: data.interviewId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_INTERVIEW_CANCEL,
				}),
			),
	});
}

export function assignInterviewInterviewer(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: assignInterviewInterviewerInputSchema,
		invalidMessage: "Invalid interview assign-interviewer input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER,
		storeMethods: ["assignInterviewInterviewer", "getInterviewById"],
		execute: async (data, { store, ports }) => {
			const interview = await store.getInterviewById({
				organizationId: data.organizationId,
				interviewId: data.interviewId,
			});
			if (!interview.ok) {
				return interview;
			}
			if (interview.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const assignable = assertInterviewInterviewerAssignable(
				interview.data.status,
			);
			if (!assignable.ok) {
				return assignable;
			}

			return store.assignInterviewInterviewer(
				{
					organizationId: data.organizationId,
					interviewId: data.interviewId,
					interviewerActorId: data.interviewerActorId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_INTERVIEW_ASSIGN_INTERVIEWER,
				}),
			);
		},
	});
}

export function recordInterviewEvaluation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewEvaluation>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: recordInterviewEvaluationInputSchema,
		invalidMessage: "Invalid interview record-evaluation input",
		command: HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
		storeMethods: ["recordInterviewEvaluation"],
		execute: (data, { store, ports }) =>
			store.recordInterviewEvaluation(
				{
					organizationId: data.organizationId,
					interviewId: data.interviewId,
					result: data.result,
					scorecard: data.scorecard,
					privateNotes: data.privateNotes ?? null,
					evaluatorActorId: data.actorUserId,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_INTERVIEW_RECORD_EVALUATION,
				}),
			),
	});
}

export function getInterview(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Interview>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: getInterviewInputSchema,
		invalidMessage: "Invalid interview get input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_GET,
		storeMethods: ["getInterviewById"],
		execute: async (data, { store }) => {
			const interview = await store.getInterviewById({
				organizationId: data.organizationId,
				interviewId: data.interviewId,
			});
			if (!interview.ok) {
				return interview;
			}
			if (interview.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(interview.data);
		},
	});
}

export function listInterviews(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewListPage>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: listInterviewsInputSchema,
		invalidMessage: "Invalid interview list input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_LIST,
		storeMethods: ["listInterviews"],
		execute: (data, { store }) =>
			store.listInterviews({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				applicationId: data.applicationId,
			}),
	});
}

export function getInterviewEvaluation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<InterviewEvaluation>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: getInterviewEvaluationInputSchema,
		invalidMessage: "Invalid interview evaluation get input",
		query: HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
		storeMethods: ["getInterviewEvaluationByInterviewId"],
		execute: async (data, { store }) => {
			const evaluation = await store.getInterviewEvaluationByInterviewId({
				organizationId: data.organizationId,
				interviewId: data.interviewId,
			});
			if (!evaluation.ok) {
				return evaluation;
			}
			if (evaluation.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const canReadConfidential = await actorHoldsAnyPermission(
				{
					operationId: HUMAN_RESOURCES_QUERY_INTERVIEW_EVALUATION_GET,
					operationKind: "query",
					requiredPermission: HUMAN_RESOURCES_PERMISSION_INTERVIEW_READ,
					actor: {
						organizationId: data.organizationId,
						actorUserId: data.actorUserId,
						correlationId: data.correlationId,
					},
					actorPermissions: [],
				},
				options,
				[HUMAN_RESOURCES_PERMISSION_INTERVIEW_RECORD],
			);

			return errorResult.ok(
				projectInterviewEvaluationForReader(
					evaluation.data,
					canReadConfidential,
				),
			);
		},
	});
}
