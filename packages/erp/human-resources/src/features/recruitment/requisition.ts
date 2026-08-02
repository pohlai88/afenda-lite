import { errorResult, type Result } from "@afenda/errors";
import type {
	JobRequisition,
	RequisitionListPage,
} from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintRequisitionCreate } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
	HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
	HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
	HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
	HUMAN_RESOURCES_QUERY_REQUISITION_GET,
	HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
} from "../../kernel/operations/module-ids";
import {
	assertRequisitionHasHiringManager,
	assertRequisitionHiringManagerAssignable,
} from "./guards";
import {
	mutationUtcDate,
	validateHiringManagerEmployee,
} from "./hiring-manager-validation";
import {
	runRecruitmentCapabilityCommand,
	runRecruitmentCapabilityQuery,
} from "./run-operation";
import {
	amendRequisitionInputSchema,
	assignHiringManagerInputSchema,
	createDraftRequisitionInputSchema,
	getRequisitionInputSchema,
	listRequisitionsInputSchema,
	requisitionStatusTransitionInputSchema,
} from "./schema";
import type { RequisitionStatus } from "./status";
import type { HumanResourcesRecruitmentCapabilityStore } from "./store";

export const HUMAN_RESOURCES_AGGREGATE_REQUISITION = "requisition" as const;
export type HumanResourcesRequisitionAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REQUISITION;

async function ensureRequisitionHasHiringManagerForTransition(
	store: Pick<HumanResourcesRecruitmentCapabilityStore, "getRequisitionById">,
	input: {
		organizationId: string;
		requisitionId: JobRequisition["id"];
	},
): Promise<Result<void>> {
	const requisition = await store.getRequisitionById({
		organizationId: input.organizationId,
		requisitionId: input.requisitionId,
	});
	if (!requisition.ok) {
		return requisition;
	}
	if (requisition.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	return assertRequisitionHasHiringManager(requisition.data);
}

export function createDraftRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: createDraftRequisitionInputSchema,
		invalidMessage: "Invalid requisition create-draft input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
		storeMethods: [
			"createDraftRequisition",
			"findEmploymentByEmployeeAsOf",
			"findRequisitionByIdempotencyKey",
			"getEmployeeById",
		],
		execute: async (data, { store, ports }) => {
			const jobId = data.jobId ?? null;
			const positionId = data.positionId ?? null;
			const departmentId = data.departmentId ?? null;
			const hiringManagerEmployeeId = data.hiringManagerEmployeeId ?? null;
			const requestFingerprint = fingerprintRequisitionCreate({
				code: data.code,
				title: data.title,
				jobId,
				positionId,
				departmentId,
				hiringManagerEmployeeId,
			});

			if (hiringManagerEmployeeId !== null) {
				const manager = await validateHiringManagerEmployee(store, {
					organizationId: data.organizationId,
					hiringManagerEmployeeId,
				});
				if (!manager.ok) {
					return manager;
				}
			}

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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.requisition);
			}

			return store.createDraftRequisition(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					title: data.title.trim(),
					jobId,
					positionId,
					departmentId,
					hiringManagerEmployeeId,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_REQUISITION_CREATE_DRAFT,
				}),
			);
		},
	});
}

export function amendRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: amendRequisitionInputSchema,
		invalidMessage: "Invalid requisition amend input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
		storeMethods: [
			"amendRequisition",
			"findEmploymentByEmployeeAsOf",
			"getEmployeeById",
		],
		execute: async (data, { store, ports }) => {
			if (
				data.hiringManagerEmployeeId !== undefined &&
				data.hiringManagerEmployeeId !== null
			) {
				const manager = await validateHiringManagerEmployee(store, {
					organizationId: data.organizationId,
					hiringManagerEmployeeId: data.hiringManagerEmployeeId,
				});
				if (!manager.ok) {
					return manager;
				}
			}

			return store.amendRequisition(
				{
					organizationId: data.organizationId,
					requisitionId: data.requisitionId,
					title: data.title?.trim(),
					jobId: data.jobId,
					positionId: data.positionId,
					departmentId: data.departmentId,
					hiringManagerEmployeeId: data.hiringManagerEmployeeId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_REQUISITION_AMEND,
				}),
			);
		},
	});
}

