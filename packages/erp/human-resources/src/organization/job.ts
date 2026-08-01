import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_QUERY_JOB_AS_OF,
	HUMAN_RESOURCES_QUERY_JOB_GET,
	HUMAN_RESOURCES_QUERY_JOB_LIST,
} from "../module-ids";
import {
	createJobInputSchema,
	getJobAsOfInputSchema,
	getJobInputSchema,
	jobStatusTransitionInputSchema,
	listJobsInputSchema,
	updateJobInputSchema,
} from "../schemas/organization";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { Job } from "../types";
import type { JobDefinitionAtAsOf } from "./organization-structure-lineage";
import { runOrganizationCommand, runOrganizationQuery } from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_JOB = "job" as const;
export type HumanResourcesJobAggregate = typeof HUMAN_RESOURCES_AGGREGATE_JOB;

export function createJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	return runOrganizationCommand(input, options, {
		schema: createJobInputSchema,
		invalidMessage: "Invalid job create input",
		command: HUMAN_RESOURCES_COMMAND_JOB_CREATE,
		storeMethods: ["createJob"],
		execute: async (data, { store, ports }) =>
			store.createJob(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					title: data.title.trim(),
					status: data.status ?? "active",
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_CREATE,
				}),
			),
	});
}

export function updateJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	return runOrganizationCommand(input, options, {
		schema: updateJobInputSchema,
		invalidMessage: "Invalid job update input",
		command: HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
		storeMethods: ["updateJob"],
		execute: async (data, { store, ports }) =>
			store.updateJob(
				{
					organizationId: data.organizationId,
					jobId: data.jobId,
					title: data.title.trim(),
					effectiveOn: data.effectiveOn,
					reasonCode: data.reasonCode,
					evidenceRef: data.evidenceRef,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
				}),
			),
	});
}

export function activateJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	return runOrganizationCommand(input, options, {
		schema: jobStatusTransitionInputSchema,
		invalidMessage: "Invalid job activate input",
		command: HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
		storeMethods: ["setJobStatus"],
		execute: async (data, { store, ports }) =>
			store.setJobStatus(
				{
					organizationId: data.organizationId,
					jobId: data.jobId,
					status: "active",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
				}),
			),
	});
}

export function archiveJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	return runOrganizationCommand(input, options, {
		schema: jobStatusTransitionInputSchema,
		invalidMessage: "Invalid job archive input",
		command: HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
		storeMethods: ["setJobStatus"],
		execute: async (data, { store, ports }) =>
			store.setJobStatus(
				{
					organizationId: data.organizationId,
					jobId: data.jobId,
					status: "archived",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
				}),
			),
	});
}

export function getJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	return runOrganizationQuery(input, options, {
		schema: getJobInputSchema,
		invalidMessage: "Invalid job get input",
		query: HUMAN_RESOURCES_QUERY_JOB_GET,
		storeMethods: ["getJobById"],
		execute: async (data, { store }) => {
			const job = await store.getJobById({
				organizationId: data.organizationId,
				jobId: data.jobId,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(job.data);
		},
	});
}

export function getJobAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobDefinitionAtAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getJobAsOfInputSchema,
		invalidMessage: "Invalid job as-of input",
		query: HUMAN_RESOURCES_QUERY_JOB_AS_OF,
		storeMethods: ["findJobAsOf"],
		execute: async (data, { store }) => {
			const job = await store.findJobAsOf({
				organizationId: data.organizationId,
				jobId: data.jobId,
				asOf: data.asOf,
			});
			if (!job.ok) {
				return job;
			}
			if (job.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(job.data);
		},
	});
}

export function listJobs(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listJobsInputSchema,
		invalidMessage: "Invalid job list input",
		query: HUMAN_RESOURCES_QUERY_JOB_LIST,
		storeMethods: ["listJobs"],
		execute: async (data, { store }) =>
			store.listJobs({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
