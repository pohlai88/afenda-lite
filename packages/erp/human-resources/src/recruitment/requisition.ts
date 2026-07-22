import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
	HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
	HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
	HUMAN_RESOURCES_QUERY_REQUISITION_GET,
	HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
	type HumanResourcesCommandId,
} from "../module-ids";
import {
	amendRequisitionInputSchema,
	createDraftRequisitionInputSchema,
	getRequisitionInputSchema,
	listRequisitionsInputSchema,
	requisitionStatusTransitionInputSchema,
} from "../schemas";
import { fingerprintRequisitionCreate } from "../shared/fingerprint";
import {
	runRecruitmentCommand,
	runRecruitmentQuery,
} from "../shared/recruitment-command";
import type { RequisitionStatus } from "../shared/recruitment-status";
import type { JobRequisition, RequisitionListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_REQUISITION = "requisition" as const;
export type HumanResourcesRequisitionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REQUISITION;

export async function createDraftRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCommand(input, options, {
		schema: createDraftRequisitionInputSchema,
		invalidMessage: "Invalid requisition create-draft input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
		execute: async (data, { store, ports }) => {
			const jobId = data.jobId ?? null;
			const positionId = data.positionId ?? null;
			const departmentId = data.departmentId ?? null;
			const requestFingerprint = fingerprintRequisitionCreate({
				code: data.code,
				title: data.title,
				jobId,
				positionId,
				departmentId,
			});

			const existingByKey = await store.findRequisitionByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.requisition);
			}

			return store.createDraftRequisition(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					title: data.title.trim(),
					jobId,
					positionId,
					departmentId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function amendRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCommand(input, options, {
		schema: amendRequisitionInputSchema,
		invalidMessage: "Invalid requisition amend input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
		execute: (data, { store, ports }) =>
			store.amendRequisition(
				{
					organizationId: data.organizationId,
					requisitionId: data.requisitionId,
					title: data.title?.trim(),
					jobId: data.jobId,
					positionId: data.positionId,
					departmentId: data.departmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

async function transitionRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: HumanResourcesCommandId;
		status: Exclude<RequisitionStatus, "draft">;
		emitApprovedEvent?: boolean;
	},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCommand(input, options, {
		schema: requisitionStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		execute: (data, { store, ports }) =>
			store.transitionRequisitionStatus(
				{
					organizationId: data.organizationId,
					requisitionId: data.requisitionId,
					status: config.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					emitApprovedEvent: config.emitApprovedEvent,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function submitRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition submit input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
		status: "submitted",
	});
}

export async function approveRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition approve input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
		status: "approved",
		emitApprovedEvent: true,
	});
}

export async function openRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition open input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
		status: "open",
	});
}

export async function placeRequisitionOnHold(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition place-on-hold input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
		status: "on_hold",
	});
}

export async function closeRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition close input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
		status: "closed",
	});
}

export async function cancelRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition cancel input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
		status: "cancelled",
	});
}

export async function getRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentQuery(input, options, {
		schema: getRequisitionInputSchema,
		invalidMessage: "Invalid requisition get input",
		query: HUMAN_RESOURCES_QUERY_REQUISITION_GET,
		execute: async (data, { store }) => {
			const requisition = await store.getRequisitionById({
				organizationId: data.organizationId,
				requisitionId: data.requisitionId,
			});
			if (!requisition.ok) {
				return requisition;
			}
			if (requisition.data === null) {
				return fail(
					"NOT_FOUND",
					"Requisition not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(requisition.data);
		},
	});
}

export async function listRequisitions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<RequisitionListPage>> {
	return runRecruitmentQuery(input, options, {
		schema: listRequisitionsInputSchema,
		invalidMessage: "Invalid requisition list input",
		query: HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
		execute: (data, { store }) =>
			store.listRequisitions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