export function assignHiringManager(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: assignHiringManagerInputSchema,
		invalidMessage: "Invalid requisition assign-hiring-manager input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER,
		storeMethods: [
			"assignHiringManager",
			"findEmploymentByEmployeeAsOf",
			"getEmployeeById",
			"getRequisitionById",
		],
		execute: async (data, { store, ports }) => {
			const requisition = await store.getRequisitionById({
				organizationId: data.organizationId,
				requisitionId: data.requisitionId,
			});
			if (!requisition.ok) {
				return requisition;
			}
			if (requisition.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const assignable = assertRequisitionHiringManagerAssignable(
				requisition.data.status,
			);
			if (!assignable.ok) {
				return assignable;
			}

			const manager = await validateHiringManagerEmployee(store, {
				organizationId: data.organizationId,
				hiringManagerEmployeeId: data.hiringManagerEmployeeId,
				asOfDate: mutationUtcDate(),
			});
			if (!manager.ok) {
				return manager;
			}

			return store.assignHiringManager(
				{
					organizationId: data.organizationId,
					requisitionId: data.requisitionId,
					hiringManagerEmployeeId: data.hiringManagerEmployeeId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_REQUISITION_ASSIGN_HIRING_MANAGER,
				}),
			);
		},
	});
}

function transitionRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions,
	config: {
		invalidMessage: string;
		command: typeof import("./operation-registry").HUMAN_RESOURCES_RECRUITMENT_COMMAND_IDS[number];
		status: Exclude<RequisitionStatus, "draft">;
		emitApprovedEvent?: boolean;
		requireHiringManager?: boolean;
	},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCapabilityCommand(input, options, {
		schema: requisitionStatusTransitionInputSchema,
		invalidMessage: config.invalidMessage,
		command: config.command,
		storeMethods: ["getRequisitionById", "transitionRequisitionStatus"],
		execute: async (data, { store, ports }) => {
			if (config.requireHiringManager) {
				const guarded = await ensureRequisitionHasHiringManagerForTransition(
					store,
					{
						organizationId: data.organizationId,
						requisitionId: data.requisitionId,
					},
				);
				if (!guarded.ok) {
					return guarded;
				}
			}

			return store.transitionRequisitionStatus(
				{
					organizationId: data.organizationId,
					requisitionId: data.requisitionId,
					status: config.status,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					emitApprovedEvent: config.emitApprovedEvent,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: config.command,
				}),
			);
		},
	});
}

export function submitRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition submit input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_SUBMIT,
		status: "submitted",
		requireHiringManager: true,
	});
}

export function approveRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition approve input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
		status: "approved",
		emitApprovedEvent: true,
		requireHiringManager: true,
	});
}

export function openRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition open input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_OPEN,
		status: "open",
		requireHiringManager: true,
	});
}

export function placeRequisitionOnHold(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition place-on-hold input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_PLACE_ON_HOLD,
		status: "on_hold",
	});
}

export function closeRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition close input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CLOSE,
		status: "closed",
	});
}

export function cancelRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return transitionRequisition(input, options, {
		invalidMessage: "Invalid requisition cancel input",
		command: HUMAN_RESOURCES_COMMAND_REQUISITION_CANCEL,
		status: "cancelled",
	});
}

export function getRequisition(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<JobRequisition>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: getRequisitionInputSchema,
		invalidMessage: "Invalid requisition get input",
		query: HUMAN_RESOURCES_QUERY_REQUISITION_GET,
		storeMethods: ["getRequisitionById"],
		execute: async (data, { store }) => {
			const requisition = await store.getRequisitionById({
				organizationId: data.organizationId,
				requisitionId: data.requisitionId,
			});
			if (!requisition.ok) {
				return requisition;
			}
			if (requisition.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(requisition.data);
		},
	});
}

export function listRequisitions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<RequisitionListPage>> {
	return runRecruitmentCapabilityQuery(input, options, {
		schema: listRequisitionsInputSchema,
		invalidMessage: "Invalid requisition list input",
		query: HUMAN_RESOURCES_QUERY_REQUISITION_LIST,
		storeMethods: ["listRequisitions"],
		execute: (data, { store }) =>
			store.listRequisitions({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
