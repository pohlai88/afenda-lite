import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_QUERY_JOB_GET,
	HUMAN_RESOURCES_QUERY_JOB_LIST,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	createJobInputSchema,
	getJobInputSchema,
	jobStatusTransitionInputSchema,
	listJobsInputSchema,
	updateJobInputSchema,
} from "../schemas/organization";
import type { Job } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_JOB = "job" as const;
export type HumanResourcesJobAggregate = typeof HUMAN_RESOURCES_AGGREGATE_JOB;

export async function createJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	const parsed = parseHumanResourcesInput(
		createJobInputSchema,
		input,
		"Invalid job create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_JOB_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.createJob(
		{
			organizationId: parsed.data.organizationId,
			code: parsed.data.code.trim(),
			title: parsed.data.title.trim(),
			status: parsed.data.status ?? "active",
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updateJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	const parsed = parseHumanResourcesInput(
		updateJobInputSchema,
		input,
		"Invalid job update input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.updateJob(
		{
			organizationId: parsed.data.organizationId,
			jobId: parsed.data.jobId,
			title: parsed.data.title.trim(),
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function activateJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	const parsed = parseHumanResourcesInput(
		jobStatusTransitionInputSchema,
		input,
		"Invalid job activate input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setJobStatus(
		{
			organizationId: parsed.data.organizationId,
			jobId: parsed.data.jobId,
			status: "active",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function archiveJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	const parsed = parseHumanResourcesInput(
		jobStatusTransitionInputSchema,
		input,
		"Invalid job archive input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setJobStatus(
		{
			organizationId: parsed.data.organizationId,
			jobId: parsed.data.jobId,
			status: "archived",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getJob(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Job>> {
	const parsed = parseHumanResourcesInput(
		getJobInputSchema,
		input,
		"Invalid job get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_JOB_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const job = await store.getJobById({
		organizationId: parsed.data.organizationId,
		jobId: parsed.data.jobId,
	});
	if (!job.ok) {
		return job;
	}
	if (job.data === null) {
		return fail(
			"NOT_FOUND",
			"Job not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok(job.data);
}

export async function listJobs(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
	const parsed = parseHumanResourcesInput(
		listJobsInputSchema,
		input,
		"Invalid job list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_JOB_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return store.listJobs({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page ?? 1,
		pageSize: parsed.data.pageSize ?? 20,
		status: parsed.data.status,
	});
}
